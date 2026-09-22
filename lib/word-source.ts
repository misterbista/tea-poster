import { WORD_PAIRS, type WordPair } from "@/lib/words";

const WORDLIST_BASE_URL =
  "https://raw.githubusercontent.com/imsky/wordlists/master/nouns";
const COMMON_WORDS_URL =
  "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa-no-swears.txt";

const REMOTE_WORD_SOURCES: { category: string; file: string }[] = [
  { category: "Animals", file: "apex_predators.txt" },
  { category: "Animals", file: "birds.txt" },
  { category: "Animals", file: "cats.txt" },
  { category: "Animals", file: "dogs.txt" },
  { category: "Animals", file: "fish.txt" },
  { category: "Animals", file: "snakes.txt" },
  { category: "Food", file: "cheese.txt" },
  { category: "Food", file: "condiments.txt" },
  { category: "Food", file: "fast_food.txt" },
  { category: "Food", file: "food.txt" },
  { category: "Food", file: "fruit.txt" },
  { category: "Food", file: "meat.txt" },
  { category: "Drinks", file: "spirits.txt" },
  { category: "Drinks", file: "wine.txt" },
  { category: "Music", file: "music_instruments.txt" },
  { category: "Sports", file: "sports.txt" },
  { category: "Nature", file: "astronomy.txt" },
  { category: "Nature", file: "plants.txt" },
  { category: "Nature", file: "water.txt" },
  { category: "Places", file: "buildings.txt" },
  { category: "Places", file: "geography.txt" },
  { category: "Places", file: "houses.txt" },
  { category: "Places", file: "travel.txt" },
  { category: "Objects", file: "containers.txt" },
  { category: "Objects", file: "furniture.txt" },
  { category: "Objects", file: "phones.txt" },
  { category: "Technology", file: "coding.txt" },
  { category: "Technology", file: "software.txt" },
  { category: "Technology", file: "web_development.txt" },
  { category: "Jobs", file: "accounting.txt" },
  { category: "Jobs", file: "corporate_job.txt" },
  { category: "Jobs", file: "insurance.txt" },
];

let remoteWordPairs: WordPair[] | null = null;

function titleCase(word: string) {
  return word.replace(/(^|[ -])[a-z]/g, (letter) => letter.toUpperCase());
}

function slugify(word: string) {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function fetchRemoteSource(source: (typeof REMOTE_WORD_SOURCES)[number]) {
  const response = await fetch(`${WORDLIST_BASE_URL}/${source.file}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) return [];

  const text = await response.text();
  return text
    .split(/\r?\n/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => /^[a-z]+(?:[ -][a-z]+)?$/.test(word));
}

async function fetchCommonWords() {
  const response = await fetch(COMMON_WORDS_URL, {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) return null;

  const text = await response.text();
  return new Set(
    text
      .split(/\r?\n/)
      .map((word) => word.trim().toLowerCase())
      .filter((word) => /^[a-z]+$/.test(word))
  );
}

function isCommonWord(word: string, commonWords: Set<string>) {
  return word.split(/[ -]/).every((part) => commonWords.has(part));
}

export async function getWordPairs() {
  if (remoteWordPairs) return remoteWordPairs;

  const [commonWordsResult, ...sourceResults] = await Promise.allSettled([
    fetchCommonWords(),
    ...REMOTE_WORD_SOURCES.map(async (source) => ({
      source,
      words: await fetchRemoteSource(source),
    })),
  ]);
  const commonWords =
    commonWordsResult.status === "fulfilled" ? commonWordsResult.value : null;

  // If the frequency source is unavailable, prefer the curated fallback over
  // serving a large topic list that may contain obscure words.
  if (!commonWords) return WORD_PAIRS;

  const seenWords = new Set<string>();
  const pairs: WordPair[] = [];

  for (const result of sourceResults) {
    if (result.status !== "fulfilled") continue;
    for (const word of result.value.words) {
      if (!isCommonWord(word, commonWords) || seenWords.has(word)) continue;
      seenWords.add(word);
      pairs.push({
        id: `${result.value.source.category.toLowerCase()}-${slugify(word)}`,
        word: titleCase(word),
        category: result.value.source.category,
      });
    }
  }

  // Keep first play and offline mode reliable if the remote source is down or
  // the intersection becomes too small to make a useful deck.
  if (pairs.length < 24) return WORD_PAIRS;
  remoteWordPairs = pairs;
  return pairs;
}
