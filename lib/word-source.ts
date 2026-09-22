import { WORD_PAIRS } from "./words";

// Both the API and bundled offline game use the manually curated local deck.
export async function getWordPairs() {
  return WORD_PAIRS;
}
