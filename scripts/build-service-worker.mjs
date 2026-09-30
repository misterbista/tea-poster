import { randomUUID } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";

// Run after Next builds: the first install needs the actual release's bundles.
const staticRoot = new URL("../.next/static/", import.meta.url);
async function assets(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) return assets(new URL(`${entry.name}/`, directory), `${path}/`);
    return entry.isFile() && !entry.name.endsWith(".map")
      ? [`/_next/static/${path.split("/").map(encodeURIComponent).join("/")}`]
      : [];
  }));
  return files.flat();
}
const bundles = (await assets(staticRoot)).sort();
if (!bundles.some((path) => path.endsWith(".js")) || !bundles.some((path) => path.endsWith(".css"))) {
  throw new Error("Build the app before generating its offline service worker.");
}
const template = await readFile(new URL("./pwa/sw.js", import.meta.url), "utf8");
await writeFile(
  new URL("../public/sw.js", import.meta.url),
  template.replace("__BUILD_VERSION__", randomUUID())
    .replace("/* __BUILD_ASSETS__ */ []", JSON.stringify(bundles)),
);
console.log(`Generated the production service worker with ${bundles.length} release assets.`);
