"use client";

import type { WordTrackerStats } from "./word-tracker";
import type { WordPair } from "./words";

const STORAGE_KEY = "tea-poster-store";

type WordCache = {
  version: number;
  pairs: WordPair[];
};

export type OfflineWordTracker = {
  version: number;
  usedWordIds: string[];
  pendingWordIds: string[];
};

type TeaPosterStore = {
  words: WordCache | null;
  tracker: OfflineWordTracker;
};

function emptyTracker(): OfflineWordTracker {
  return { version: 0, usedWordIds: [], pendingWordIds: [] };
}

function emptyStore(): TeaPosterStore {
  return { words: null, tracker: emptyTracker() };
}

function readStore(): TeaPosterStore {
  if (typeof window === "undefined") return emptyStore();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();

    const parsed = JSON.parse(raw) as Partial<TeaPosterStore>;
    const words = parsed.words;
    const tracker = parsed.tracker;
    const legacyUsedWordIds = (parsed as Partial<{ usedWordIds: unknown }>).usedWordIds;
    const legacyIds = Array.isArray(legacyUsedWordIds)
      ? legacyUsedWordIds.filter((id): id is string => typeof id === "string")
      : [];

    return {
      words:
        words &&
        typeof words.version === "number" &&
        Array.isArray(words.pairs)
          ? { version: words.version, pairs: words.pairs }
          : null,
      tracker:
        tracker &&
        typeof tracker.version === "number" &&
        Array.isArray(tracker.usedWordIds) &&
        Array.isArray(tracker.pendingWordIds)
          ? {
              version: tracker.version,
              usedWordIds: tracker.usedWordIds.filter(
                (id): id is string => typeof id === "string"
              ),
              pendingWordIds: tracker.pendingWordIds.filter(
                (id): id is string => typeof id === "string"
              ),
            }
          : {
              version: 0,
              usedWordIds: legacyIds,
              pendingWordIds: legacyIds,
            },
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: TeaPosterStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Returns the latest online word list saved as JSON for offline play. */
export async function getCachedWordPairs(): Promise<WordPair[]> {
  return readStore().words?.pairs ?? [];
}

export async function getCachedWordsVersion(): Promise<number> {
  return readStore().words?.version ?? 0;
}

/** Saves the word list and version in the same JSON document. */
export async function cacheWordPairs(
  pairs: WordPair[],
  version: number
): Promise<void> {
  const store = readStore();
  store.words = { pairs, version };
  writeStore(store);
}

/** Returns the locally persisted tracker and any offline claims waiting to sync. */
export async function getOfflineWordTracker(): Promise<OfflineWordTracker> {
  return readStore().tracker;
}

export async function getPendingWordIds(): Promise<string[]> {
  return readStore().tracker.pendingWordIds;
}

/** Replaces the local mirror with the server snapshot after a successful sync. */
export async function saveTrackerSnapshot(snapshot: WordTrackerStats): Promise<void> {
  const store = readStore();
  store.tracker = {
    version: snapshot.version,
    usedWordIds: Array.from(new Set(snapshot.usedWordIds)),
    pendingWordIds: [],
  };
  writeStore(store);
}

/** Claims a word locally when offline and queues the claim for backend sync. */
export async function claimOfflineWord(pairs: WordPair[]): Promise<WordPair> {
  const store = readStore();
  const tracker = store.tracker;
  const used = new Set(tracker.usedWordIds);
  let fresh = pairs.filter((pair) => !used.has(pair.id));

  if (fresh.length === 0) {
    used.clear();
    fresh = pairs;
  }

  const pair = fresh[Math.floor(Math.random() * fresh.length)];
  used.add(pair.id);
  store.tracker = {
    version: tracker.version,
    usedWordIds: Array.from(used),
    pendingWordIds: Array.from(new Set([...tracker.pendingWordIds, pair.id])),
  };
  writeStore(store);
  return pair;
}
