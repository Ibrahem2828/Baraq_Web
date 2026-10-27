// Serves out/ the way Capacitor's Android WebViewLocalServer does, so the
// app build can be exercised in a desktop browser (and by
// tests/e2e/native-app.spec.ts) without a phone:
//
//  - `/`, and any path whose last segment has no ".", gets /index.html
//    (Capacitor's html5mode; here that is scripts/native-shell/index.html);
//  - anything else is the file at that path, or 404.
//
//   node scripts/serve-native.mjs [port]      (default 3030)
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.join(projectRoot, "out");
const port = Number(process.argv[2] ?? process.env.PORT ?? 3030);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const pathname = decodeURIComponent(url.pathname);
  const lastSegment = pathname.split("/").filter(Boolean).pop() ?? "";
  const relative = pathname === "/" || !lastSegment.includes(".") ? "/index.html" : pathname;
  const file = path.join(root, relative);
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  response.end(readFileSync(file));
}).listen(port, "127.0.0.1", () => {
  console.log(`[serve-native] out/ on http://localhost:${port} (Capacitor path rules)`);
});
