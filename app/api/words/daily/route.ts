import { NextResponse } from "next/server";
import { createGateway, generateText, jsonSchema, Output } from "ai";
import type { JSONSchema7 } from "@ai-sdk/provider";

import { isSingleWord, type WordPair } from "@/lib/words";
import {
  appendSharedWordPairs,
  readSharedWordDeck,
} from "@/lib/server-word-deck";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.AI_GATEWAY_MODEL?.trim() || "openai/gpt-5.4";
const FALLBACK_MODELS = (
  process.env.AI_GATEWAY_FALLBACK_MODELS ||
  "anthropic/claude-haiku-4.5"
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);
const WORDS_TO_GENERATE = 6;
const MAX_KNOWN_WORD_IDS = 500;
const MODEL_TIMEOUT_MS = 45_000;

type GeneratedPair = {
  category: string;
  word: string;
  citizenHint: string;
  imposterHint: string;
};

const generatedPairSchema: JSONSchema7 = {
  type: "object",
  properties: {
    category: { type: "string" },
    word: { type: "string", pattern: "^\\S+$" },
    citizenHint: { type: "string" },
    imposterHint: { type: "string" },
  },
  required: ["category", "word", "citizenHint", "imposterHint"],
  additionalProperties: false,
};

type RequestBody = {
  knownWordIds?: unknown;
  force?: unknown;
};

function normalize(value: string) {
  return value.trim().normalize("NFC").toLocaleLowerCase();
}

function makeGeneratedPair(
  value: unknown,
  knownIds: Set<string>,
  knownWords: Set<string>
): WordPair | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<Record<keyof WordPair, unknown>>;
  if (
    typeof candidate.category !== "string" ||
    typeof candidate.word !== "string" ||
    typeof candidate.citizenHint !== "string" ||
    typeof candidate.imposterHint !== "string"
  ) {
    return null;
  }

  const word = candidate.word.trim();
  const category = candidate.category.trim();
  const citizenHint = candidate.citizenHint.trim();
  const imposterHint = candidate.imposterHint.trim();
  const wordKey = normalize(word);

  if (
    !isSingleWord(word) ||
    word.length < 2 ||
    word.length > 64 ||
    category.length < 2 ||
    category.length > 64 ||
    citizenHint.length < 8 ||
    citizenHint.length > 180 ||
    imposterHint.length < 8 ||
    imposterHint.length > 120 ||
    knownWords.has(wordKey) ||
    citizenHint.toLocaleLowerCase().includes(wordKey) ||
    imposterHint.toLocaleLowerCase().includes(wordKey) ||
    /https?:\/\/|www\.|<|>/.test(`${word} ${category} ${citizenHint} ${imposterHint}`)
  ) {
    return null;
  }

  const id = `generated:${wordKey}`;
  if (knownIds.has(id)) return null;

  knownIds.add(id);
  knownWords.add(wordKey);
  return { id, word, category, citizenHint, imposterHint };
}

function buildPrompt(knownWordIds: string[], existingPairs: WordPair[]) {
  const categories = Array.from(new Set(existingPairs.map((pair) => pair.category)));
  const examples = existingPairs.slice(0, 12).map((pair) => ({
    category: pair.category,
    word: pair.word,
    citizenHint: pair.citizenHint,
    imposterHint: pair.imposterHint,
  }));

  return [
    `Generate exactly ${WORDS_TO_GENERATE} original word pairs for the TeaPosters pass-and-play imposter game.`,
    "Every word field must be exactly one word with no spaces: use \"bottle\", never \"water bottle\". Do not use multi-word phrases.",
    "The players are mostly Nepali friends and coworkers, so use familiar South Asian, Nepali, workplace, internet, relationship, travel, food, entertainment, technology, or everyday-life topics.",
    "Keep the tone playful, recognizable, and safe for a casual group game.",
    "For each pair, citizenHint should identify the exact word without saying it. imposterHint should be one level broader: describe only a loose category or context that helps the imposter blend in. Do not use a synonym, defining trait, direct use, near-answer, or wording that makes the citizen word easy to guess, and never reveal or repeat the exact word.",
    `Use categories similar to: ${categories.join(", ")}.`,
    `Do not repeat any existing word IDs: ${knownWordIds.join(", ") || "none"}.`,
    `Style examples only; do not copy them: ${JSON.stringify(examples)}.`,
    "Return only the requested JSON array. Do not include markdown, commentary, URLs, or extra fields.",
  ].join("\n\n");
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
    error?: { status?: unknown; code?: unknown };
  };
  const values = [
    candidate.status,
    candidate.statusCode,
    candidate.error?.status,
    candidate.code,
    candidate.error?.code,
  ];

  for (const value of values) {
    const status = typeof value === "number" ? value : Number(value);
    if (Number.isInteger(status) && status >= 400 && status <= 599) {
      return status;
    }
  }

  return null;
}

