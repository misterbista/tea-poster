import type { WordPair } from "@/lib/words";
import type { WordTrackerStats } from "@/lib/word-tracker";

export type ClaimedWord = {
  pair: WordPair;
  cycleReset: boolean;
  tracker: WordTrackerStats;
};

async function request<T>(init?: RequestInit): Promise<T> {
  const response = await fetch("/api/word-tracker", {
    cache: "no-store",
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Word tracker request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getServerWordTracker() {
  return request<WordTrackerStats>();
}

export function claimServerWord(usedWordIds: string[] = []) {
  return request<ClaimedWord>({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usedWordIds }),
  });
}

export function syncServerWordTracker(usedWordIds: string[]) {
  return request<WordTrackerStats>({
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usedWordIds }),
  });
}

export function resetServerWordTracker() {
  return request<WordTrackerStats>({ method: "DELETE" });
}
