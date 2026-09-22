"use client";

import type { WordPair } from "./words";

const STORAGE_KEY = "tea-poster-store";

type LocalWordTracker = {
  usedWordIds: string[];
};

type TeaPosterStore = {
  tracker: LocalWordTracker;
};

function emptyStore(): TeaPosterStore {
  return { tracker: { usedWordIds: [] } };
}

function readStore(): TeaPosterStore {
  if (typeof window === "undefined") return emptyStore();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();

    const parsed = JSON.parse(raw) as Partial<TeaPosterStore> & {
      usedWordIds?: unknown;
    };
    const nestedIds = parsed.tracker?.usedWordIds;
    const legacyIds = parsed.usedWordIds;
    const usedWordIds = Array.isArray(nestedIds)
      ? nestedIds
      : Array.isArray(legacyIds)
        ? legacyIds
        : [];

    return {
      tracker: {
        usedWordIds: usedWordIds.filter(
          (id): id is string => typeof id === "string"
        ),
      },
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: TeaPosterStore) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // The game still works if storage is unavailable for this browser session.
  }
}

export function claimLocalWord(pairs: WordPair[]): WordPair {
  const store = readStore();
  const used = new Set(store.tracker.usedWordIds);
  let fresh = pairs.filter((pair) => !used.has(pair.id));

  if (fresh.length === 0) {
    used.clear();
    fresh = pairs;
  }

  const pair = fresh[Math.floor(Math.random() * fresh.length)];
  used.add(pair.id);
  store.tracker = { usedWordIds: Array.from(used) };
  writeStore(store);
  return pair;
}
