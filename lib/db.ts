"use client";

import type { WordPair } from "./words";

const DB_NAME = "tea-poster";
const DB_VERSION = 2;
const STORE = "usedWords";
const WORDS_STORE = "words";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
      if (!db.objectStoreNames.contains(WORDS_STORE)) {
        db.createObjectStore(WORDS_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readKey<T>(store: string, key: string, fallback: T): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? fallback);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close());
}

/** Returns the list of word ids already used in previous rounds. */
export async function getUsedWordIds(): Promise<string[]> {
  const db = await openDB();
  return new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get("ids");
    req.onsuccess = () => resolve((req.result as string[] | undefined) ?? []);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close());
}

/** Mark word ids as used so they are less likely to repeat. */
export async function markWordsUsed(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDB();
  const existing = await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get("ids");
    req.onsuccess = () => resolve((req.result as string[] | undefined) ?? []);
    req.onerror = () => reject(req.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const next = Array.from(new Set([...existing, ...ids]));
    const req = tx.objectStore(STORE).put(next, "ids");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }).finally(() => db.close());
}

/** Clear the used-word history (all words become available again). */
export async function resetUsedWords(): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).put([], "ids");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }).finally(() => db.close());
}

/** Word pairs synced from the online source, cached for offline play. */
export async function getCachedWordPairs(): Promise<WordPair[]> {
  return readKey<WordPair[]>(WORDS_STORE, "pairs", []);
}

export async function getCachedWordsVersion(): Promise<number> {
  return readKey<number>(WORDS_STORE, "version", 0);
}

export async function cacheWordPairs(
  pairs: WordPair[],
  version: number
): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WORDS_STORE, "readwrite");
    const store = tx.objectStore(WORDS_STORE);
    store.put(pairs, "pairs");
    store.put(version, "version");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }).finally(() => db.close());
}
