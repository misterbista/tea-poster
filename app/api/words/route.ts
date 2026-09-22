import { getWordPairs } from "@/lib/word-source";
import { WORDS_VERSION } from "@/lib/words";

// Serve the local deck. Increment version in lib/words.json after edits.
export async function GET() {
  const pairs = await getWordPairs();
  return Response.json(
    { version: WORDS_VERSION, pairs },
    {
      headers: {
        // Never let the service worker or CDN serve a stale list.
        "Cache-Control": "no-store",
      },
    }
  );
}
