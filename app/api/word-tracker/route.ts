import { getWordPairs } from "@/lib/word-source";
import {
  claimFreshWord,
  getTrackerStats,
  resetTracker,
  syncTracker,
} from "@/lib/word-tracker";

export const dynamic = "force-dynamic";

export async function GET() {
  const pairs = await getWordPairs();
  const tracker = await getTrackerStats(pairs);
  return Response.json(tracker, {
    headers: { "Cache-Control": "no-store" },
  });
}

async function readUsedWordIds(request: Request) {
  try {
    const body = (await request.json()) as { usedWordIds?: unknown };
    return Array.isArray(body.usedWordIds)
      ? body.usedWordIds.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const pairs = await getWordPairs();
  const usedWordIds = await readUsedWordIds(request);
  const result = await claimFreshWord(pairs, usedWordIds);
  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(request: Request) {
  const pairs = await getWordPairs();
  const usedWordIds = await readUsedWordIds(request);
  const tracker = await syncTracker(pairs, usedWordIds);
  return Response.json(tracker, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function DELETE() {
  const pairs = await getWordPairs();
  const tracker = await resetTracker(pairs);
  return Response.json(tracker, {
    headers: { "Cache-Control": "no-store" },
  });
}
