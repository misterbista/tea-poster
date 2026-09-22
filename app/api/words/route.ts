import { getWordPairs } from "@/lib/word-source";
import { WORDS_VERSION } from "@/lib/words";

// Online source for word pairs. Bump WORDS_VERSION in lib/words.ts
// whenever this list changes — clients re-sync when the version rises.
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
