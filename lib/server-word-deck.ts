import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";

import { isSingleWord, WORD_PAIRS, type WordPair } from "@/lib/words";

const GENERATED_DECK_PATH = path.join(
  process.cwd(),
  "data",
  "words.generated.json"
);
const GENERATED_DECK_BLOB_PATH = "tea-posters/words.generated.json";

const usesVercelBlob =
  process.env.VERCEL === "1" || Boolean(process.env.BLOB_READ_WRITE_TOKEN);

type PersistedWordDeck = {
  version: 1;
  generatedAt: number | null;
  pairs: WordPair[];
};

type PersistedDeckRead = {
  deck: PersistedWordDeck;
  etag: string | null;
};

export type SharedWordDeck = {
  pairs: WordPair[];
  generatedAt: number | null;
};

export type AppendSharedWordPairsResult = {
  deck: SharedWordDeck;
  addedPairs: WordPair[];
};

function normalizePair(value: unknown): WordPair | null {
  if (!value || typeof value !== "object") return null;

  const pair = value as Partial<WordPair>;
  if (
    typeof pair.id !== "string" ||
    typeof pair.word !== "string" ||
    typeof pair.category !== "string" ||
    typeof pair.citizenHint !== "string" ||
    typeof pair.imposterHint !== "string"
  ) {
    return null;
  }

  const normalized = {
    id: pair.id.trim(),
    word: pair.word.trim(),
    category: pair.category.trim(),
    citizenHint: pair.citizenHint.trim(),
    imposterHint: pair.imposterHint.trim(),
  };

  return Object.values(normalized).every(Boolean) && isSingleWord(normalized.word)
    ? normalized
    : null;
}

function emptyPersistedDeck(): PersistedWordDeck {
  return { version: 1, generatedAt: null, pairs: [] };
}

function parsePersistedDeck(raw: string): PersistedWordDeck {
  const parsed = JSON.parse(raw) as Partial<PersistedWordDeck>;
  return {
    version: 1,
    generatedAt:
      typeof parsed.generatedAt === "number" ? parsed.generatedAt : null,
    pairs: Array.isArray(parsed.pairs) ? uniquePairs(parsed.pairs) : [],
  };
}

function uniquePairs(values: unknown[]): WordPair[] {
  const pairs = new Map<string, WordPair>();
  for (const value of values) {
    const pair = normalizePair(value);
    if (pair && !pairs.has(pair.id)) pairs.set(pair.id, pair);
  }
  return Array.from(pairs.values());
}

async function readPersistedDeck(): Promise<PersistedDeckRead> {
  if (usesVercelBlob) {
    const blob = await get(GENERATED_DECK_BLOB_PATH, {
      access: "private",
      useCache: false,
    });

    if (!blob) return { deck: emptyPersistedDeck(), etag: null };
    if (blob.statusCode !== 200) {
      throw new Error("The shared word deck returned an unexpected response.");
    }

    const raw = await new Response(blob.stream).text();
    return { deck: parsePersistedDeck(raw), etag: blob.blob.etag };
  }

  try {
    const raw = await readFile(GENERATED_DECK_PATH, "utf8");
    return { deck: parsePersistedDeck(raw), etag: null };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Shared word deck could not be read.", error);
    }
    return { deck: emptyPersistedDeck(), etag: null };
  }
}

async function writePersistedDeck(
  deck: PersistedWordDeck,
  etag: string | null
) {
  const body = `${JSON.stringify(deck, null, 2)}\n`;

  if (usesVercelBlob) {
    await put(GENERATED_DECK_BLOB_PATH, body, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
      ...(etag ? { ifMatch: etag } : {}),
    });
    return;
  }

  await mkdir(path.dirname(GENERATED_DECK_PATH), { recursive: true });
  const temporaryPath = `${GENERATED_DECK_PATH}.${process.pid}.tmp`;
  await writeFile(temporaryPath, body, "utf8");
  await rename(temporaryPath, GENERATED_DECK_PATH);
}

function toSharedDeck(deck: PersistedWordDeck): SharedWordDeck {
  return {
    pairs: uniquePairs([...WORD_PAIRS, ...deck.pairs]),
    generatedAt: deck.generatedAt,
  };
}

export async function readSharedWordDeck(): Promise<SharedWordDeck> {
  const { deck } = await readPersistedDeck();
  return toSharedDeck(deck);
}

let writeQueue: Promise<AppendSharedWordPairsResult> = Promise.resolve({
  deck: { pairs: WORD_PAIRS, generatedAt: null },
  addedPairs: [],
});

function waitForWriteTurn(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function appendSharedWordPairs(
  additions: WordPair[],
  generatedAt = Date.now()
): Promise<AppendSharedWordPairsResult> {
  const nextWrite = writeQueue.then(async () => {
    const current = await readPersistedDeck();
    const existingIds = new Set(current.deck.pairs.map((pair) => pair.id));
    const addedPairs = uniquePairs(additions).filter(
      (pair) => !existingIds.has(pair.id)
    );
    const persisted: PersistedWordDeck = {
      version: 1,
      generatedAt,
      pairs: uniquePairs([...current.deck.pairs, ...addedPairs]),
    };

    try {
      await writePersistedDeck(persisted, current.etag);
      return { deck: toSharedDeck(persisted), addedPairs };
    } catch (error) {
      if (
        !usesVercelBlob ||
        !(error instanceof BlobPreconditionFailedError)
      ) {
        throw error;
      }

      await waitForWriteTurn(100);
      const winner = await readPersistedDeck();
      return { deck: toSharedDeck(winner.deck), addedPairs: [] };
    }
  });

  writeQueue = nextWrite.catch(() => ({
    deck: { pairs: WORD_PAIRS, generatedAt: null },
    addedPairs: [],
  }));

  return nextWrite;
}
