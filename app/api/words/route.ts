import { NextResponse } from "next/server";

import { readSharedWordDeck } from "@/lib/server-word-deck";

export const runtime = "nodejs";

export async function GET() {
  try {
    const deck = await readSharedWordDeck();

    return NextResponse.json(deck, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("Shared word deck request failed.", error);
    return NextResponse.json(
      { error: "The shared word deck is temporarily unavailable." },
      { status: 503 }
    );
  }
}
