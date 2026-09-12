// Thin wrapper so the Browser-pane preview launcher (which invokes
// `node.exe <script>` directly, bypassing `npm`/shell PATH resolution) runs
// `next dev` with the correct working directory — Next's config (and the
// next-intl plugin's relative `./src/i18n/request.ts` path) resolve against
// `process.cwd()`, which must be this project root, not wherever the
// launcher's own process happens to start from.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const port = process.env.PORT ?? "3010";

const child = spawn(process.execPath, [nextBin, "dev", "-p", port], {
  cwd: projectRoot,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));
