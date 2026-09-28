"use client";

import Image from "next/image";
import { RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PwaInstallButton } from "@/components/game/pwa-install-button";
import { ThemeToggle } from "@/components/game/theme-toggle";
import type { Phase } from "@/components/game/types";

export function GameHeader({ phase, onReset }: { phase: Phase; onReset: () => void }) {
  const reset = () => {
    if (phase === "setup") {
      onReset();
      return;
    }
    toast.warning("End this round?", { description: "Your current deal will be cleared.", duration: Infinity, action: { label: "Reset round", onClick: onReset }, cancel: { label: "Keep playing", onClick: () => {} } });
  };

  return <><div className="tea-header-space" aria-hidden="true" /><header className="tea-app-header tea-page-frame z-30 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5"><div className="tea-logo-frame relative size-13 shrink-0 overflow-hidden rounded-[0.9rem]"><Image src="/ChatGPT Image Sep 22, 2026 at 06_55_47 PM.png" alt="TeaPosters logo" fill sizes="52px" className="scale-[1.1] object-contain" priority /></div><div className="min-w-0"><h1 className="tea-brand-name tea-display truncate text-[1.55rem] leading-none font-bold text-primary">TeaPosters</h1><p className="tea-brand-subline">spot the imposter</p></div></div><div className="flex shrink-0 items-center gap-1.5"><PwaInstallButton /><Button type="button" variant="ghost" size="icon" className="size-11 rounded-full text-muted-foreground hover:bg-muted hover:text-primary" onClick={reset} aria-label={phase === "setup" ? "Reset game" : "Reset round"} title="Reset game"><RotateCcwIcon /></Button><ThemeToggle /></div></header></>;
}
