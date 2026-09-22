import deck from "./words.json";

export type WordPair = {
  id: string;
  word: string;
  category: string;
  citizenHint: string;
  imposterHint: string;
};

export function isSingleWord(value: string) {
  const word = value.trim();
  return word.length > 0 && !/\s/u.test(word);
}

// Derive stable IDs from the word, so moving it to another category preserves history.
export const WORD_PAIRS: WordPair[] = deck.categories.flatMap(({ category, words }) =>
  words.map(({ word, citizenHint, imposterHint }) => ({
    id: `nepal:${word.trim().normalize("NFC").toLowerCase()}`,
    word: word.trim(),
    category,
    citizenHint: citizenHint.trim(),
    imposterHint: imposterHint.trim(),
  }))
);

const ids = new Set<string>();
for (const pair of WORD_PAIRS) {
  if (!isSingleWord(pair.word) || !pair.category.trim() || !pair.citizenHint || !pair.imposterHint || ids.has(pair.id)) {
    throw new Error(`Invalid or duplicate entry in lib/words.json: ${pair.word}`);
  }
  ids.add(pair.id);
}
if (!WORD_PAIRS.length) throw new Error("The local word deck must not be empty.");
