import { NextResponse } from "next/server";

import { readSharedWordDeck } from "@/lib/server-word-deck";

export const runtime = "nodejs";

export async function GET() {
  const deck = await readSharedWordDeck();

  return NextResponse.json(deck, {
    headers: { "cache-control": "no-store" },
  });
}
