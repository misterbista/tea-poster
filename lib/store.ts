"use client";

import { isSingleWord, WORD_PAIRS, type WordPair } from "./words";
import { randomIndex } from "./random";

const STORAGE_KEY = "tea-poster-store";
const WORD_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

type LocalWordTracker = {
  usedWordIds: string[];
};

type LocalWordDeck = {
  pairs: WordPair[];
  refreshedAt: number | null;
};

type TeaPosterStore = {
  tracker: LocalWordTracker;
  wordDeck: LocalWordDeck;
};

type StoredStore = {
  tracker?: { usedWordIds?: unknown };
  usedWordIds?: unknown;
  wordDeck?: { pairs?: unknown; refreshedAt?: unknown };
};

type WordRefreshResult = {
  pairs: WordPair[];
  added: number;
};

type SharedWordPayload = {
  pairs?: unknown;
  allPairs?: unknown;
  generatedAt?: unknown;
  error?: unknown;
};

type WordRefreshOptions = {
  force?: boolean;
};

let refreshInFlight: Promise<WordRefreshResult> | null = null;

function emptyStore(): TeaPosterStore {
  return {
    tracker: { usedWordIds: [] },
    wordDeck: { pairs: [], refreshedAt: null },
  };
}

function normalizeWordPair(value: unknown): WordPair | null {
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

  if (
    Object.values(normalized).some((value) => value.length === 0) ||
    !isSingleWord(normalized.word)
  ) {
    return null;
  }

  return normalized;
}

function uniqueWordPairs(values: unknown[]): WordPair[] {
  const pairs = new Map<string, WordPair>();
  for (const value of values) {
    const pair = normalizeWordPair(value);
    if (pair && !pairs.has(pair.id)) pairs.set(pair.id, pair);
  }
  return Array.from(pairs.values());
}

export function mergeWordPairs(...lists: WordPair[][]): WordPair[] {
  return uniqueWordPairs(lists.flat());
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
    const storedPairs = Array.isArray(parsed.wordDeck?.pairs)
      ? uniqueWordPairs(parsed.wordDeck.pairs)
      : [];
    const refreshedAt =
      typeof parsed.wordDeck?.refreshedAt === "number"
        ? parsed.wordDeck.refreshedAt
        : null;

    return {
      tracker: {
        usedWordIds: usedWordIds.filter(
          (id): id is string => typeof id === "string"
        ),
      },
      wordDeck: { pairs: storedPairs, refreshedAt },
    };
  } catch {
    return emptyStore();
  }
}

export function getLocalWordPairs(): WordPair[] {
  return readStore().wordDeck.pairs;
}

export function refreshLocalWordPairs(
  knownPairs: WordPair[],
  { force = false }: WordRefreshOptions = {}
): Promise<WordRefreshResult> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const store = readStore();
    const now = Date.now();
    const lastRefresh = store.wordDeck.refreshedAt;

    if (
      !force &&
      lastRefresh !== null &&
      now - lastRefresh < WORD_REFRESH_INTERVAL_MS
    ) {
      return { pairs: store.wordDeck.pairs, added: 0 };
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { pairs: store.wordDeck.pairs, added: 0 };
    }

    const sharedResponse = await fetch("/api/words", {
      cache: "no-store",
    });
    const sharedPayload = (await sharedResponse.json().catch(() => null)) as
      | SharedWordPayload
      | null;
    if (!sharedResponse.ok) {
      throw new Error(
        typeof sharedPayload?.error === "string"
          ? sharedPayload.error
          : `Shared word sync failed (${sharedResponse.status}).`
      );
    }

    const bundledIds = new Set(WORD_PAIRS.map((pair) => pair.id));
    const sharedPairs = uniqueWordPairs(
      Array.isArray(sharedPayload?.pairs) ? sharedPayload.pairs : []
    ).filter((pair) => !bundledIds.has(pair.id));
    const knownForRequest = mergeWordPairs(knownPairs, sharedPairs);

    const knownWordIds = Array.from(new Set(knownForRequest.map((pair) => pair.id)))
      .slice(0, 500);
    const response = await fetch("/api/words/daily", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ knownWordIds, force }),
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | SharedWordPayload
      | null;

    if (!response.ok) {
      const message =
        typeof payload?.error === "string"
          ? payload.error
          : `Daily word refresh failed (${response.status}).`;
      throw new Error(message);
    }

    const remotePairs = uniqueWordPairs([
      ...(Array.isArray(payload?.allPairs) ? payload.allPairs : []),
      ...(Array.isArray(payload?.pairs) ? payload.pairs : []),
    ]).filter((pair) => !bundledIds.has(pair.id));
    const previousCount = store.wordDeck.pairs.length;
    const mergedPairs = mergeWordPairs(
      store.wordDeck.pairs,
      sharedPairs,
      remotePairs
    ).slice(0, 500);
    store.wordDeck = { pairs: mergedPairs, refreshedAt: now };
    writeStore(store);

    return {
      pairs: mergedPairs,
      added: mergedPairs.length - previousCount,
    };
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
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

  const pair = fresh[randomIndex(fresh.length)];
  used.add(pair.id);
  store.tracker = { usedWordIds: Array.from(used) };
  writeStore(store);
  return pair;
}
