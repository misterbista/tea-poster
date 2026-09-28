export type PlayerGroup = {
  id: string;
  name: string;
  players: string[];
  checked: Record<string, boolean>;
};
export type PlayerGroups = { groups: PlayerGroup[]; activeId: string };
export const PLAYER_GROUPS_KEY = "tea-posters-player-groups";

function roster(value: unknown): Pick<PlayerGroup, "players" | "checked"> | null {
  if (!value || typeof value !== "object" || !("players" in value) || !Array.isArray(value.players)) return null;
  const players = [...new Map(value.players
    .filter((name): name is string => typeof name === "string" && !!name.trim() && name.trim().length <= 24)
    .map((name) => [name.trim().toLowerCase(), name.trim()])).values()].slice(0, 24);
  const checked = "checked" in value && value.checked && typeof value.checked === "object" ? value.checked : {};
  return { players, checked: Object.fromEntries(players.map((name) => [name, Object.hasOwn(checked, name) ? Reflect.get(checked, name) === true : true])) };
}

export function loadPlayerGroups(saved: string | null, legacy: string | null, defaults: string[]): PlayerGroups {
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const groups: PlayerGroup[] = [];
      if (Array.isArray(parsed?.groups)) {
        for (const group of parsed.groups) {
          const members = roster(group);
          if (!members || typeof group.id !== "string" || !group.id || typeof group.name !== "string" || !group.name.trim()) continue;
          if (groups.some((existing) => existing.id === group.id)) continue;
          groups.push({ id: group.id, name: group.name.trim().slice(0, 40), ...members });
        }
      }
      if (groups.length) return { groups, activeId: groups.some((group) => group.id === parsed.activeId) ? parsed.activeId : groups[0].id };
    } catch { /* Fall back to the previous player list. */ }
  }
  let members = { players: defaults, checked: Object.fromEntries(defaults.map((name) => [name, true])) };
  try { members = roster(JSON.parse(legacy ?? "null")) ?? members; } catch { /* Use defaults for damaged storage. */ }
  return { groups: [{ id: "default", name: "My group", ...members }], activeId: "default" };
}
