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

function containsWord(clue: string, word: string) {
  const clueWords = clue.normalize("NFC").toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const targetWords = word.normalize("NFC").toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return targetWords.some((_, index) =>
    targetWords.every((part, offset) => clueWords[index + offset] === part)
  );
}

// Derive stable IDs from the word, so moving it to another category preserves history.
const BUNDLED_WORD_PAIRS: WordPair[] = deck.categories.flatMap(({ category, words }) =>
  words.map(({ word, citizenHint, imposterHint }) => ({
    id: `nepal:${word.trim().normalize("NFC").toLowerCase()}`,
    word: word.trim(),
    category,
    citizenHint: citizenHint.trim(),
    imposterHint: imposterHint.trim(),
  }))
);

export const WORD_PAIRS: WordPair[] = BUNDLED_WORD_PAIRS;

const ids = new Set<string>();
const words = new Set<string>();
for (const pair of WORD_PAIRS) {
  const normalizedWord = pair.word.normalize("NFC").toLocaleLowerCase();
  if (
    !isSingleWord(pair.word) ||
    !pair.category.trim() ||
    !pair.citizenHint ||
    !pair.imposterHint ||
    ids.has(pair.id) ||
    words.has(normalizedWord) ||
    containsWord(pair.citizenHint, pair.word) ||
    containsWord(pair.imposterHint, pair.word)
  ) {
    throw new Error(`Invalid or duplicate entry in lib/words.json: ${pair.word}`);
  }
  ids.add(pair.id);
  words.add(normalizedWord);
}
if (!WORD_PAIRS.length) throw new Error("The local word deck must not be empty.");