function shouldTryAnotherModel(error: unknown) {
  const status = getErrorStatus(error);
  return (
    status === null ||
    status === 408 ||
    status === 429 ||
    status >= 500
  );
}

async function generateDailyWords(request: Request) {
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Daily word generation is not configured. Set AI_GATEWAY_API_KEY." },
      { status: 503 }
    );
  }

  let body: RequestBody = {};
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    // An empty body is valid; the bundled deck still provides the examples.
  }

  const requestedKnownIds = Array.isArray(body.knownWordIds)
    ? body.knownWordIds
        .filter((id): id is string => typeof id === "string")
        .slice(0, MAX_KNOWN_WORD_IDS)
    : [];
  const force = body.force === true;
  let sharedDeck;
  try {
    sharedDeck = await readSharedWordDeck();
  } catch (error) {
    console.error("Shared word deck could not be loaded for generation.", error);
    return NextResponse.json(
      { error: "The shared word deck is temporarily unavailable." },
      { status: 503 }
    );
  }
  const now = Date.now();
  const needsDailyGeneration =
    force ||
    sharedDeck.generatedAt === null ||
    now - sharedDeck.generatedAt >= 24 * 60 * 60 * 1000;

  if (!needsDailyGeneration) {
    return NextResponse.json({
      pairs: [],
      allPairs: sharedDeck.pairs,
      generatedAt: sharedDeck.generatedAt,
    });
  }

  const knownIds = new Set([
    ...sharedDeck.pairs.map((pair) => pair.id),
    ...requestedKnownIds,
  ]);
  const knownWords = new Set(sharedDeck.pairs.map((pair) => normalize(pair.word)));
  const aiGateway = createGateway({ apiKey });

  const models = Array.from(new Set([MODEL, ...FALLBACK_MODELS]));
  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

    try {
      const { output } = await generateText({
        model: aiGateway(model),
        system:
          "You generate safe, concise content for a casual pass-and-play game. Follow the requested JSON schema exactly.",
        prompt: buildPrompt(
          Array.from(knownIds).slice(0, MAX_KNOWN_WORD_IDS),
          sharedDeck.pairs
        ),
        temperature: 0.9,
        maxOutputTokens: 1400,
        abortSignal: controller.signal,
        output: Output.array({
          name: "tea_poster_word_pairs",
          element: jsonSchema<GeneratedPair>(generatedPairSchema),
          minItems: WORDS_TO_GENERATE,
          maxItems: WORDS_TO_GENERATE,
        }),
      });
      const generated = output
        .map((value) => makeGeneratedPair(value, knownIds, knownWords))
        .filter((pair): pair is WordPair => pair !== null);

      if (generated.length >= 3) {
        let savedWords;
        try {
          savedWords = await appendSharedWordPairs(generated, now);
        } catch (error) {
          console.error("Generated words could not be saved.", error);
          return NextResponse.json(
            { error: "The generated words could not be saved." },
            { status: 503 }
          );
        }
        return NextResponse.json({
          pairs: savedWords.addedPairs,
          allPairs: savedWords.deck.pairs,
          generatedAt: savedWords.deck.generatedAt,
        });
      }
    } catch (error) {
      console.error(`AI Gateway word generation failed for ${model}.`, error);
      if (shouldTryAnotherModel(error)) continue;
      break;
    } finally {
      clearTimeout(timeout);
    }
  }

  return NextResponse.json(
    { error: "The daily word generator could not create new words." },
    { status: 502 }
  );
}

export async function POST(request: Request) {
  return generateDailyWords(request);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return generateDailyWords(
    new Request(request.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    })
  );
}
