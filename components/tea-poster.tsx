"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import {
  CheckIcon,
  EyeIcon,
  MoonIcon,
  PlusIcon,
  RotateCcwIcon,
  ShuffleIcon,
  SunIcon,
  Trash2Icon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { WORD_PAIRS, type WordPair } from "@/lib/words";
import {
  cacheWordPairs,
  getCachedWordPairs,
  getCachedWordsVersion,
  getUsedWordIds,
  markWordsUsed,
  resetUsedWords,
} from "@/lib/db";

const DEFAULT_PLAYERS = [
  "Sannish",
  "Nirmita",
  "Prisha",
  "Piyush",
  "Prashant",
  "Sagun",
  "Aakash",
  "Samrat",
];

type Phase = "setup" | "deal" | "discuss";

type Round = {
  pair: WordPair;
  imposterIndex: number;
  starterIndex: number;
};

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    document.documentElement.classList.toggle("dark", nextIsDark);
    document.documentElement.style.colorScheme = nextIsDark ? "dark" : "light";
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="rounded-full border-border/80 bg-card/60 text-primary hover:border-accent hover:bg-accent/10"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}

function PhaseSteps({ phase }: { phase: Phase }) {
  const steps: { id: Phase; label: string }[] = [
    { id: "setup", label: "Set the table" },
    { id: "deal", label: "Reveal cards" },
    { id: "discuss", label: "Spill the tea" },
  ];
  const currentIndex = steps.findIndex((step) => step.id === phase);

  return (
    <nav aria-label="Game progress" className="mb-6 grid grid-cols-3 gap-2">
      {steps.map((step, index) => {
        const complete = index < currentIndex;
        const current = index === currentIndex;

        return (
          <div
            key={step.id}
            aria-current={current ? "step" : undefined}
            className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors ${
              current
                ? "border-accent/40 bg-accent/10 text-primary"
                : complete
                  ? "border-primary/15 bg-primary/5 text-primary/70"
                  : "border-border/50 bg-card/35 text-muted-foreground"
            }`}
          >
            <span
              className={`grid size-5 shrink-0 place-items-center rounded-full text-[0.6rem] font-bold ${
                current
                  ? "bg-primary text-primary-foreground"
                  : complete
                    ? "bg-accent text-accent-foreground"
                    : "border border-border/70"
              }`}
            >
              {index + 1}
            </span>
            <span className="truncate text-[0.61rem] font-semibold uppercase tracking-[0.08em]">
              {step.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}

function randomIndex(length: number) {
  return Math.floor(Math.random() * length);
}

function pickWord(source: WordPair[], usedIds: string[]): WordPair {
  const fresh = source.filter((p) => !usedIds.includes(p.id));
  // If every word has been used, fall back to the full list.
  const pool = fresh.length > 0 ? fresh : source;
  return pool[randomIndex(pool.length)];
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function useOnlineStatus() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );
}

export function TeaPoster() {
  const online = useOnlineStatus();

  // Word list actually in play: synced from the online source when possible,
  // otherwise the list bundled with the app.
  const [wordList, setWordList] = useState<WordPair[]>(WORD_PAIRS);
  const syncingRef = useRef(false);

  // On mount: load whatever was synced previously (works offline).
  useEffect(() => {
    getCachedWordPairs()
      .then((pairs) => {
        if (pairs.length > 0) setWordList(pairs);
      })
      .catch(() => {});
  }, []);

  // Whenever we're online, pull the latest word list from the source.
  useEffect(() => {
    if (!online || syncingRef.current) return;
    syncingRef.current = true;
    (async () => {
      try {
        const res = await fetch("/api/words", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          version: number;
          pairs: WordPair[];
        };
        if (!Array.isArray(data.pairs) || data.pairs.length === 0) return;
        const cachedVersion = await getCachedWordsVersion();
        if (data.version > cachedVersion) {
          await cacheWordPairs(data.pairs, data.version);
          setWordList(data.pairs);
          toast.success(
            `Word list synced — ${data.pairs.length} words ready for offline play.`
          );
        } else {
          setWordList(data.pairs);
        }
      } catch {
        // Offline or unreachable — cached/bundled list stays in play.
      } finally {
        syncingRef.current = false;
      }
    })();
  }, [online]);

  const [players, setPlayers] = useState<string[]>(DEFAULT_PLAYERS);
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DEFAULT_PLAYERS.map((p) => [p, true]))
  );
  const [newPlayer, setNewPlayer] = useState("");

  const [phase, setPhase] = useState<Phase>("setup");
  const [round, setRound] = useState<Round | null>(null);
  const [dealIndex, setDealIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [imposterShown, setImposterShown] = useState(false);

  const activePlayers = useMemo(
    () => players.filter((p) => checked[p]),
    [players, checked]
  );

  const startRound = useCallback(async () => {
    if (activePlayers.length < 3) {
      toast.error("Pick at least 3 players to start.");
      return;
    }
    let used: string[] = [];
    try {
      used = await getUsedWordIds();
    } catch {
      // IndexedDB unavailable — still playable, just without history.
    }
    const pair = pickWord(wordList, used);
    try {
      await markWordsUsed([pair.id]);
    } catch {
      // ignore
    }
    setRound({
      pair,
      imposterIndex: randomIndex(activePlayers.length),
      starterIndex: randomIndex(activePlayers.length),
    });
    setDealIndex(0);
    setRevealed(false);
    setImposterShown(false);
    setPhase("deal");
  }, [activePlayers, wordList]);

  const addPlayer = useCallback(() => {
    const name = newPlayer.trim();
    if (!name) return;
    if (players.some((p) => p.toLowerCase() === name.toLowerCase())) {
      toast.error(`${name} is already on the list.`);
      return;
    }
    setPlayers((prev) => [...prev, name]);
    setChecked((prev) => ({ ...prev, [name]: true }));
    setNewPlayer("");
  }, [newPlayer, players]);

  const removePlayer = useCallback((name: string) => {
    setPlayers((prev) => prev.filter((p) => p !== name));
    setChecked((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const nextCard = useCallback(() => {
    setRevealed(false);
    if (!round) return;
    if (dealIndex + 1 >= activePlayers.length) {
      setPhase("discuss");
    } else {
      setDealIndex((i) => i + 1);
    }
  }, [dealIndex, round, activePlayers.length]);

  const backToSetup = useCallback(() => {
    setPhase("setup");
    setRound(null);
    setDealIndex(0);
    setRevealed(false);
    setImposterShown(false);
  }, []);

  const resetGame = useCallback(() => {
    backToSetup();
    toast.success("Game reset — choose your players to start again.");
  }, [backToSetup]);

  const onResetWords = useCallback(async () => {
    try {
      await resetUsedWords();
      toast.success("Word history cleared — every word is back in play.");
    } catch {
      toast.error("Could not clear word history.");
    }
  }, []);

  const isImposter = round !== null && dealIndex === round.imposterIndex;
  const starterName = round ? activePlayers[round.starterIndex] : "";

  return (
    <main className="tea-shell min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-7 sm:py-12">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="tea-logo-frame relative size-[4.25rem] shrink-0 overflow-hidden rounded-2xl border-2 border-accent/60 bg-[#fffaf0]">
            <Image
              src="/ChatGPT Image Sep 22, 2026 at 11_38_07 AM.png"
              alt="Tea-Poster's logo"
              fill
              sizes="68px"
              className="object-cover object-[50%_18%]"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="mb-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-accent">
              Sip · suspect · repeat
            </p>
            <h1 className="tea-display truncate text-[2rem] leading-none font-bold text-primary">
              tea<span className="text-accent">-</span>poster
            </h1>
            <p className="mt-1 text-[0.7rem] font-medium tracking-wide text-muted-foreground">
              spot the imposter · spill the tea
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant={online ? "secondary" : "outline"}
            className="hidden gap-1.5 border-accent/30 bg-accent/10 text-primary sm:inline-flex"
          >
            {online ? <WifiIcon className="size-3.5" /> : <WifiOffIcon className="size-3.5" />}
            {online ? "Online" : "Offline"}
          </Badge>
          <ThemeToggle />
        </div>
      </header>

      <div className="mb-5 flex items-center gap-3 sm:hidden">
        <div className="h-px flex-1 bg-accent/25" />
        <Badge
          variant={online ? "secondary" : "outline"}
          className="gap-1.5 border-accent/30 bg-accent/10 text-primary"
        >
          {online ? <WifiIcon className="size-3.5" /> : <WifiOffIcon className="size-3.5" />}
          {online ? "Online" : "Offline"}
        </Badge>
        <div className="h-px flex-1 bg-accent/25" />
      </div>

      <PhaseSteps phase={phase} />

      <div className="mb-5 flex items-center justify-between gap-3 px-1">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {phase === "setup"
            ? "Ready when you are"
            : phase === "deal"
              ? "Keep the cards secret"
              : "Make your accusations"}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-full px-3 text-muted-foreground hover:bg-accent/10 hover:text-primary"
          onClick={resetGame}
        >
          <RotateCcwIcon />
          Reset game
        </Button>
      </div>

      {/* SETUP */}
      {phase === "setup" && (
        <Card className="tea-card">
          <CardHeader>
            <div className="mb-1 flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-accent">
              <span className="size-1.5 rounded-full bg-accent" />
              Set the table
            </div>
            <CardTitle className="tea-display text-2xl font-bold">Who&apos;s playing?</CardTitle>
            <CardDescription className="leading-relaxed">
              Tick everyone in the circle. Then pass the phone and keep your poker face.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {players.map((name) => (
              <div
                key={name}
                className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-accent/20 hover:bg-accent/5"
              >
                <Checkbox
                  id={`player-${name}`}
                  checked={!!checked[name]}
                  onCheckedChange={(v) =>
                    setChecked((prev) => ({ ...prev, [name]: v === true }))
                  }
                />
                <Label
                  htmlFor={`player-${name}`}
                  className="flex-1 cursor-pointer text-base font-medium"
                >
                  {name}
                </Label>
                {!DEFAULT_PLAYERS.includes(name) && (
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    onClick={() => removePlayer(name)}
                    className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                )}
              </div>
            ))}

            <Separator className="my-4 bg-accent/20" />

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addPlayer();
              }}
            >
              <Input
                value={newPlayer}
                onChange={(e) => setNewPlayer(e.target.value)}
                placeholder="Add a player…"
                maxLength={24}
                className="h-10 rounded-xl border-border/80 bg-background/60"
              />
              <Button
                type="submit"
                variant="secondary"
                size="icon"
                className="size-10 rounded-xl border border-accent/25"
                aria-label="Add player"
              >
                <PlusIcon />
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex-col gap-3 pt-4">
            <Button
              className="w-full rounded-xl border border-primary/20 bg-primary py-5 font-semibold shadow-lg shadow-primary/15 hover:bg-primary/90 dark:text-primary-foreground"
              size="lg"
              onClick={startRound}
              disabled={activePlayers.length < 3}
            >
              <ShuffleIcon />
              Start round · {activePlayers.length} players
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
              onClick={onResetWords}
            >
              <RotateCcwIcon />
              Reset word history
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* DEAL — pass-and-play reveal */}
      {phase === "deal" && round && (
        <Card className="tea-card flex-1">
          <CardHeader className="items-center text-center">
            <Badge variant="outline" className="border-accent/40 bg-accent/10 text-primary">
              Card {dealIndex + 1} of {activePlayers.length}
            </Badge>
            <CardTitle className="tea-display mt-2 text-3xl font-bold">
              {activePlayers[dealIndex]}
            </CardTitle>
            <CardDescription>
              {revealed
                ? "Memorize it, then tap this card for the next player."
                : "Take the phone, then tap to peek."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (revealed) {
                  nextCard();
                } else {
                  setRevealed(true);
                }
              }}
              className="tea-reveal-card flex min-h-52 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-accent/45 px-6 text-center transition-colors hover:border-accent hover:bg-accent/10"
            >
              {revealed ? (
                <>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    {isImposter ? "your category hint" : round.pair.category}
                  </span>
                  <span className="tea-display text-3xl font-bold tracking-tight">
                    {isImposter ? round.pair.category : round.pair.word}
                  </span>
                  {isImposter && (
                    <Badge variant="destructive" className="mt-2 border border-destructive/30 bg-destructive/15">
                      You are the imposter — blend in!
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  <EyeIcon className="size-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Tap to reveal your word
                  </span>
                </>
              )}
            </button>
          </CardContent>
        </Card>
      )}

      {/* DISCUSS */}
      {phase === "discuss" && round && (
        <Card className="tea-card">
          <CardHeader className="items-center text-center">
            <div className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-accent">
              Spill the tea
            </div>
            <CardTitle className="tea-display text-3xl font-bold">Time to talk</CardTitle>
            <CardDescription>
              Everyone saw a word. One of you only saw its category.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="w-full rounded-2xl border border-accent/30 bg-accent/10 px-6 py-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                first question goes to
              </p>
              <p className="tea-display text-3xl font-bold text-primary">{starterName}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Take turns describing the word without saying it. Then vote out
              the imposter.
            </p>

            {imposterShown ? (
              <div className="w-full rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  the imposter was
                </p>
                <p className="tea-display text-3xl font-bold text-destructive">
                  {activePlayers[round.imposterIndex]}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The word was <span className="font-medium">{round.pair.word}</span> ·
                  their category was <span className="font-medium">{round.pair.category}</span>
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setImposterShown(true)}
              >
                <EyeIcon />
                Reveal the imposter
              </Button>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button className="w-full" size="lg" onClick={startRound}>
              <ShuffleIcon />
              Same players, new round
            </Button>
            <Button variant="ghost" className="w-full" onClick={backToSetup}>
              <CheckIcon />
              Change players
            </Button>
          </CardFooter>
        </Card>
      )}

      <footer className="mt-auto pt-8 text-center text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        works offline · word history stored on this device
      </footer>
      </div>
    </main>
  );
}
