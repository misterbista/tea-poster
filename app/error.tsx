"use client";

import { RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GameError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="tea-display text-3xl">Let’s try that again.</h1>
      <p className="max-w-sm text-sm text-muted-foreground">TeaPosters couldn’t load this screen. Your saved player groups are still on this device.</p>
      <Button className="min-h-12 rounded-full px-6" onClick={retry}><RotateCcwIcon />Try again</Button>
    </main>
  );
}
