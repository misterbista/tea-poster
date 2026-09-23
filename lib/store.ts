"use client";

import { isSingleWord, WORD_PAIRS, type WordPair } from "./words";
import { randomIndex } from "./random";

const STORAGE_KEY = "tea-poster-store";

type LocalWordTracker = {
  usedWordIds: string[];
};

type TeaPosterStore = {
  tracker: LocalWordTracker;
};

type StoredStore = {
  tracker?: { usedWordIds?: unknown };
  usedWordIds?: unknown;
};

function emptyStore(): TeaPosterStore {
  return { tracker: { usedWordIds: [] } };
}

function readStore(): TeaPosterStore {
  if (typeof window === "undefined") return emptyStore();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();

    const parsed = JSON.parse(raw) as StoredStore;
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

export function claimLocalWord(): WordPair {
  const store = readStore();
  const used = new Set(store.tracker.usedWordIds);
  let fresh = WORD_PAIRS.filter((pair) => !used.has(pair.id));

  if (fresh.length === 0) {
    used.clear();
    fresh = WORD_PAIRS;
  }

  const pair = fresh[randomIndex(fresh.length)];
  used.add(pair.id);
  store.tracker = { usedWordIds: Array.from(used) };
  writeStore(store);
  return pair;
}
