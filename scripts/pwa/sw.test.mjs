import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("./sw.js", import.meta.url), "utf8");

function worker({ fetch = async () => new Response("online"), cached = {}, failPut = false } = {}) {
  const handlers = new Map();
  const events = [];
  const self = {
    addEventListener: (name, handler) => handlers.set(name, handler),
    skipWaiting: async () => { events.push("skipWaiting"); },
    clients: { claim: async () => { events.push("claim"); } },
    location: { origin: "https://example.com" },
  };
  const key = (request) => new URL(typeof request === "string" ? request : request.url, self.location.origin).pathname;
  const cache = {
    addAll: async (assets) => { events.push("precache"); assert.ok(assets.includes("/")); },
    match: async (request) => cached[key(request)],
    put: async (request, response) => {
      if (failPut) throw new Error("Quota exceeded");
      events.push(`put:${key(request)}`);
      cached[key(request)] = response;
    },
  };
  const caches = {
    open: async () => cache,
    keys: async () => ["teaposters-old", "teaposters-__BUILD_VERSION__", "other-app"],
    delete: async (key) => { events.push(`delete:${key}`); },
  };
  vm.runInNewContext(source, { self, caches, URL, Response, fetch });
  async function dispatch(name, data = {}) {
    const pending = [];
    let response;
    handlers.get(name)({ ...data, waitUntil: (promise) => pending.push(promise), respondWith: (promise) => { response = promise; } });
    const result = await response;
    await Promise.all(pending);
    return result;
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

const request = (path, mode = "navigate") => ({ url: `https://example.com${path}`, method: "GET", mode });

test("first install includes release bundles when generated", async () => {
  const generated = source.replace("/* __BUILD_ASSETS__ */ []", '["/_next/static/app.js", "/_next/static/app.css", "/_next/static/font.woff2"]');
  let precached;
  const handlers = new Map();
  vm.runInNewContext(generated, {
    self: { addEventListener: (name, handler) => handlers.set(name, handler) },
    caches: { open: async () => ({ addAll: async (assets) => { precached = Array.from(assets); } }) },
  });
  await new Promise((resolve, reject) => handlers.get("install")({ waitUntil: (promise) => promise.then(resolve, reject) }));
  assert.ok(precached.includes("/_next/static/app.js"));
  assert.ok(precached.includes("/_next/static/app.css"));
  assert.ok(precached.includes("/_next/static/font.woff2"));
});

test("offline navigation falls back to the cached shell", async () => {
  const { dispatch } = worker({ fetch: async () => { throw new Error("offline"); }, cached: { "/": new Response("shell") } });
  assert.equal(await (await dispatch("fetch", { request: request("/unknown") })).text(), "shell");
});

test("server failures never replace the offline shell", async () => {
  const { dispatch, events } = worker({ fetch: async () => new Response("failure", { status: 503 }), cached: { "/": new Response("shell") } });
  assert.equal(await (await dispatch("fetch", { request: request("/") })).text(), "shell");
  assert.deepEqual(events, []);
});

test("successful navigation caches its response", async () => {
  const { dispatch, events } = worker();
  assert.equal(await (await dispatch("fetch", { request: request("/") })).text(), "online");
  assert.deepEqual(events, ["put:/"]);
});

test("cache write failures do not break online navigation", async () => {
  const { dispatch } = worker({ failPut: true });
  assert.equal(await (await dispatch("fetch", { request: request("/") })).text(), "online");
});

test("precached static assets work without the network", async () => {
  const { dispatch } = worker({ fetch: async () => { throw new Error("must not fetch"); }, cached: { "/_next/static/app.js": new Response("bundle") } });
  assert.equal(await (await dispatch("fetch", { request: request("/_next/static/app.js", "cors") })).text(), "bundle");
});

test("API, RSC, other origins and non-GET requests bypass caching", async () => {
  const { dispatch } = worker({ fetch: async () => { throw new Error("must not fetch"); } });
  for (const value of [request("/api/private"), request("/?_rsc=abc", "cors"), { ...request("/"), url: "https://example.com.evil.test/" }, { ...request("/"), method: "POST" }]) {
    assert.equal(await dispatch("fetch", { request: value }), undefined);
  }
});
