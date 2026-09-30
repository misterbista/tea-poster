"use client";

import { EyeIcon, MessageCircleIcon, ShuffleIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Round } from "@/components/game/types";

export function DiscussionScreen({ round, starterName, imposterShown, onRevealImposter, onPlayAgain, onChangePlayers }: {
  round: Round;
  starterName: string;
  imposterShown: boolean;
  onRevealImposter: () => void;
  onPlayAgain: () => void;
  onChangePlayers: () => void;
}) {
  if (!imposterShown) return <Card className="tea-flat-card tea-discussion tea-scene">
    <CardHeader className="items-center text-center"><div className="mb-1 flex items-center justify-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-accent"><MessageCircleIcon className="size-3.5" aria-hidden="true" /> Discussion</div><CardTitle className="tea-display text-3xl font-bold">Give a clue. Find the imposter.</CardTitle><CardDescription>One of you only has a hint.</CardDescription></CardHeader>
    <CardContent className="flex flex-col items-center gap-4 text-center"><div className="tea-clue-box w-full px-5 py-6"><p className="text-xs uppercase tracking-widest text-muted-foreground">First clue from</p><p className="tea-display break-words text-3xl font-bold text-primary">{starterName}</p></div><p className="text-sm text-muted-foreground">Take turns giving a clue without saying the word. Discuss who sounds suspicious, then vote before revealing the imposter.</p></CardContent>
    <CardFooter className="flex-col gap-2"><Button className="min-h-14 w-full rounded-xl bg-accent text-base text-accent-foreground hover:bg-accent/90" onClick={onRevealImposter}><EyeIcon />Reveal the imposter</Button><p className="text-xs text-muted-foreground">Make your votes first.</p></CardFooter>
  </Card>;

  return <Card className="tea-flat-card tea-result-card tea-scene"><CardHeader className="items-center gap-3 pb-3 pt-5 text-center"><span className="grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive" aria-hidden="true"><EyeIcon className="size-6" /></span><p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">The imposter was</p><h2 tabIndex={-1} ref={(element) => { element?.focus({ preventScroll: true }); }} className="tea-display max-w-full break-words text-4xl font-bold text-destructive outline-none">{round.players[round.imposterIndex]}</h2></CardHeader><CardContent><dl className="tea-result-details divide-y divide-border/50 border-y border-border/50 px-1"><div className="py-4"><dt className="text-xs text-muted-foreground">The secret word</dt><dd className="mt-1 break-words text-2xl font-semibold">{round.pair.word}</dd></div><div className="py-4"><dt className="text-xs text-muted-foreground">Their hint</dt><dd className="mt-1 font-medium">{round.pair.imposterHint}</dd></div></dl></CardContent><CardFooter className="flex-col gap-2"><Button className="min-h-12 w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90" size="lg" onClick={onPlayAgain}><ShuffleIcon />Play another round</Button><Button variant="ghost" className="min-h-11 w-full rounded-xl" onClick={onChangePlayers}><UsersIcon />Change players</Button></CardFooter></Card>;
}
