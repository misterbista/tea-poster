import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const template = await readFile(new URL("./pwa/sw.js", import.meta.url), "utf8");
await writeFile(
  new URL("../public/sw.js", import.meta.url),
  template.replace("__BUILD_VERSION__", randomUUID()),
);
console.log("Generated the production service worker.");
