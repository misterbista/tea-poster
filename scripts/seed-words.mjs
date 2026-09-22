#!/usr/bin/env node
// Legacy command retained as a read-only validator; never downloads or overwrites the deck.
import { readFile } from "node:fs/promises";
const deck = JSON.parse(await readFile(new URL("../lib/words.json", import.meta.url), "utf8"));
if (!Number.isInteger(deck.version) || !Array.isArray(deck.categories)) throw new Error("Invalid deck format");
const seen = new Set();
for (const { category, words } of deck.categories) {
  if (typeof category !== "string" || !category.trim() || !Array.isArray(words) || !words.length) throw new Error("Invalid category");
  for (const entry of words) {
    if (!entry || typeof entry !== "object") throw new Error("Expected a word object");
    const { word, citizenHint, imposterHint } = entry;
    if (typeof citizenHint !== "string" || !citizenHint.trim() ||
        typeof imposterHint !== "string" || !imposterHint.trim()) throw new Error("Missing hints for: " + word);
    if (typeof word !== "string" || !word.trim()) throw new Error("Empty or invalid word");
    const key = word.trim().normalize("NFC").toLowerCase();
    if (seen.has(key)) throw new Error("Duplicate word: " + word);
    seen.add(key);
  }
}
if (!seen.size) throw new Error("Deck is empty");
console.log("Local deck valid: " + seen.size + " words, " + deck.categories.length + " categories. Edit lib/words.json to add words.");
