// @vitest-environment node
import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Node's http.Server allows a request 5 minutes to arrive in full; a textbook
 * over a slow connection needs longer. The production image preloads
 * server-timeouts.cjs (see Dockerfile) to raise it for Next's server.
 */
describe("server-timeouts.cjs", () => {
  const root = path.resolve(__dirname, "../..");
  const read = (env: Record<string, string> = {}) =>
    execFileSync(
      process.execPath,
      ["--require", "./server-timeouts.cjs", "-e",
        "const s=require('node:http').createServer();console.log(s.requestTimeout, s.headersTimeout)"],
      { cwd: root, env: { ...process.env, ...env }, encoding: "utf8" },
    ).trim();

  it("gives a request 30 minutes and leaves the header timeout alone", () => {
    expect(read()).toBe(`${30 * 60 * 1000} 60000`);
  });

  it("can be tuned with HTTP_REQUEST_TIMEOUT_MS", () => {
    expect(read({ HTTP_REQUEST_TIMEOUT_MS: "600000" }).split(" ")[0]).toBe("600000");
  });

  it("is what the production image starts with", async () => {
    const { readFileSync } = await import("node:fs");
    const dockerfile = readFileSync(path.join(root, "Dockerfile"), "utf8");
    expect(dockerfile).toContain('CMD ["node", "--require", "./server-timeouts.cjs", "server.js"]');
    expect(dockerfile).toContain("/app/server-timeouts.cjs ./server-timeouts.cjs");
  });
});
