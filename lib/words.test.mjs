import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./words.ts", import.meta.url), "utf8");
async function loadWords(words) {
  const deck = { categories: [{ category: "Food", words }] };
  const script = source.replace('import deck from "./words.json";', `const deck = ${JSON.stringify(deck)};`);
  const result = ts.transpileModule(script, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(result).toString("base64")}`);
}
const entry = { word: "Momo", citizenHint: "A popular steamed snack", imposterHint: "A food" };

test("accepts valid hints and preserves stable word IDs", async () => {
  const { WORD_PAIRS } = await loadWords([entry]);
  assert.equal(WORD_PAIRS[0].id, "nepal:momo");
});
test("rejects answer leaks anywhere in either hint", async () => {
  for (const field of ["citizenHint", "imposterHint"]) {
    await assert.rejects(loadWords([{ ...entry, [field]: "A popular food called Momo" }]), /Invalid or duplicate entry/);
  }
});
test("detects normalized Unicode answer leaks", async () => {
  await assert.rejects(loadWords([{ ...entry, word: "Café", citizenHint: "Visit the local Cafe\u0301" }]), /Invalid or duplicate entry/);
});
test("rejects duplicate words and empty decks", async () => {
  await assert.rejects(loadWords([entry, { ...entry, word: "momo" }]), /Invalid or duplicate entry/);
  await assert.rejects(loadWords([]), /must not be empty/);
});
