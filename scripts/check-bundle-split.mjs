// After `npm run build` (the web): the browser bundle must contain none of
// the mobile app's code. That code is reachable only behind
// NEXT_PUBLIC_BUILD_TARGET === "native" (see next.config.ts and
// src/lib/auth/load-native-session.ts); if a change turns one of those
// build-time conditions into a runtime one, the app's token handling ships
// to every web visitor. scripts/build-native.mjs checks the reverse.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chunks = path.join(projectRoot, ".next", "static");

// Strings that exist only in the app's modules.
const MARKERS = [
  "SecureStorage",
  "setKeyPrefix",
  "SessionUnavailableError",
  "view?id=",
  "baraq_locale",
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* files(full);
    else if (full.endsWith(".js")) yield full;
  }
}

const found = [];
for (const file of files(chunks)) {
  const source = readFileSync(file, "utf8");
  for (const marker of MARKERS) {
    if (source.includes(marker)) found.push(`${path.relative(projectRoot, file)}: ${marker}`);
  }
}
if (found.length) {
  console.error("[check-bundle-split] mobile-app code in the web bundle:\n  " + found.join("\n  "));
  process.exit(1);
}
console.log("[check-bundle-split] web bundle carries no mobile-app code");
