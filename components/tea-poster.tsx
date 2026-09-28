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
  type SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { ServiceWorkerRegister } from "@/app/sw-register";

import { PlayerGroupPicker } from "@/components/player-group-picker";
import { loadPlayerGroups, PLAYER_GROUPS_KEY, type PlayerGroup } from "@/lib/player-groups";

import { ActionMenu } from "@/components/ui/action-menu";
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
import { TeaPosterSplash } from "@/components/tea-poster-splash";

import { randomIndex } from "@/lib/random";
import { claimLocalWord } from "@/lib/store";
import { useScreenWakeLock } from "@/lib/use-screen-wake-lock";
import { type WordPair } from "@/lib/words";

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

function tapFeedback() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(8);
  }
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let savedTheme: string | null = null;
    try {
      savedTheme = window.localStorage.getItem("tea-posters-theme");
    } catch {
      // The system preference remains available when storage is disabled.
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextIsDark = savedTheme === "dark" || (savedTheme === null && prefersDark);
    const frame = window.requestAnimationFrame(() => {
      document.documentElement.classList.toggle("dark", nextIsDark);
      document.documentElement.style.colorScheme = nextIsDark ? "dark" : "light";
      setIsDark(nextIsDark);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    const root = document.documentElement;
    const updateTheme = () => {
      root.classList.toggle("dark", nextIsDark);
      root.style.colorScheme = nextIsDark ? "dark" : "light";
      setIsDark(nextIsDark);
    };

    try {
      window.localStorage.setItem("tea-posters-theme", nextIsDark ? "dark" : "light");
    } catch {
      // The current session still changes theme when storage is disabled.
    }

    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    const shouldAnimate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && shouldAnimate) {
      document.startViewTransition(updateTheme);
      return;
    }

    const fallbackTransition = shouldAnimate;
    if (fallbackTransition) root.classList.add("theme-transition-fallback");
    updateTheme();
    if (fallbackTransition) {
      transitionTimeoutRef.current = window.setTimeout(() => {
        root.classList.remove("theme-transition-fallback");
        transitionTimeoutRef.current = null;
      }, 220);
    }
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

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  const [playerGroups, setPlayerGroups] = useState(() => loadPlayerGroups(null, null, DEFAULT_PLAYERS));
  const currentGroup = playerGroups.groups.find((group) => group.id === playerGroups.activeId)!;
  const { players, checked } = currentGroup;
  const updateCurrentGroup = useCallback((update: (group: PlayerGroup) => PlayerGroup) => {
    setPlayerGroups((current) => ({ ...current, groups: current.groups.map((group) => group.id === current.activeId ? update(group) : group) }));
  }, []);
  const setPlayers = useCallback((value: SetStateAction<string[]>) => {
    updateCurrentGroup((group) => ({ ...group, players: typeof value === "function" ? value(group.players) : value }));
  }, [updateCurrentGroup]);
  const setChecked = useCallback((value: SetStateAction<Record<string, boolean>>) => {
    updateCurrentGroup((group) => ({ ...group, checked: typeof value === "function" ? value(group.checked) : value }));
  }, [updateCurrentGroup]);
  const [playerSetupLoaded, setPlayerSetupLoaded] = useState(false);
  const [newPlayer, setNewPlayer] = useState("");
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ name: string; after: boolean } | null>(null);
  const playerListRef = useRef<HTMLDivElement>(null);
  const dragClientYRef = useRef(0);
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
  const revealButtonRef = useRef<HTMLButtonElement>(null);
  const handoffButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (phase !== "deal") return;
    const target = revealed ? handoffButtonRef.current : revealButtonRef.current;
    target?.focus({ preventScroll: true });
  }, [phase, revealed, dealIndex]);


  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setPlayerGroups(loadPlayerGroups(
          window.localStorage.getItem(PLAYER_GROUPS_KEY),
          window.localStorage.getItem("tea-posters-players"),
          DEFAULT_PLAYERS,
        ));
      } catch {
        // A damaged preference should never prevent a new round.
      }
      setPlayerSetupLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!playerSetupLoaded) return;
    try {
      window.localStorage.setItem(
        PLAYER_GROUPS_KEY,
        JSON.stringify(playerGroups)
      );
    } catch {
      // Player setup remains usable for this session when storage is disabled.
    }
  }, [playerGroups, playerSetupLoaded]);

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
    const pair = claimLocalWord();
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
    if (players.length >= 24) {
      toast.error("A round can have up to 24 players.");
      return;
    }
    if (players.some((p) => p.toLowerCase() === name.toLowerCase())) {
      toast.error(`${name} is already on the list.`);
      return;
    }
    setPlayers((prev) => [...prev, name]);
    setChecked((prev) => ({ ...prev, [name]: true }));
    setNewPlayer("");
  }, [newPlayer, players, setPlayers, setChecked]);

  const removePlayer = useCallback((name: string) => {
    const groupId = playerGroups.activeId;
    const previousIndex = players.indexOf(name);
    const wasSelected = checked[name] === true;
    setPlayers((current) => current.filter((player) => player !== name));
    setChecked((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    toast(`Removed ${name}`, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => setPlayerGroups((current) => ({
          ...current,
          groups: current.groups.map((group) => {
            if (group.id !== groupId || group.players.includes(name)) return group;
            const nextPlayers = [...group.players];
            nextPlayers.splice(Math.min(previousIndex, nextPlayers.length), 0, name);
            return {
              ...group,
              players: nextPlayers,
              checked: { ...group.checked, [name]: wasSelected },
            };
          }),
        })),
      },
    });
  }, [checked, playerGroups.activeId, players, setPlayers, setChecked]);

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
  }, [capturePlayerPositions, players, setPlayers]);

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

  useEffect(() => {
    if (!draggedPlayer) return;
    let frame = 0;
    let previousTime = 0;
    const scrollWhileDragging = (time: number) => {
      const list = playerListRef.current;
      if (list) {
        const bounds = list.getBoundingClientRect();
        const edge = Math.min(96, Math.max(64, bounds.height * 0.24));
        const y = dragClientYRef.current;
        const distanceFromTop = bounds.top + edge - y;
        const distanceFromBottom = y - (bounds.bottom - edge);
        const speed = distanceFromTop > 0
          ? -Math.min(1, distanceFromTop / edge)
          : distanceFromBottom > 0 ? Math.min(1, distanceFromBottom / edge) : 0;
        const elapsed = previousTime ? Math.min(time - previousTime, 32) : 0;
        if (speed && elapsed > 0) {
          const previousScrollTop = list.scrollTop;
          list.scrollTop += speed * elapsed * 0.9;
          if (list.scrollTop !== previousScrollTop) {
            setCurrentDropTarget(getDropTargetAt(y, draggedPlayer));
          }
        }
      }
      previousTime = time;
      frame = requestAnimationFrame(scrollWhileDragging);
    };
    frame = requestAnimationFrame(scrollWhileDragging);
    return () => cancelAnimationFrame(frame);
  }, [draggedPlayer, getDropTargetAt, setCurrentDropTarget]);

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
    [capturePlayerPositions, players, setPlayers]
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

  useScreenWakeLock(phase === "deal");

  const isImposter = round !== null && dealIndex === round.imposterIndex;
  const starterName = round ? round.players[round.starterIndex] : "";

  if (showSplash) return <TeaPosterSplash />;

  return (
    <main className="tea-shell min-h-dvh" data-phase={phase}>
      <ServiceWorkerRegister gameActive={phase !== "setup"} />
      <div className="tea-viewport mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-4 sm:py-12">
      {/* Mobile app header */}
      <header className="tea-app-header sticky top-0 z-30 mb-5 flex items-center justify-between gap-3">
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
            onClick={() => {
              if (phase === "setup") {
                resetGame();
                return;
              }
              toast.warning("End this round?", {
                description: "Your current deal will be cleared.",
                duration: Infinity,
                action: {
                  label: "Reset round",
                  onClick: () => resetGame(),
                },
                cancel: {
                  label: "Keep playing",
                  onClick: () => {},
                },
              });
            }}
            aria-label={phase === "setup" ? "Reset game" : "Reset round"}
            title="Reset game"
          >
            <RotateCcwIcon />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {imposterShown ? (
        <p className="mb-5 text-center text-xs font-medium text-muted-foreground">Round complete</p>
      ) : phase !== "setup" && (
        <PhaseSteps phase={phase} />
      )}

      <div className="tea-content flex-1">
      {/* SETUP */}
      {phase === "setup" && (
        <Card className="tea-flat-card tea-setup tea-scene">
          <CardContent className="flex flex-col gap-3">
            {playerSetupLoaded && <PlayerGroupPicker
              groups={playerGroups.groups}
              activeId={playerGroups.activeId}
              onSelect={(activeId) => {
                setPlayerGroups((current) => ({ ...current, activeId }));
                setNewPlayer("");
              }}
              onSave={(value, create) => {
                const name = value.trim();
                if (!name) return false;
                if (playerGroups.groups.some((group) => (create || group.id !== playerGroups.activeId) && group.name.toLowerCase() === name.toLowerCase())) {
                  toast.error("A group with that name already exists.");
                  return false;
                }
                if (create) {
                  const group: PlayerGroup = { id: crypto.randomUUID(), name, players: [], checked: {} };
                  setPlayerGroups((current) => ({ groups: [...current.groups, group], activeId: group.id }));
                  setNewPlayer("");
                } else {
                  updateCurrentGroup((group) => ({ ...group, name }));
                }
                return true;
              }}
              onDelete={() => {
                setPlayerGroups((current) => {
                  if (current.groups.length < 2) return current;
                  const groups = current.groups.filter((group) => group.id !== current.activeId);
                  return { groups, activeId: groups[0].id };
                });
                setNewPlayer("");
              }}
            />}
            {players.length === 0 && <p className="py-3 text-sm text-muted-foreground">Add players below to start this group. You need at least 3 to play.</p>}
            <div className="tea-list-heading">
              <div>
                <p className="tea-section-kicker">Players</p>
                <p className="tea-list-meta"><span>{activePlayers.length}</span> in this round</p>
              </div>
            </div>
            <p className="tea-drag-help">Select players. Drag the grips to set pass order.</p>
            <div key={playerGroups.activeId} ref={playerListRef} role="list" aria-label="Pass order" tabIndex={0} className="tea-player-list">
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
                  className="tea-player-row group flex min-h-16 items-center gap-2 border-b border-border/30 px-1 py-1.5"
                  data-selected={!!checked[name]}
                >
                  <button
                    type="button"
                    aria-label={`Drag ${name} to reorder`}
                    className="tea-order-grip grid size-11 shrink-0 place-items-center rounded-xl disabled:pointer-events-none disabled:opacity-35"
                    onPointerDown={(event) => {
                      if (
                        !event.isPrimary ||
                        dragPointerIdRef.current !== null ||
                        (event.pointerType === "mouse" && event.button !== 0)
                      ) return;
                      event.preventDefault();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      dragClientYRef.current = event.clientY;
                      dragPointerIdRef.current = event.pointerId;
                      draggedPlayerRef.current = name;
                      capturePlayerPositions();
                      setDraggedPlayer(name);
                      setCurrentDropTarget(null);
                    }}
                    onPointerMove={(event) => {
                      if (dragPointerIdRef.current !== event.pointerId || !draggedPlayerRef.current) return;
                      event.preventDefault();
                      dragClientYRef.current = event.clientY;
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
                      className="flex min-h-11 cursor-pointer items-center break-words text-[0.95rem] font-medium"
                    >
                      {name}
                    </Label>
                  </div>
                  {checked[name] && <span className="pr-2 text-xs tabular-nums text-muted-foreground">{String(activePlayers.indexOf(name) + 1).padStart(2, "0")}</span>}
                  <ActionMenu label={`Actions for ${name}`} actions={[
                    { label: "Move up", icon: <ChevronUpIcon />, disabled: players.indexOf(name) === 0, onClick: () => movePlayer(name, -1, false) },
                    { label: "Move down", icon: <ChevronDownIcon />, disabled: players.indexOf(name) === players.length - 1, onClick: () => movePlayer(name, 1, false) },
                    { label: "Remove player", icon: <Trash2Icon />, destructive: true, onClick: () => removePlayer(name) },
                  ]} />
                </div>
              ))}
            </div>


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
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="done"
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

            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
                style={{ width: `${((dealIndex + 1) / round.players.length) * 100}%` }}
              />
            </div>
            <CardTitle aria-live="polite" className="mt-4 flex w-full items-center justify-between gap-3">
              <span className="tea-display min-w-0 break-words text-left text-4xl font-bold">
                {round.players[dealIndex]}
              </span>
              <Badge variant="outline" className="shrink-0 border-accent/40 bg-accent/10 text-primary">
                {dealIndex + 1} / {round.players.length}
              </Badge>
            </CardTitle>
            <CardDescription className="max-w-[18rem] leading-relaxed">
              {revealed
                ? "Remember your card."
                : "Take the phone. No one else looks."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center py-3">
            {revealed ? (
              <div className="tea-reveal-card flex min-h-60 w-full flex-col items-center justify-center gap-3 px-6 text-center" data-revealed="true" role="status">
                <span className={`tea-display max-w-full break-words text-4xl font-bold leading-tight tracking-tight ${isImposter ? "text-destructive" : ""}`}>
                  {isImposter ? "You are the imposter" : round.pair.word}
                </span>
                <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {isImposter ? round.pair.imposterHint : round.pair.citizenHint}
                </p>
              </div>
            ) : (
              <button ref={revealButtonRef} type="button" onClick={() => { tapFeedback(); setRevealed(true); }}
                aria-label={`Reveal ${round.players[dealIndex]}'s private card`}
                className="tea-reveal-card flex min-h-60 w-full touch-manipulation flex-col items-center justify-center gap-3 border border-border/40 px-6 text-center">
                <LockKeyholeIcon className="size-7 text-primary" />
                <span className="tea-display text-2xl font-bold text-primary">Private card</span>
                <span className="text-sm text-muted-foreground">Tap to reveal</span>
              </button>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button ref={handoffButtonRef} disabled={!revealed} onClick={() => { tapFeedback(); nextCard(); }} className="min-h-14 w-full rounded-xl bg-accent text-base text-accent-foreground hover:bg-accent/90">
              {dealIndex === round.players.length - 1 ? "Hide & start discussion" : "Hide & pass"}
              <ArrowRightIcon />
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {revealed ? "Hide your card when you’re ready." : "Only you should see your card."}
            </p>
          </CardFooter>
        </Card>
      )}

      {/* DISCUSS */}
      {phase === "discuss" && round && !imposterShown && (
        <Card className="tea-flat-card tea-scene">
          <CardHeader className="items-center text-center">
            <div className="mb-1 flex items-center justify-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-accent">
              <SparklesIcon className="size-3.5" /> Discussion
            </div>
            <CardTitle className="tea-display text-3xl font-bold">Give a clue. Find the imposter.</CardTitle>
            <CardDescription>
              One of you only has a hint.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="w-full border-y border-accent/30 bg-accent/5 px-1 py-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                First clue from
              </p>
              <p className="tea-display text-3xl font-bold text-primary">{starterName}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Take turns giving a clue without saying the word. Discuss who
              sounds suspicious, then vote before revealing the imposter.
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
