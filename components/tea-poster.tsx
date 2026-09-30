"use client";

import {
    ArrowRightIcon,
    PlusIcon,
    UsersIcon,
} from "lucide-react";
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

import { DealScreen } from "@/components/game/deal-screen";
import { DiscussionScreen } from "@/components/game/discussion-screen";
import { GameHeader } from "@/components/game/game-header";
import { PhaseSteps } from "@/components/game/phase-steps";
import { PlayerRoster } from "@/components/game/player-roster";
import type { Phase, Round } from "@/components/game/types";
import { PlayerGroupPicker } from "@/components/player-group-picker";
import { loadPlayerGroups, PLAYER_GROUPS_KEY, type PlayerGroup } from "@/lib/player-groups";

import { TeaPosterSplash } from "@/components/tea-poster-splash";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { randomIndex } from "@/lib/random";
import { haptic } from "@/lib/haptics";
import { claimLocalWord } from "@/lib/store";
import { useScreenWakeLock } from "@/lib/use-screen-wake-lock";

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

  useEffect(() => {
    if (phase !== "deal") return;
    revealButtonRef.current?.focus({ preventScroll: true });
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
    haptic("success");
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
    if (name.length > 24) {
      toast.error("Player names can have up to 24 characters.");
      return;
    }
    if (players.length >= 24) {
      toast.error("A round can have up to 24 players.");
      return;
    }
    if (players.some((p) => p.toLowerCase() === name.toLowerCase())) {
      toast.error(`${name} is already on the list.`);
      return;
    }
    haptic("selection");
    setPlayers((prev) => [...prev, name]);
    setChecked((prev) => ({ ...prev, [name]: true }));
    setNewPlayer("");
  }, [newPlayer, players, setPlayers, setChecked]);

  const removePlayer = useCallback((name: string) => {
    const groupId = playerGroups.activeId;
    haptic("selection");
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
            if (group.id !== groupId || group.players.length >= 24 || group.players.some((player) => player.toLowerCase() === name.toLowerCase())) return group;
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
    haptic("selection");

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
      if (next) haptic("selection");
      setDropTarget(next);
    },
    []
  );

  const beginPlayerDrag = useCallback((name: string, event: React.PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || dragPointerIdRef.current !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    haptic("pickup");
    dragClientYRef.current = event.clientY;
    dragPointerIdRef.current = event.pointerId;
    draggedPlayerRef.current = name;
    capturePlayerPositions();
    setDraggedPlayer(name);
    setCurrentDropTarget(null);
  }, [capturePlayerPositions, setCurrentDropTarget]);

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

  const updatePlayerDrag = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragPointerIdRef.current !== event.pointerId || !draggedPlayerRef.current) return;
    event.preventDefault();
    dragClientYRef.current = event.clientY;
    setCurrentDropTarget(getDropTargetAt(event.clientY, draggedPlayerRef.current));
  }, [getDropTargetAt, setCurrentDropTarget]);

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
      haptic("drop");

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
    haptic("tap");
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
      <div className="tea-viewport tea-page-frame flex min-h-dvh flex-col pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-12">
      <GameHeader phase={phase} onReset={resetGame} />

      {imposterShown ? (
        <p className="mb-5 text-center text-xs font-medium text-muted-foreground">Round complete</p>
      ) : phase !== "setup" && (
        <PhaseSteps phase={phase} />
      )}

      <div className="tea-content flex-1">
      {/* SETUP */}
      {phase === "setup" && (
        <Card className="tea-flat-card tea-setup tea-scene">
          <div className="tea-setup-intro">
            <h2 className="tea-display">Who’s playing?</h2>
          </div>
          <CardContent className="flex flex-col gap-3 px-0">
            {playerSetupLoaded && <PlayerGroupPicker
              groups={playerGroups.groups}
              activeId={playerGroups.activeId}
              onSelect={(activeId) => {
                haptic("selection");
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
                haptic("success");
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
                <h3 className="text-sm font-semibold">Your players</h3>
                <p className="tea-list-meta">Select players · drag to set pass order</p>
              </div>
              <span className="tea-player-count"><UsersIcon className="size-3.5" />{activePlayers.length} / {players.length}</span>
            </div>
            <PlayerRoster
              key={playerGroups.activeId}
              players={players}
              activePlayers={activePlayers}
              checked={checked}
              draggedPlayer={draggedPlayer}
              dropTarget={dropTarget}
              playerListRef={playerListRef}
              setPlayerRowRef={(name, element) => {
                if (element) playerRowRefs.current.set(name, element);
                else playerRowRefs.current.delete(name);
              }}
              onDragStart={beginPlayerDrag}
              onDragMove={updatePlayerDrag}
              onDragEnd={endPlayerDrag}
              onCheckedChange={(name, value) => {
                haptic("selection");
                setChecked((prev) => ({ ...prev, [name]: value }));
              }}
              movePlayer={movePlayer}
              removePlayer={removePlayer}
            />


            <form
              className="tea-add-player flex items-center gap-2"
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
                className="h-12 min-w-0 flex-1 rounded-xl border-border/60 bg-background text-base"
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

      {phase === "deal" && round && (
        <DealScreen
          round={round}
          dealIndex={dealIndex}
          revealed={revealed}
          isImposter={isImposter}
          revealButtonRef={revealButtonRef}
          onReveal={() => setRevealed(true)}
          onNext={nextCard}
        />
      )}

      {phase === "discuss" && round && (
        <DiscussionScreen
          round={round}
          starterName={starterName}
          imposterShown={imposterShown}
          onRevealImposter={() => setImposterShown(true)}
          onPlayAgain={startRound}
          onChangePlayers={backToSetup}
        />
      )}

      {phase === "setup" && (
        <div className="mobile-dock pointer-events-none z-20">
          <div className="pointer-events-auto">
            <Button
              className="min-h-14 w-full rounded-xl bg-accent text-base font-semibold text-accent-foreground hover:bg-accent/90"
              size="lg"
              onClick={startRound}
              disabled={activePlayers.length < 3}
            >
              <span>{activePlayers.length < 3 ? "Select at least 3 players" : "Let’s play"}</span>
              <span className="tea-start-meta">{activePlayers.length >= 3 && `${activePlayers.length} players`}<ArrowRightIcon className="size-4" /></span>
            </Button>
          </div>
        </div>
      )}
      </div>
      </div>
    </main>
  );
}
