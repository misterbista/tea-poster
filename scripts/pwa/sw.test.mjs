import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("./sw.js", import.meta.url), "utf8");

function worker() {
  const handlers = new Map();
  const events = [];
  const self = {
    addEventListener: (name, handler) => handlers.set(name, handler),
    skipWaiting: async () => { events.push("skipWaiting"); },
    clients: { claim: async () => { events.push("claim"); } },
    location: { origin: "https://example.com" },
  };
  const caches = {
    open: async () => ({ addAll: async () => { events.push("precache"); } }),
    keys: async () => ["teaposters-old", "teaposters-__BUILD_VERSION__", "other-app"],
    delete: async (key) => { events.push(`delete:${key}`); },
  };
  vm.runInNewContext(source, { self, caches, URL });
  async function dispatch(name, data = {}) {
    const pending = [];
    handlers.get(name)({ ...data, waitUntil: (promise) => pending.push(promise) });
    await Promise.all(pending);
  }
  return { events, dispatch };
}

test("install precaches without interrupting the active worker", async () => {
  const { events, dispatch } = worker();
  await dispatch("install");
  assert.deepEqual(events, ["precache"]);
});

test("only an explicit update acceptance skips waiting", async () => {
  const { events, dispatch } = worker();
  await dispatch("message", { data: { type: "UNKNOWN" } });
  assert.deepEqual(events, []);
  await dispatch("message", { data: { type: "SKIP_WAITING" } });
  assert.deepEqual(events, ["skipWaiting"]);
});

test("activation preserves unrelated and current caches, then claims clients", async () => {
  const { events, dispatch } = worker();
  await dispatch("activate");
  assert.deepEqual(events, ["delete:teaposters-old", "claim"]);
});
