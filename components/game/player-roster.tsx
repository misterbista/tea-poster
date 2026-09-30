"use client";

import { ChevronDownIcon, ChevronUpIcon, GripVerticalIcon, Trash2Icon } from "lucide-react";
import type { PointerEvent, RefObject } from "react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type DropTarget = { name: string; after: boolean } | null;

export function PlayerRoster({ players, activePlayers, checked, draggedPlayer, dropTarget, playerListRef, setPlayerRowRef, onDragStart, onDragMove, onDragEnd, onCheckedChange, movePlayer, removePlayer }: {
  players: string[];
  activePlayers: string[];
  checked: Record<string, boolean>;
  draggedPlayer: string | null;
  dropTarget: DropTarget;
  playerListRef: RefObject<HTMLDivElement | null>;
  setPlayerRowRef: (name: string, element: HTMLDivElement | null) => void;
  onDragStart: (name: string, event: PointerEvent<HTMLButtonElement>) => void;
  onDragMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onDragEnd: (event: PointerEvent<HTMLButtonElement>, shouldMove: boolean) => void;
  onCheckedChange: (name: string, value: boolean) => void;
  movePlayer: (name: string, direction: -1 | 1, animate: boolean) => void;
  removePlayer: (name: string) => void;
}) {
  return <div ref={playerListRef} role="list" aria-label="Pass order" tabIndex={0} className="tea-player-list">
    {players.map((name) => <div key={name} ref={(element) => setPlayerRowRef(name, element)} role="listitem" data-drop-position={dropTarget?.name === name ? (dropTarget.after ? "after" : "before") : undefined} data-dragging={draggedPlayer === name ? "true" : undefined} className="tea-player-row group flex min-h-14 items-center gap-2 border-b border-border/30 px-0 py-1.5" data-selected={!!checked[name]}>
      <button type="button" aria-label={`Drag ${name} to reorder`} className="tea-order-grip grid size-11 shrink-0 place-items-center rounded-xl disabled:pointer-events-none disabled:opacity-35" onPointerDown={(event) => onDragStart(name, event)} onPointerMove={onDragMove} onPointerUp={(event) => onDragEnd(event, true)} onPointerCancel={(event) => onDragEnd(event, false)} onLostPointerCapture={(event) => onDragEnd(event, false)}><GripVerticalIcon className="size-4.5" /></button>
      <Checkbox id={`player-${name}`} checked={!!checked[name]} onCheckedChange={(value) => onCheckedChange(name, value === true)} />
      <div className="min-w-0 flex-1"><Label htmlFor={`player-${name}`} className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">{name}</Label></div>
      {checked[name] && <span className="tea-player-order">{String(activePlayers.indexOf(name) + 1).padStart(2, "0")}</span>}
      <ActionMenu label={`Actions for ${name}`} actions={[{ label: "Move up", icon: <ChevronUpIcon />, disabled: players.indexOf(name) === 0, onClick: () => movePlayer(name, -1, false) }, { label: "Move down", icon: <ChevronDownIcon />, disabled: players.indexOf(name) === players.length - 1, onClick: () => movePlayer(name, 1, false) }, { label: "Remove player", icon: <Trash2Icon />, destructive: true, onClick: () => removePlayer(name) }]} />
    </div>)}
  </div>;
}
