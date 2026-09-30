"use client";

import { ArrowRightIcon, LockKeyholeIcon } from "lucide-react";
import { type MouseEvent, type RefObject, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Round } from "@/components/game/types";
import { haptic } from "@/lib/haptics";

const CARD_TAP_GUARD_MS = 600;

export function DealScreen({ round, dealIndex, revealed, isImposter, revealButtonRef, onNext, onReveal }: {
  round: Round;
  dealIndex: number;
  revealed: boolean;
  isImposter: boolean;
  revealButtonRef: RefObject<HTMLButtonElement | null>;
  onNext: () => void;
  onReveal: () => void;
}) {
  const [animateReveal, setAnimateReveal] = useState(false);
  const nextCardActionAt = useRef(0);
  const handleCardClick = (event: MouseEvent<HTMLButtonElement>) => {
    const now = performance.now();
    if (now < nextCardActionAt.current) return;
    // Lock synchronously so duplicate taps cannot pass a newly revealed card
    // or expose the next player's card before the phone changes hands.
    nextCardActionAt.current = now + CARD_TAP_GUARD_MS;
    haptic("tap");
    if (revealed) onNext();
    else {
      setAnimateReveal(event.detail > 0);
      onReveal();
    }
  };

  return <Card className="tea-flat-card tea-round-card tea-scene flex flex-col">
    <CardHeader className="items-center text-center">
      <div className="flex w-full items-center justify-between gap-3"><span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pass to</span></div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent origin-left" style={{ transform: `scaleX(${(dealIndex + 1) / round.players.length})` }} /></div>
      <CardTitle aria-live="polite" className="mt-4 flex w-full items-center justify-between gap-3"><span className="tea-display min-w-0 break-words text-left text-4xl font-bold">{round.players[dealIndex]}</span><Badge variant="outline" className="shrink-0 border-accent/40 bg-accent/10 text-primary">{dealIndex + 1} / {round.players.length}</Badge></CardTitle>
      <CardDescription className="max-w-[18rem] leading-relaxed">{revealed ? "Remember your card." : "Take the phone. No one else looks."}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-1 flex-col items-center justify-center py-3">
      <button ref={revealButtonRef} type="button" onClick={handleCardClick} aria-label={revealed ? "Hide your card and pass the phone" : `Reveal ${round.players[dealIndex]}'s private card`} className="tea-reveal-card flex min-h-48 w-full touch-manipulation flex-col items-center justify-center gap-3 border border-border/40 px-6 text-center" data-revealed={revealed} data-animate-reveal={revealed && animateReveal}>
        {revealed ? <>
          {isImposter && <p className="text-sm font-bold text-destructive">You are the imposter</p>}
          <span className="tea-reveal-word tea-display max-w-full break-words text-4xl font-bold leading-tight tracking-tight">{isImposter ? round.pair.imposterHint : round.pair.word}</span>
          {!isImposter && <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{round.pair.citizenHint}</p>}
          <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">{dealIndex === round.players.length - 1 ? "Tap to hide & start talking" : "Tap again to hide & pass"}<ArrowRightIcon className="size-3.5" /></span>
        </> : <><LockKeyholeIcon className="size-7 text-primary" /><span className="tea-display text-2xl font-bold text-primary">Private card</span><span className="text-sm text-muted-foreground">Tap to reveal</span></>}
      </button>
    </CardContent>
  </Card>;
}
