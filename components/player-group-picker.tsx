"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlayerGroup } from "@/lib/player-groups";

export function PlayerGroupPicker({ groups, activeId, onSelect, onSave, onDelete }: {
  groups: PlayerGroup[];
  activeId: string;
  onSelect: (id: string) => void;
  onSave: (name: string, create: boolean) => boolean;
  onDelete: () => void;
}) {
  const [mode, setMode] = useState<"create" | "rename" | "delete" | null>(null);
  const [name, setName] = useState("");
  const active = groups.find((group) => group.id === activeId)!;

  return (
    <div className="tea-group-picker flex flex-col gap-2 border-b border-border/40 pb-2">
      {!mode && <>
      <Label htmlFor="player-group">Player group</Label>
      <div className="relative w-full">
        <select
          id="player-group"
          value={activeId}
          onChange={(event) => { onSelect(event.target.value); setMode(null); }}
          className="h-12 w-full min-w-0 appearance-none rounded-xl border border-border/60 bg-background py-2 pl-3 pr-12 text-base text-foreground"
        >
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
        <ChevronDownIcon aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-11" variant="secondary" onClick={() => { setMode("create"); setName(""); }}>New group</Button>
        <Button className="min-h-11" variant="ghost" onClick={() => { setMode("rename"); setName(active.name); }}>Rename</Button>
        <Button className="min-h-11" variant="ghost" disabled={groups.length < 2} onClick={() => setMode("delete")}>Delete</Button>
      </div>
      </>}
      {(mode === "create" || mode === "rename") && (
        <form className="flex flex-col gap-2" onSubmit={(event) => {
          event.preventDefault();
          if (onSave(name, mode === "create")) setMode(null);
        }}>
          <Label htmlFor="group-name">{mode === "create" ? "New group name" : "Group name"}</Label>
          <Input id="group-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} placeholder="Friends, family, work…" autoFocus className="h-12 text-base" />
          <div className="flex gap-2">
            <Button className="min-h-11" type="submit" disabled={!name.trim()}>{mode === "create" ? "Create group" : "Save name"}</Button>
            <Button className="min-h-11" type="button" variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
          </div>
        </form>
      )}
      {mode === "delete" && (
        <div className="flex flex-col gap-2">
          <p className="break-words text-sm">Delete “{active.name}” and its saved player list?</p>
          <div className="flex gap-2">
            <Button className="min-h-11" variant="destructive" onClick={() => { onDelete(); setMode(null); }}>Delete group</Button>
            <Button className="min-h-11" variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
          </div>
        </div>
      )}
      <p className="tea-group-help text-xs text-muted-foreground">Each group remembers its players, selection and pass order on this device.</p>
    </div>
  );
}
