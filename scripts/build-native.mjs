// Builds the static bundle packaged into the Android (and later iOS) app,
// then optionally copies it into the native project.
//
//   node scripts/build-native.mjs            # build only -> out/
//   node scripts/build-native.mjs --sync     # build, then `cap sync android`
//
// NEXT_PUBLIC_API_BASE_URL picks the API the app talks to (default
// https://api.baraqapp.com). The web build is untouched: this sets
// BUILD_TARGET=native, which next.config.ts turns into `output: "export"`
// with the `*.native.tsx` routes (see docs/MOBILE_APP.md).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const outDir = path.join(projectRoot, "out");

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.baraqapp.com").replace(
  /\/+$/,
  "",
);

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    env,
    shell: false,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, [nextBin, "build"], {
  ...process.env,
  BUILD_TARGET: "native",
  NEXT_PUBLIC_BUILD_TARGET: "native",
  NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
  // Links the app shares (metadata base) point at the public web app, not at
  // whatever a developer's .env.local says.
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "https://web.baraqapp.com",
});

// The entry document (scripts/native-shell/index.html) with the CSP the
// exported pages themselves carry (src/design-system/NativeHead.tsx).
const exportedHome = readFileSync(path.join(outDir, "ar", "index.html"), "utf8");
const csp = exportedHome.match(
  /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/i,
)?.[1];
if (!csp || !csp.includes(apiBaseUrl)) {
  console.error("[build-native] exported pages carry no app CSP naming", apiBaseUrl);
  process.exit(1);
}
const shell = readFileSync(path.join(projectRoot, "scripts", "native-shell", "index.html"), "utf8");
writeFileSync(path.join(outDir, "index.html"), shell.replace("%NATIVE_CSP%", csp));

// Next 16 exports per-segment prefetch payloads as nested folders
// (`ar/quizzes/__next.$d$locale/!KGFwcCk/quizzes/__PAGE__.txt`) while its
// client router requests the same file under one dotted name
// (`ar/quizzes/__next.$d$locale.!KGFwcCk.quizzes.__PAGE__.txt`). Every
// prefetch 404'd and navigation fell back to the full page payload. Write
// each one under the name that is requested (91 files, ~0.7 MB).
function* segmentPayloads(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    if (name.startsWith("__next.")) yield* nestedFiles(full, [name]);
    else yield* segmentPayloads(full);
  }
}
function* nestedFiles(dir, parts) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* nestedFiles(full, [...parts, name]);
    else yield { full, parts: [...parts, name] };
  }
}
let flattened = 0;
for (const { full, parts } of [...segmentPayloads(outDir)]) {
  const segmentRoot = full.slice(0, full.length - parts.join(path.sep).length);
  writeFileSync(path.join(segmentRoot, parts.join(".")), readFileSync(full));
  flattened += 1;
}

// The web's server-only paths must not exist in the app: every IS_NATIVE
// branch should have removed them. Finding one means a request would go to
// https://localhost/api/... and fail on a learner's phone.
function* files(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* files(full);
    else yield full;
  }
}
const leaks = [];
for (const file of files(path.join(outDir, "_next"))) {
  if (!file.endsWith(".js")) continue;
  const source = readFileSync(file, "utf8");
  for (const needle of ["/api/bff", "/api/auth/"]) {
    if (source.includes(needle)) leaks.push(`${path.relative(outDir, file)}: ${needle}`);
  }
}
if (leaks.length) {
  console.error("[build-native] web-only API paths in the app bundle:\n  " + leaks.join("\n  "));
  process.exit(1);
}
if (existsSync(path.join(outDir, "api"))) {
  console.error("[build-native] out/api exists: a route handler was exported");
  process.exit(1);
}

let bytes = 0;
let count = 0;
for (const file of files(outDir)) {
  bytes += statSync(file).size;
  count += 1;
}
console.log(
  `[build-native] out/: ${count} files, ${(bytes / 1024 / 1024).toFixed(1)} MB (${flattened} segment payloads flattened), API ${apiBaseUrl}`,
);

if (process.argv.includes("--sync")) {
  const cli = path.join(projectRoot, "node_modules", "@capacitor", "cli", "bin", "capacitor");
  run(process.execPath, [cli, "sync", "android"], process.env);
}
