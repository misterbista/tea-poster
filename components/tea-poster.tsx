"use client";

import {
    ArrowRightIcon,
    CheckIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    EyeIcon,
    LockKeyholeIcon,
    MoonIcon,
    PlusIcon,
    RotateCcwIcon,
    ShuffleIcon,
    SparklesIcon,
    SunIcon,
    Trash2Icon,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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

import {
    cacheWordPairs,
    claimOfflineWord,
    getCachedWordPairs,
    getCachedWordsVersion,
    getPendingWordIds,
    saveTrackerSnapshot,
} from "@/lib/store";
import {
    claimServerWord,
    getServerWordTracker,
    syncServerWordTracker,
} from "@/lib/word-tracker-client";
import { WORD_PAIRS, type WordPair } from "@/lib/words";

const DEFAULT_PLAYERS = [
  "Sannish",
  "Nirmita",
  "Prisha",
  "Piyush",
  "Prashant",
  "Sagun",
  "Aakash",
  "Samrat",
  "Pooja",
  "Sambriddhi",
  "Zatil"
];

type Phase = "setup" | "deal" | "discuss";

type Round = {
  pair: WordPair;
  players: string[];
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
      className="size-11 rounded-full border-border/70 bg-card/60 text-primary shadow-sm hover:border-accent hover:bg-accent/10"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}

function PhaseSteps({ phase }: { phase: Phase }) {
  const steps: { id: Phase; label: string }[] = [
    { id: "setup", label: "Players" },
    { id: "deal", label: "Peek" },
    { id: "discuss", label: "Talk" },
  ];
  const currentIndex = steps.findIndex((step) => step.id === phase);

  return (
    <nav aria-label="Game progress" className="mb-5 grid grid-cols-3 gap-2">
      {steps.map((step, index) => {
        const complete = index < currentIndex;
        const current = index === currentIndex;

        return (
          <div
            key={step.id}
            aria-current={current ? "step" : undefined}
            className={`flex items-center justify-center gap-1.5 rounded-2xl border px-2 py-2 transition-colors ${
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
            <span className="truncate text-[0.63rem] font-semibold uppercase tracking-[0.1em]">
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
    if (!online) {
      return;
    }
    if (syncingRef.current) return;
    syncingRef.current = true;
    (async () => {
      try {
        try {
          const res = await fetch("/api/words", { cache: "no-store" });
          if (res.ok) {
            const data = (await res.json()) as {
              version: number;
              pairs: WordPair[];
            };
            if (Array.isArray(data.pairs) && data.pairs.length > 0) {
              const cachedVersion = await getCachedWordsVersion();
              if (data.version > cachedVersion) {
                await cacheWordPairs(data.pairs, data.version);
                toast.success(
                  `Word list synced — ${data.pairs.length} words ready for offline play.`
                );
              }
              setWordList(data.pairs);
            }
          }
        } catch {
          // Cached/bundled word list stays in play if this request fails.
        }

        try {
          const pendingWordIds = await getPendingWordIds();
          const tracker =
            pendingWordIds.length > 0
              ? await syncServerWordTracker(pendingWordIds)
              : await getServerWordTracker();
          await saveTrackerSnapshot(tracker);
        } catch {
          // Keep the offline outbox until the backend is reachable.
        }
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
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);

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
    let pair: WordPair;
    try {
      const pendingWordIds = await getPendingWordIds();
      const result = await claimServerWord(pendingWordIds);
      pair = result.pair;
      try {
        await saveTrackerSnapshot(result.tracker);
      } catch {
        // The round is already claimed on the backend; local cache can retry later.
      }
      if (result.cycleReset) {
        toast.info("Fresh word cycle started — no repeats until this deck is used.");
      }
    } catch {
      pair = await claimOfflineWord(wordList);
      toast.warning("Offline mode — this word will sync when you reconnect.");
    }
    setRound({
      pair,
      players: [...activePlayers],
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

  const movePlayer = useCallback((name: string, direction: -1 | 1) => {
    setPlayers((current) => {
      const fromIndex = current.indexOf(name);
      const toIndex = fromIndex + direction;
      if (fromIndex < 0 || toIndex < 0 || toIndex >= current.length) return current;

      const next = [...current];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
  }, []);

  const reorderPlayer = useCallback((targetName: string) => {
    if (!draggedPlayer || draggedPlayer === targetName) return;

    setPlayers((current) => {
      const fromIndex = current.indexOf(draggedPlayer);
      const toIndex = current.indexOf(targetName);
      if (fromIndex < 0 || toIndex < 0) return current;

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDraggedPlayer(null);
  }, [draggedPlayer]);

  const nextCard = useCallback(() => {
    setRevealed(false);
    if (!round) return;
    if (dealIndex + 1 >= round.players.length) {
      setPhase("discuss");
    } else {
      setDealIndex((i) => i + 1);
    }
  }, [dealIndex, round]);

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

  const isImposter = round !== null && dealIndex === round.imposterIndex;
  const starterName = round ? round.players[round.starterIndex] : "";

  return (
    <main className="tea-shell min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-4 sm:py-12">
      {/* Mobile app header */}
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="tea-logo-frame relative size-11 shrink-0 overflow-hidden rounded-2xl border border-accent/45 bg-[#fffaf0]">
            <Image
              src="/ChatGPT Image Sep 22, 2026 at 11_38_07 AM.png"
              alt="Tea-Poster's logo"
              fill
              sizes="44px"
              className="object-cover object-[50%_18%]"
              priority
            />
          </div>
          <h1 className="tea-display truncate text-[1.6rem] leading-none font-bold text-primary">
            tea<span className="text-accent">-</span>poster
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 rounded-full text-muted-foreground hover:bg-accent/10 hover:text-primary"
            onClick={resetGame}
            aria-label="Reset game"
            title="Reset game"
          >
            <RotateCcwIcon />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <PhaseSteps phase={phase} />

      <div className="flex-1">
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
              Select the circle. The phone passes top to bottom.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {players.map((name, index) => (
              <div
                key={name}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  setDraggedPlayer(name);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => reorderPlayer(name)}
                onDragEnd={() => setDraggedPlayer(null)}
                className={`group flex min-h-12 items-center gap-2 rounded-2xl border border-transparent px-2.5 py-2 transition-colors hover:border-accent/25 hover:bg-accent/5 ${
                  draggedPlayer === name ? "opacity-50" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className="tea-order-grip grid size-7 shrink-0 cursor-grab place-items-center rounded-xl text-[0.65rem] font-bold active:cursor-grabbing"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Checkbox
                  id={`player-${name}`}
                  checked={!!checked[name]}
                  onCheckedChange={(v) =>
                    setChecked((prev) => ({ ...prev, [name]: v === true }))
                  }
                />
                <Label
                  htmlFor={`player-${name}`}
                  className="flex-1 cursor-pointer text-[0.95rem] font-semibold"
                >
                  {name}
                </Label>
                <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                  <button
                    type="button"
                    aria-label={`Move ${name} up`}
                    title={`Move ${name} up`}
                    onClick={() => movePlayer(name, -1)}
                    disabled={players.indexOf(name) === 0}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-primary disabled:pointer-events-none disabled:opacity-25"
                  >
                    <ChevronUpIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${name} down`}
                    title={`Move ${name} down`}
                    onClick={() => movePlayer(name, 1)}
                    disabled={players.indexOf(name) === players.length - 1}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-primary disabled:pointer-events-none disabled:opacity-25"
                  >
                    <ChevronDownIcon className="size-4" />
                  </button>
                  {!DEFAULT_PLAYERS.includes(name) && (
                    <button
                      type="button"
                      aria-label={`Remove ${name}`}
                      onClick={() => removePlayer(name)}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  )}
                </div>
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
                className="h-11 rounded-xl border-border/80 bg-background/60"
              />
              <Button
                type="submit"
                variant="secondary"
                size="icon"
                className="size-11 rounded-xl border border-accent/25"
                aria-label="Add player"
              >
                <PlusIcon />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* DEAL — pass-and-play reveal */}
      {phase === "deal" && round && (
        <Card
          className={`tea-card tea-round-card flex min-h-[31rem] flex-col ${
            isImposter ? "tea-imposter-card" : ""
          }`}
        >
          <CardHeader className="items-center text-center">
            <div className="flex w-full items-center justify-between gap-3">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Pass to
              </span>
              <Badge variant="outline" className="border-accent/40 bg-accent/10 text-primary">
                {dealIndex + 1} / {round.players.length}
              </Badge>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${((dealIndex + 1) / round.players.length) * 100}%` }}
              />
            </div>
            <CardTitle className="tea-display mt-4 text-4xl font-bold">
              {round.players[dealIndex]}
            </CardTitle>
            <CardDescription className="max-w-[18rem] leading-relaxed">
              {revealed
                ? "Lock it in. One more tap passes the phone on."
                : "Take the phone. No one else looks."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center py-3">
            <button
              type="button"
              data-revealed={revealed}
              onClick={() => {
                if (revealed) {
                  nextCard();
                } else {
                  setRevealed(true);
                }
              }}
              className="tea-reveal-card flex min-h-60 w-full touch-manipulation flex-col items-center justify-center gap-3 rounded-[1.75rem] border border-dashed border-accent/45 px-6 text-center transition-all active:scale-[0.985] hover:border-accent"
            >
              {revealed ? (
                <>
                  {isImposter && (
                    <span className="tea-secret-label">your category hint</span>
                  )}
                  <span className="tea-display text-4xl font-bold tracking-tight">
                    {isImposter ? round.pair.category : round.pair.word}
                  </span>
                  {isImposter && (
                    <Badge variant="destructive" className="mt-2 border border-destructive/30 bg-destructive/15">
                      You are the imposter — blend in!
                    </Badge>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    Tap to pass on <ArrowRightIcon className="size-3.5" />
                  </span>
                </>
              ) : (
                <>
                  <LockKeyholeIcon className="size-7 text-primary" />
                  <span className="tea-display text-2xl font-bold text-primary">
                    Private card
                  </span>
                  <span className="max-w-48 text-sm leading-relaxed text-muted-foreground">
                    Tap once to reveal your secret word.
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold text-primary">
                    <EyeIcon className="size-3.5" /> Peek now
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
            <div className="mb-1 flex items-center justify-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-accent">
              <SparklesIcon className="size-3.5" /> Spill the tea
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
                  {round.players[round.imposterIndex]}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The word was <span className="font-medium">{round.pair.word}</span> ·
                  their category was <span className="font-medium">{round.pair.category}</span>
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                className="min-h-11 rounded-2xl px-5"
                onClick={() => setImposterShown(true)}
              >
                <EyeIcon />
                Reveal the imposter
              </Button>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button className="min-h-12 w-full rounded-2xl" size="lg" onClick={startRound}>
              <ShuffleIcon />
              Same players, new round
            </Button>
            <Button variant="ghost" className="min-h-11 w-full rounded-2xl" onClick={backToSetup}>
              <CheckIcon />
              Change players
            </Button>
          </CardFooter>
        </Card>
      )}

      {phase === "setup" && (
        <div className="mobile-dock pointer-events-none sticky bottom-4 z-20 mt-4">
          <div className="pointer-events-auto rounded-[1.5rem] border border-primary/15 bg-background/85 p-2 shadow-2xl shadow-primary/15 backdrop-blur-xl">
            <Button
              className="min-h-12 w-full rounded-[1.15rem] border border-primary/20 bg-primary font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 dark:text-primary-foreground"
              size="lg"
              onClick={startRound}
              disabled={activePlayers.length < 3}
            >
              <ShuffleIcon />
              Start round · {activePlayers.length} players
            </Button>
          </div>
        </div>
      )}
      </div>

      <footer className="mt-6 pt-4 text-center text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        works offline · word list cached · claims sync when online
      </footer>
      </div>
    </main>
  );
}
