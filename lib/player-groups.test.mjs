import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("./player-groups.ts", import.meta.url), "utf8");
const { loadPlayerGroups } = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`);

test("migrates legacy order and selection without restoring removed players", () => {
  const result = loadPlayerGroups(null, JSON.stringify({ players: ["Bina", "Asha"], checked: { Bina: false, Asha: true } }), ["Default"]);
  assert.deepEqual(result.groups[0], { id: "default", name: "My group", players: ["Bina", "Asha"], checked: { Bina: false, Asha: true } });
});

test("round trip preserves each group's roster, selection, and active group", () => {
  const state = { activeId: "family", groups: [
    { id: "friends", name: "Friends", players: ["Asha", "Bina"], checked: { Asha: true, Bina: false } },
    { id: "family", name: "Family", players: ["Bina", "Asha"], checked: { Bina: true, Asha: false } },
  ] };
  assert.deepEqual(loadPlayerGroups(JSON.stringify(state), null, []), state);
});

test("empty groups survive reload instead of being replaced with default players", () => {
  const state = { activeId: "empty", groups: [{ id: "empty", name: "New friends", players: [], checked: {} }] };
  assert.deepEqual(loadPlayerGroups(JSON.stringify(state), null, ["Default"]), state);
});

test("invalid data falls back to legacy, then defaults", () => {
  assert.deepEqual(loadPlayerGroups("broken", JSON.stringify({ players: ["Asha"] }), []).groups[0].players, ["Asha"]);
  assert.deepEqual(loadPlayerGroups("null", "broken", ["Default"]).groups[0].players, ["Default"]);
});

test("repairs a missing selection and removes duplicate IDs and invalid members", () => {
  const result = loadPlayerGroups(JSON.stringify({ activeId: "missing", groups: [
    null,
    { id: "one", name: "Friends", players: [" Asha ", "asha", "", 123, "Bina"], checked: { Bina: false } },
    { id: "one", name: "Duplicate", players: [] },
  ] }), null, []);
  assert.equal(result.activeId, "one");
  assert.equal(result.groups.length, 1);
  assert.deepEqual(result.groups[0].players, ["asha", "Bina"]);
  assert.deepEqual(result.groups[0].checked, { asha: true, Bina: false });
});
