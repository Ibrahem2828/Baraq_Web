// `next.config.ts` sets `output: "standalone"` (a small, self-contained
// production bundle suitable for the Docker deployment this repo's sibling
// apps already use — see Baraq_Dashboard_Professional's Dockerfile). Next.js
// explicitly does not support `next start` against a standalone build (it
// warns and refuses); the documented way to run one is
// `node .next/standalone/server.js`. That server only serves what's inside
// `.next/standalone/` though — `public/` and `.next/static/` are not copied
// there automatically by `next build`, so this script copies both (fresh,
// every run — cheap relative to the build itself) before starting the
// server. This mirrors what a production Dockerfile's final `COPY` layers
// would do, so `npm start` behaves the same locally as it will in the
// container.
import { spawn } from "node:child_process";
import { existsSync, cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const serverEntry = path.join(standaloneDir, "server.js");

if (!existsSync(serverEntry)) {
  console.error(
    `Standalone server not found at ${serverEntry}.\n` +
      'Run "npm run build" first (output: "standalone" in next.config.ts requires it).',
  );
  process.exit(1);
}

const staticSrc = path.join(projectRoot, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");
if (existsSync(staticSrc)) {
  rmSync(staticDest, { recursive: true, force: true });
  mkdirSync(path.dirname(staticDest), { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
}

const publicSrc = path.join(projectRoot, "public");
const publicDest = path.join(standaloneDir, "public");
if (existsSync(publicSrc)) {
  rmSync(publicDest, { recursive: true, force: true });
  cpSync(publicSrc, publicDest, { recursive: true });
}

const port = process.env.PORT ?? "3000";
const child = spawn(process.execPath, [serverEntry], {
  cwd: standaloneDir,
  stdio: "inherit",
  env: { ...process.env, PORT: port },
});

child.on("exit", (code) => process.exit(code ?? 0));
