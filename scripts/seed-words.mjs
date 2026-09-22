#!/usr/bin/env node
/**
 * Builds lib/words.json for tea-poster.
 *
 * 1. Downloads the google-10000-english (USA, no-swears) frequency list.
 * 2. Picks the top N candidate words, filtered by BASIC_FILTERS.
 * 3. Asks Datamuse for each candidate's part of speech; keeps common nouns.
 * 4. Asks Datamuse for related nouns; picks one as the imposter hint —
 *    related enough to be in the same ballpark, but never the word itself,
 *    never a strict synonym that gives the game away.
 * 5. Writes { version, pairs } to lib/words.json.
 *
 * Usage: node scripts/seed-words.mjs [targetPairs] [--version N]
 */

import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const WORDLIST_URL =
  "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa-no-swears.txt";
const DATAMUSE = "https://api.datamuse.com/words";

const targetArg = Number(process.argv[2]) || 120;
const versionFlagIndex = process.argv.indexOf("--version");
const versionOverride =
  versionFlagIndex !== -1 ? Number(process.argv[versionFlagIndex + 1]) : null;

// Skip words unsuitable for a party game.
const SKIP = new Set([
  "i", "you", "he", "she", "we", "they", "me", "him", "her", "us", "them",
  "sex", "drug", "drugs", "god", "jesus", "hell", "damn",
]);

const isWordUsable = (w) =>
  /^[a-z]{4,10}$/.test(w) && !SKIP.has(w);

const isHintUsable = (hint, word) =>
  /^[a-z]+(?: [a-z]+)?$/.test(hint) && // single or two-word, lowercase letters
  hint !== word &&
  !hint.includes(word) && // not a compound containing the word (e.g. coffee bean)
  !word.includes(hint);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function datamuse(query) {
  const res = await fetch(`${DATAMUSE}?${query}`);
  if (!res.ok) throw new Error(`Datamuse ${res.status}`);
  return res.json();
}

async function main() {
  console.log("Downloading word list…");
  const text = await (await fetch(WORDLIST_URL)).text();
  const candidates = text
    .split("\n")
    .map((w) => w.trim().toLowerCase())
    .filter(isWordUsable)
    .slice(0, 2500); // work through the most frequent words first

  console.log(`Screening candidates for word/hint pairs (target ${targetArg})…`);
  const pairs = [];
  const seenHints = new Set();

  for (const word of candidates) {
    if (pairs.length >= targetArg) break;
    try {
      // 1) Is it a (mostly) common noun?
      const meta = await datamuse(`sp=${encodeURIComponent(word)}&md=pf&max=1`);
      const entry = meta[0];
      if (!entry || entry.word !== word) continue;
      const pos = entry.tags?.filter((t) => !t.startsWith("f:")) ?? [];
      if (!pos.includes("n") || pos.includes("prop")) continue;

      // 2) Related nouns as hint candidates (skip index 0–1: usually
      //    too-close synonyms or compounds; a bit deeper = fair hint).
      const related = await datamuse(
        `ml=${encodeURIComponent(word)}&md=p&max=12`
      );
      const hint = related
        .slice(2)
        .map((r) => r.word)
        .find(
          (h) =>
            (related.find((r) => r.word === h)?.tags ?? []).includes("n") &&
            isHintUsable(h, word) &&
            !seenHints.has(h)
        );
      if (!hint) continue;

      seenHints.add(hint);
      pairs.push({
        id: word,
        word: capitalize(word),
        hint: capitalize(hint),
        category: "General",
      });
      if (pairs.length % 20 === 0) console.log(`  ${pairs.length}/${targetArg}`);
      await sleep(60); // be polite to the free API
    } catch {
      continue; // transient failure — skip this word
    }
  }

  const outPath = path.resolve(import.meta.dirname, "../lib/words.json");
  let version = versionOverride;
  if (version === null) {
    try {
      const prev = JSON.parse(await readFile(outPath, "utf8"));
      version = (prev.version ?? 1) + 1;
    } catch {
      version = 1;
    }
  }

  await writeFile(
    outPath,
    JSON.stringify({ version, pairs }, null, 2) + "\n"
  );
  console.log(`Wrote ${pairs.length} pairs (version ${version}) → lib/words.json`);
}

function capitalize(s) {
  return s.replace(/(^| )[a-z]/g, (m) => m.toUpperCase());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
