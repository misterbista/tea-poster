import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomInt } from "node:crypto";

import { WORDS_VERSION, type WordPair } from "@/lib/words";

export type WordTrackerStats = {
  version: number;
  totalCount: number;
  usedCount: number;
  freshCount: number;
  usedWordIds: string[];
};

type WordTrackerFile = {
  version: number;
  usedWordIds: string[];
};

const TRACKER_FILE = path.join(process.cwd(), "data", "word-tracker.json");

let writeQueue: Promise<void> = Promise.resolve();

function emptyTracker(): WordTrackerFile {
  return { version: 0, usedWordIds: [] };
}

async function readTracker() {
  try {
    const raw = await readFile(TRACKER_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<WordTrackerFile>;
    return {
      version: typeof parsed.version === "number" ? parsed.version : 0,
      usedWordIds: Array.isArray(parsed.usedWordIds)
        ? parsed.usedWordIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return emptyTracker();
  }
}

async function writeTracker(tracker: WordTrackerFile) {
  await mkdir(path.dirname(TRACKER_FILE), { recursive: true });
  await writeFile(TRACKER_FILE, `${JSON.stringify(tracker, null, 2)}\n`, "utf8");
}

function withWriteLock<T>(operation: () => Promise<T>) {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

function normalizeTracker(tracker: WordTrackerFile, pairs: WordPair[]) {
  const validIds = new Set(pairs.map((pair) => pair.id));
  const usedWordIds = Array.from(
    new Set(tracker.usedWordIds.filter((id) => validIds.has(id)))
  );

  return {
    version: WORDS_VERSION,
    usedWordIds,
  };
}

export function getWordTrackerStats(
  tracker: WordTrackerFile,
  pairs: WordPair[]
): WordTrackerStats {
  const normalized = normalizeTracker(tracker, pairs);
  return {
    version: normalized.version,
    totalCount: pairs.length,
    usedCount: normalized.usedWordIds.length,
    freshCount: Math.max(pairs.length - normalized.usedWordIds.length, 0),
    usedWordIds: normalized.usedWordIds,
  };
}

export async function getTrackerStats(pairs: WordPair[]) {
  const tracker = await readTracker();
  return getWordTrackerStats(tracker, pairs);
}

export async function claimFreshWord(
  pairs: WordPair[],
  additionalUsedIds: string[] = []
) {
  return withWriteLock(async () => {
    const tracker = normalizeTracker(await readTracker(), pairs);
    const validIds = new Set(pairs.map((pair) => pair.id));
    const used = new Set([
      ...tracker.usedWordIds,
      ...additionalUsedIds.filter((id) => validIds.has(id)),
    ]);
    let fresh = pairs.filter((pair) => !used.has(pair.id));
    let cycleReset = false;

    if (fresh.length === 0) {
      used.clear();
      fresh = pairs;
      cycleReset = true;
    }

    const pair = fresh[randomInt(fresh.length)];
    used.add(pair.id);

    const nextTracker = {
      version: tracker.version,
      usedWordIds: Array.from(used),
    };
    await writeTracker(nextTracker);

    return {
      pair,
      cycleReset,
      tracker: getWordTrackerStats(nextTracker, pairs),
    };
  });
}

export async function syncTracker(pairs: WordPair[], usedIds: string[]) {
  return withWriteLock(async () => {
    const tracker = normalizeTracker(await readTracker(), pairs);
    const validIds = new Set(pairs.map((pair) => pair.id));
    const nextTracker = {
      version: tracker.version,
      usedWordIds: Array.from(
        new Set([
          ...tracker.usedWordIds,
          ...usedIds.filter((id) => validIds.has(id)),
        ])
      ),
    };

    await writeTracker(nextTracker);
    return getWordTrackerStats(nextTracker, pairs);
  });
}

export async function resetTracker(pairs: WordPair[]) {
  return withWriteLock(async () => {
    const current = normalizeTracker(await readTracker(), pairs);
    const nextTracker = { version: current.version, usedWordIds: [] };
    await writeTracker(nextTracker);
    return getWordTrackerStats(nextTracker, pairs);
  });
}
