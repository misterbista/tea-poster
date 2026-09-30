import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("./haptics.ts", import.meta.url), "utf8");
function haptics({ vibrate, hidden = false } = {}) {
  const cjsContainer = { exports: {} };
  let now = 100;
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, {
    exports: cjsContainer.exports,
    navigator: vibrate ? { vibrate } : {},
    document: { visibilityState: hidden ? "hidden" : "visible" },
    performance: { now: () => now },
  });
  return { haptic: cjsContainer.exports.haptic, advance: (ms) => { now += ms; } };
}

test("maps light taps and player pickup to short vibrations", () => {
  const patterns = [];
  const { haptic } = haptics({ vibrate: (pattern) => (patterns.push(pattern), true) });
  assert.equal(haptic("tap"), true);
  assert.equal(patterns[0], 8);
});
test("uses a distinct pattern for a successful reorder", () => {
  const patterns = [];
  const { haptic, advance } = haptics({ vibrate: (pattern) => (patterns.push(pattern), true) });
  assert.equal(haptic("drop"), true);
  advance(50);
  assert.equal(haptic("success"), true);
  assert.deepEqual(Array.from(patterns[0]), [10, 28, 12]);
  assert.deepEqual(Array.from(patterns[1]), [10, 36, 16]);
});
test("throttles rapid cues and stays quiet when unsupported or hidden", () => {
  let calls = 0;
  const { haptic, advance } = haptics({ vibrate: () => (calls++, true) });
  haptic("selection");
  assert.equal(haptic("selection"), false);
  assert.equal(calls, 1);
  advance(50);
  assert.equal(haptics({ hidden: true, vibrate: () => (calls++, true) }).haptic("tap"), false);
  assert.equal(haptics().haptic("tap"), false);
  assert.equal(calls, 1);
});
test("contains vibration API failures", () => {
  const { haptic } = haptics({ vibrate: () => { throw new Error("unsupported"); } });
  assert.equal(haptic("tap"), false);
});
