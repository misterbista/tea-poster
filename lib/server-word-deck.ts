import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { WORD_PAIRS, type WordPair } from "@/lib/words";

const GENERATED_DECK_PATH = path.join(
  process.cwd(),
  "data",
  "words.generated.json"
);

type PersistedWordDeck = {
  version: 1;
  generatedAt: number | null;
  pairs: WordPair[];
};

export type SharedWordDeck = {
  pairs: WordPair[];
  generatedAt: number | null;
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

  return Object.values(normalized).every(Boolean) ? normalized : null;
}

function uniquePairs(values: unknown[]): WordPair[] {
  const pairs = new Map<string, WordPair>();
  for (const value of values) {
    const pair = normalizePair(value);
    if (pair && !pairs.has(pair.id)) pairs.set(pair.id, pair);
  }
  return Array.from(pairs.values());
}

async function readPersistedDeck(): Promise<PersistedWordDeck> {
  try {
    const raw = await readFile(GENERATED_DECK_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistedWordDeck>;
    return {
      version: 1,
      generatedAt:
        typeof parsed.generatedAt === "number" ? parsed.generatedAt : null,
      pairs: Array.isArray(parsed.pairs) ? uniquePairs(parsed.pairs) : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Shared word deck could not be read.", error);
    }
    return { version: 1, generatedAt: null, pairs: [] };
  }
}

function toSharedDeck(deck: PersistedWordDeck): SharedWordDeck {
  return {
    pairs: uniquePairs([...WORD_PAIRS, ...deck.pairs]),
    generatedAt: deck.generatedAt,
  };
}

export async function readSharedWordDeck(): Promise<SharedWordDeck> {
  return toSharedDeck(await readPersistedDeck());
}

let writeQueue: Promise<SharedWordDeck> = Promise.resolve({
  pairs: WORD_PAIRS,
  generatedAt: null,
});

export function appendSharedWordPairs(
  additions: WordPair[],
  generatedAt = Date.now()
): Promise<SharedWordDeck> {
  const nextWrite = writeQueue.then(async () => {
    const current = await readPersistedDeck();
    const persisted: PersistedWordDeck = {
      version: 1,
      generatedAt,
      pairs: uniquePairs([...current.pairs, ...additions]),
    };

    await mkdir(path.dirname(GENERATED_DECK_PATH), { recursive: true });
    const temporaryPath = `${GENERATED_DECK_PATH}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(persisted, null, 2)}\n`, "utf8");
    await rename(temporaryPath, GENERATED_DECK_PATH);

    return toSharedDeck(persisted);
  });

  writeQueue = nextWrite.catch(() => ({
    pairs: WORD_PAIRS,
    generatedAt: null,
  }));

  return nextWrite;
}
