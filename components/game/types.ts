import type { WordPair } from "@/lib/words";

export type Phase = "setup" | "deal" | "discuss";

export type Round = {
  pair: WordPair;
  players: string[];
  imposterIndex: number;
  starterIndex: number;
};
