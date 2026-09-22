"use client";

import {
    ArrowRightIcon,
    CheckIcon,
    ChevronDownIcon,
  ChevronUpIcon,
  DownloadIcon,
  EyeIcon,
  GripVerticalIcon,
    LockKeyholeIcon,
    Loader2Icon,
    MoonIcon,
    PlusIcon,
    RotateCcwIcon,
    ShuffleIcon,
    SparklesIcon,
    SunIcon,
    Trash2Icon,
} from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
import { TeaPosterSplash } from "@/components/tea-poster-splash";

import { randomIndex } from "@/lib/random";
import {
  claimLocalWord,
  getLocalWordPairs,
  mergeWordPairs,
  refreshLocalWordPairs,
} from "@/lib/store";
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

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerOnlineSnapshot() {
  return true;
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    const root = document.documentElement;
    const currentSurface = getComputedStyle(root)
      .getPropertyValue("--background")
      .trim();
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
    }
    root.style.setProperty("--theme-transition-surface", currentSurface);
    root.classList.remove("theme-transition");
    void root.offsetWidth;
    root.classList.add("theme-transition");
    setIsDark(nextIsDark);
    window.requestAnimationFrame(() => {
      root.classList.toggle("dark", nextIsDark);
      root.style.colorScheme = nextIsDark ? "dark" : "light";
    });
    transitionTimeoutRef.current = window.setTimeout(() => {
      root.classList.remove("theme-transition");
      transitionTimeoutRef.current = null;
    }, 240);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-11 rounded-full border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-primary"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const measureInstallState = () => {
      const isIosDevice =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;

      setIsIos(isIosDevice);
      setIsStandalone(standalone);
    };
    const frame = window.requestAnimationFrame(measureInstallState);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleInstalled);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  if (isStandalone || (!installPrompt && !isIos)) return null;

  const install = async () => {
    if (isIos) {
      toast.message("Install TeaPosters from Safari", {
        description: "Tap Share, then choose Add to Home Screen.",
      });
      return;
    }

    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
      }
    } catch (error) {
      console.error("TeaPosters install prompt failed.", error);
      toast.error("Your browser could not show the install prompt.");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-11 rounded-full text-muted-foreground hover:bg-muted hover:text-primary"
      onClick={() => void install()}
      aria-label="Install TeaPosters"
      title="Install TeaPosters"
    >
      <DownloadIcon />
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
    <nav aria-label="Game progress" className="tea-progress mb-7">
      <span className="tea-progress-line" aria-hidden="true" />
      <ol className="relative grid grid-cols-3 gap-2">
        {steps.map((step, index) => {
          const complete = index < currentIndex;
          const current = index === currentIndex;

          return (
            <li
              key={step.id}
              aria-current={current ? "step" : undefined}
              className={`tea-progress-step ${current ? "is-current" : ""} ${complete ? "is-complete" : ""}`}
            >
              <span className="tea-progress-dot">
                {complete && <CheckIcon className="size-3" />}
              </span>
              <span className="tea-progress-label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function TeaPoster() {
  const [showSplash, setShowSplash] = useState(true);
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot
  );
  const wordListRef = useRef<WordPair[]>(WORD_PAIRS);
  const [isRefreshingWords, setIsRefreshingWords] = useState(false);
  const refreshingWordsRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  const refreshWords = useCallback(async (force = false) => {
    if (!navigator.onLine || refreshingWordsRef.current) return;

    refreshingWordsRef.current = true;
    setIsRefreshingWords(true);
    try {
      const result = await refreshLocalWordPairs(
        [...WORD_PAIRS, ...getLocalWordPairs()],
        { force }
      );
      if (!mountedRef.current) return;

      wordListRef.current = mergeWordPairs(WORD_PAIRS, result.pairs);
      if (result.added > 0) {
        toast.success(
          `${result.added} new word${result.added === 1 ? "" : "s"} added for today's rounds.`
        );
      } else if (force) {
        toast.message("No new words were added this time.");
      }
    } catch (error) {
      console.error("Daily word refresh failed.", error);
      if (force && mountedRef.current) {
        toast.error("Couldn’t get new words right now.");
      }
    } finally {
      refreshingWordsRef.current = false;
      if (mountedRef.current) setIsRefreshingWords(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const handleOnline = () => {
      void refreshWords();
    };

    wordListRef.current = mergeWordPairs(WORD_PAIRS, getLocalWordPairs());
    const refreshTimer = window.setTimeout(() => void refreshWords(), 0);
    window.addEventListener("online", handleOnline);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(refreshTimer);
      window.removeEventListener("online", handleOnline);
    };
  }, [refreshWords]);

  const [players, setPlayers] = useState<string[]>(DEFAULT_PLAYERS);
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DEFAULT_PLAYERS.map((p) => [p, true]))
  );
  const [newPlayer, setNewPlayer] = useState("");
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ name: string; after: boolean } | null>(null);
  const draggedPlayerRef = useRef<string | null>(null);
  const dropTargetRef = useRef<{ name: string; after: boolean } | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const playerRowRefs = useRef(new Map<string, HTMLDivElement>());
  const playerRowPositions = useRef(new Map<string, DOMRect>());
  const playerRowAnimations = useRef(new Map<string, Animation>());
  const animateReorderRef = useRef(false);

  const capturePlayerPositions = useCallback(() => {
    playerRowPositions.current.clear();
    playerRowRefs.current.forEach((element, name) => {
      playerRowPositions.current.set(name, element.getBoundingClientRect());
    });
  }, []);

  const [phase, setPhase] = useState<Phase>("setup");
  const [round, setRound] = useState<Round | null>(null);
  const [dealIndex, setDealIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [imposterShown, setImposterShown] = useState(false);

  const activePlayers = useMemo(
    () => players.filter((p) => checked[p]),
    [players, checked]
  );

  useLayoutEffect(() => {
    // Cancel only our layout animations before measuring the new layout.
    // The previous positions were captured visually just before the reorder.
    playerRowAnimations.current.forEach((animation) => animation.cancel());
    playerRowAnimations.current.clear();
    const nextPositions = new Map<string, DOMRect>();
    playerRowRefs.current.forEach((element, name) => {
      nextPositions.set(name, element.getBoundingClientRect());
    });

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shouldAnimate = animateReorderRef.current;
    animateReorderRef.current = false;
    if (shouldAnimate && !reduceMotion) {
      nextPositions.forEach((nextPosition, name) => {
        const previousPosition = playerRowPositions.current.get(name);
        const element = playerRowRefs.current.get(name);
        if (!previousPosition || !element) return;

        const distance = previousPosition.top - nextPosition.top;
        if (Math.abs(distance) < 1) return;

        const animation = element.animate(
          [
            { transform: `translateY(${distance}px)` },
            { transform: "translateY(0)" },
          ],
          {
            duration: 220,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          }
        );
        playerRowAnimations.current.set(name, animation);
      });
    }

    playerRowPositions.current.clear();
  }, [players, showSplash]);

  const startRound = useCallback(() => {
    if (activePlayers.length < 3) {
      toast.error("Pick at least 3 players to start.");
      return;
    }
    const pair = claimLocalWord(wordListRef.current);
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
  }, [activePlayers]);

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

  const movePlayer = useCallback((name: string, direction: -1 | 1, animate: boolean) => {
    const fromIndex = players.indexOf(name);
    const toIndex = fromIndex + direction;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= players.length) return;

    if (animate) {
      animateReorderRef.current = true;
      capturePlayerPositions();
    }
    setPlayers((current) => {
      const currentFromIndex = current.indexOf(name);
      const currentToIndex = currentFromIndex + direction;
      if (currentFromIndex < 0 || currentToIndex < 0 || currentToIndex >= current.length) return current;

      const next = [...current];
      [next[currentFromIndex], next[currentToIndex]] = [next[currentToIndex], next[currentFromIndex]];
      return next;
    });
  }, [capturePlayerPositions, players]);

  const setCurrentDropTarget = useCallback(
    (next: { name: string; after: boolean } | null) => {
      const current = dropTargetRef.current;
      if (
        current?.name === next?.name &&
        current?.after === next?.after
      ) {
        return;
      }
      dropTargetRef.current = next;
      setDropTarget(next);
    },
    []
  );

  const getDropTargetAt = useCallback(
    (clientY: number, draggedName: string) => {
      let lastTarget: { name: string; after: boolean } | null = null;

      for (const name of players) {
        if (name === draggedName) continue;
        const element = playerRowRefs.current.get(name);
        if (!element) continue;

        const bounds = element.getBoundingClientRect();
        const midpoint = bounds.top + bounds.height / 2;
        if (clientY < midpoint) return { name, after: false };
        lastTarget = { name, after: true };
      }

      return lastTarget;
    },
    [players]
  );

  const moveDraggedPlayer = useCallback(
    (name: string, targetName: string, insertAfter: boolean) => {
      if (name === targetName) return;

      const fromIndex = players.indexOf(name);
      const targetIndex = players.indexOf(targetName);
      if (fromIndex < 0 || targetIndex < 0) return;

      let destinationIndex = targetIndex + (insertAfter ? 1 : 0);
      if (fromIndex < destinationIndex) destinationIndex -= 1;
      if (fromIndex === destinationIndex) return;

      animateReorderRef.current = true;
      capturePlayerPositions();

      setPlayers((current) => {
        const currentFromIndex = current.indexOf(name);
        const currentTargetIndex = current.indexOf(targetName);
        if (currentFromIndex < 0 || currentTargetIndex < 0) return current;

        let currentDestinationIndex = currentTargetIndex + (insertAfter ? 1 : 0);
        if (currentFromIndex < currentDestinationIndex) currentDestinationIndex -= 1;
        if (currentFromIndex === currentDestinationIndex) return current;

        const next = [...current];
        const [moved] = next.splice(currentFromIndex, 1);
        next.splice(currentDestinationIndex, 0, moved);
        return next;
      });
    },
    [capturePlayerPositions, players]
  );

  const endPlayerDrag = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, shouldMove: boolean) => {
      if (dragPointerIdRef.current !== event.pointerId) return;

      event.preventDefault();
      const name = draggedPlayerRef.current;
      const target = dropTargetRef.current;
      if (shouldMove && name && target) {
        moveDraggedPlayer(name, target.name, target.after);
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      dragPointerIdRef.current = null;
      draggedPlayerRef.current = null;
      setDraggedPlayer(null);
      setCurrentDropTarget(null);
    },
    [moveDraggedPlayer, setCurrentDropTarget]
  );

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

  if (showSplash) return <TeaPosterSplash />;

  return (
    <main className="tea-shell min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-4 sm:py-12">
      {/* Mobile app header */}
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="tea-logo-frame relative size-13 shrink-0 overflow-hidden rounded-[0.9rem]">
            <Image
              src="/ChatGPT Image Sep 22, 2026 at 06_55_47 PM.png"
              alt="TeaPosters logo"
              fill
              sizes="52px"
              className="scale-[1.1] object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <h1 className="tea-brand-name tea-display truncate text-[1.55rem] leading-none font-bold text-primary">
              TeaPosters
            </h1>
            <p className="tea-brand-subline">spot the imposter</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <PwaInstallButton />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 rounded-full text-muted-foreground hover:bg-muted hover:text-primary"
            onClick={resetGame}
            aria-label="Reset game"
            title="Reset game"
          >
            <RotateCcwIcon />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {imposterShown ? (
        <p className="mb-5 text-center text-xs font-medium text-muted-foreground">Round complete</p>
      ) : (
        <PhaseSteps phase={phase} />
      )}

      <div className="flex-1">
      {/* SETUP */}
      {phase === "setup" && (
        <Card className="tea-flat-card tea-setup tea-scene">
          <CardHeader className="tea-setup-header">
            <CardTitle className="tea-display text-[2.4rem] font-bold leading-[0.98] tracking-tight">Build your round.</CardTitle>
            <CardDescription className="leading-relaxed">
              Choose who is playing, then hold the grip to set the pass order.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="tea-list-heading">
              <div>
                <p className="tea-section-kicker">Players</p>
                <p className="tea-list-meta"><span>{activePlayers.length}</span> in this round</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-full border-accent/30 px-3 text-xs text-primary hover:border-accent/60 hover:bg-accent/10"
                onClick={() => void refreshWords(true)}
                disabled={!isOnline || isRefreshingWords}
                aria-busy={isRefreshingWords}
                title={isOnline ? "Get new words" : "Connect to the internet to get new words"}
              >
                {isRefreshingWords ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <SparklesIcon />
                )}
                <span>{isRefreshingWords ? "Getting…" : "Get new words"}</span>
              </Button>
            </div>
            <p className="tea-drag-help"><GripVerticalIcon className="size-3.5" /> Hold a grip and slide to set the pass order.</p>
            <div role="list" aria-label="Pass order" className="tea-player-list">
              {players.map((name) => (
                <div
                  key={name}
                  ref={(element) => {
                    if (element) {
                      playerRowRefs.current.set(name, element);
                    } else {
                      playerRowRefs.current.delete(name);
                    }
                  }}
                  role="listitem"
                  data-drop-position={dropTarget?.name === name ? (dropTarget.after ? "after" : "before") : undefined}
                  data-dragging={draggedPlayer === name ? "true" : undefined}
                  className="tea-player-row group flex min-h-[4.25rem] items-center gap-2.5 border-b border-border/30 px-3 py-2.5 transition-colors hover:border-primary/30"
                >
                  <button
                    type="button"
                    aria-label={`Drag ${name} to reorder`}
                    className="tea-order-grip grid size-10 shrink-0 place-items-center rounded-xl disabled:pointer-events-none disabled:opacity-35"
                    onPointerDown={(event) => {
                      if (
                        !event.isPrimary ||
                        dragPointerIdRef.current !== null ||
                        (event.pointerType === "mouse" && event.button !== 0)
                      ) return;
                      event.preventDefault();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      dragPointerIdRef.current = event.pointerId;
                      draggedPlayerRef.current = name;
                      capturePlayerPositions();
                      setDraggedPlayer(name);
                      setCurrentDropTarget(null);
                    }}
                    onPointerMove={(event) => {
                      if (dragPointerIdRef.current !== event.pointerId || !draggedPlayerRef.current) return;
                      event.preventDefault();
                      setCurrentDropTarget(getDropTargetAt(event.clientY, draggedPlayerRef.current));
                    }}
                    onPointerUp={(event) => endPlayerDrag(event, true)}
                    onPointerCancel={(event) => endPlayerDrag(event, false)}
                    onLostPointerCapture={(event) => endPlayerDrag(event, false)}
                  >
                    <GripVerticalIcon className="size-4.5" />
                  </button>
                  <Checkbox
                    id={`player-${name}`}
                    checked={!!checked[name]}
                    onCheckedChange={(v) =>
                      setChecked((prev) => ({ ...prev, [name]: v === true }))
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor={`player-${name}`}
                      className="block cursor-pointer break-words text-[0.95rem] font-medium"
                    >
                      {name}
                    </Label>
                    {!checked[name] && <p className="mt-0.5 text-xs text-muted-foreground">Sitting this one out</p>}
                  </div>
                  {checked[name] && <span className="pr-2 text-xs tabular-nums text-muted-foreground">{String(activePlayers.indexOf(name) + 1).padStart(2, "0")}</span>}
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      aria-label={`Move ${name} up`}
                      title={`Move ${name} up`}
                      onClick={(event) => movePlayer(name, -1, event.detail > 0)}
                      disabled={players.indexOf(name) === 0}
                      className="rounded-xl p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-primary disabled:pointer-events-none disabled:opacity-25"
                    >
                      <ChevronUpIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${name} down`}
                      title={`Move ${name} down`}
                      onClick={(event) => movePlayer(name, 1, event.detail > 0)}
                      disabled={players.indexOf(name) === players.length - 1}
                      className="rounded-xl p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-primary disabled:pointer-events-none disabled:opacity-25"
                    >
                      <ChevronDownIcon className="size-4" />
                    </button>
                    {!DEFAULT_PLAYERS.includes(name) && (
                      <button
                        type="button"
                        aria-label={`Remove ${name}`}
                        onClick={() => removePlayer(name)}
                        className="rounded-xl p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4 bg-accent/20" />

            <form
              className="tea-add-player flex gap-2 pb-2"
              onSubmit={(e) => {
                e.preventDefault();
                addPlayer();
              }}
            >
              <label className="sr-only" htmlFor="new-player">Add someone to the round</label>
              <Input
                id="new-player"
                aria-label="New player name"
                value={newPlayer}
                onChange={(e) => setNewPlayer(e.target.value)}
                placeholder="Add a player…"
                maxLength={24}
                className="h-12 rounded-xl border-border/60 bg-background/60 text-base"
              />
              <Button
                type="submit"
                variant="secondary"
                size="icon"
                className="size-12 rounded-xl"
                aria-label="Add player"
                disabled={!newPlayer.trim()}
              >
                <PlusIcon />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* DEAL — pass-and-play reveal */}
      {phase === "deal" && round && (
        <Card className="tea-flat-card tea-round-card tea-scene flex min-h-[31rem] flex-col">
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
                className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
                style={{ width: `${((dealIndex + 1) / round.players.length) * 100}%` }}
              />
            </div>
            <CardTitle className="tea-display mt-4 text-4xl font-bold">
              {round.players[dealIndex]}
            </CardTitle>
            <CardDescription className="max-w-[18rem] leading-relaxed">
              {revealed
                ? "Remember your card."
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
              className="tea-reveal-card flex min-h-60 w-full touch-manipulation flex-col items-center justify-center gap-3 rounded-xl border border-border/40 px-6 text-center active:scale-[0.985] hover:border-primary/40"
            >
              {revealed ? (
                <>
                  <span className={`tea-display max-w-[17rem] text-4xl font-bold leading-tight tracking-tight ${
                    isImposter ? "text-destructive" : ""
                  }`}>
                    {isImposter ? "You are the imposter" : round.pair.word}
                  </span>
                  <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {isImposter ? round.pair.imposterHint : round.pair.citizenHint}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    {dealIndex === round.players.length - 1 ? "Tap to start talking" : "Tap for the next player"} <ArrowRightIcon className="size-3.5" />
                  </span>
                </>
              ) : (
                <>
                  <LockKeyholeIcon className="size-7 text-primary" />
                  <span className="tea-display text-2xl font-bold text-primary">
                    Private card
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Tap to reveal
                  </span>
                </>
              )}
            </button>
          </CardContent>
        </Card>
      )}

      {/* DISCUSS */}
      {phase === "discuss" && round && !imposterShown && (
        <Card className="tea-flat-card tea-scene">
          <CardHeader className="items-center text-center">
            <div className="mb-1 flex items-center justify-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-accent">
              <SparklesIcon className="size-3.5" /> Discussion
            </div>
            <CardTitle className="tea-display text-3xl font-bold">Discuss the clue</CardTitle>
            <CardDescription>
              One of you only has a hint.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="w-full border-y border-accent/30 bg-accent/5 px-1 py-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                first question goes to
              </p>
              <p className="tea-display text-3xl font-bold text-primary">{starterName}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Take turns describing the word without saying it. Then vote out
              the imposter.
            </p>

          </CardContent>
          <CardFooter className="flex-col gap-2">
              <Button
                className="min-h-14 w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 text-base"
                onClick={() => setImposterShown(true)}
              >
                <EyeIcon />
                Reveal the imposter
              </Button>
              <p className="text-xs text-muted-foreground">Make your votes first.</p>
          </CardFooter>
        </Card>
      )}

      {phase === "discuss" && round && imposterShown && (
        <Card className="tea-flat-card tea-scene">
          <CardHeader className="justify-items-center gap-3 pb-3 pt-5 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive" aria-hidden="true">
              <EyeIcon className="size-6" />
            </span>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              The imposter was
            </p>
            <h2
              tabIndex={-1}
              ref={(element) => { element?.focus({ preventScroll: true }); }}
              className="tea-display max-w-full break-words text-4xl font-bold text-destructive outline-none"
            >
              {round.players[round.imposterIndex]}
            </h2>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border/50 border-y border-border/50 px-1">
              <div className="py-4">
                <dt className="text-xs text-muted-foreground">The secret word</dt>
                <dd className="mt-1 break-words text-2xl font-semibold">{round.pair.word}</dd>
              </div>
              <div className="py-4">
                <dt className="text-xs text-muted-foreground">Their hint</dt>
                <dd className="mt-1 font-medium">{round.pair.imposterHint}</dd>
              </div>
            </dl>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button className="min-h-12 w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90" size="lg" onClick={startRound}>
              <ShuffleIcon />
              Play another round
            </Button>
            <Button variant="ghost" className="min-h-11 w-full rounded-xl" onClick={backToSetup}>
              <CheckIcon />
              Change players
            </Button>
          </CardFooter>
        </Card>
      )}

      {phase === "setup" && (
        <div className="mobile-dock pointer-events-none sticky bottom-4 z-20 mt-4">
          <div className="pointer-events-auto">
            <Button
              className="min-h-14 w-full rounded-xl bg-accent text-accent-foreground text-base font-semibold hover:bg-accent/90"
              size="lg"
              onClick={startRound}
              disabled={activePlayers.length < 3}
            >
              <ShuffleIcon />
              {activePlayers.length < 3 ? "Select at least 3 players" : `Start round · ${activePlayers.length} players`}
            </Button>
          </div>
        </div>
      )}
      </div>

      </div>
    </main>
  );
}
