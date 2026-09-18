import { describe, expect, it } from "vitest";
import { endpoints } from "@/lib/api/endpoints";
import djangoRoutes from "../contract/django-routes.json";

/**
 * Contract parity gate.
 *
 * Every path this app can build must exist on the Django backend. The
 * canonical route list is a checked-in projection of the backend's generated
 * OpenAPI contract (refresh it with `node scripts/sync-django-routes.mjs`), so
 * a backend rename that this app has not followed fails here rather than as a
 * 404 in production.
 */

const SAMPLE_ID = "42";

/** `{id}`-style Django params and `${id}`-style template slots both become `*`. */
function canonical(path: string): string {
  return path.replace(/\{[^}]+\}/gu, "*").replace(new RegExp(`/${SAMPLE_ID}(?=/|$)`, "gu"), "/*");
}

const backendPaths = new Set(djangoRoutes.paths.map(canonical));

type EndpointNode = string | ((...args: never[]) => string) | { [key: string]: EndpointNode };

/** Walks the endpoints tree, calling every path builder with a sample id. */
function collectPaths(node: EndpointNode, trail: string[] = []): Array<[string, string]> {
  if (typeof node === "string") return [[trail.join("."), node]];
  if (typeof node === "function") {
    return [[trail.join("."), (node as (id: string) => string)(SAMPLE_ID)]];
  }
  return Object.entries(node).flatMap(([key, child]) => collectPaths(child, [...trail, key]));
}

const allPaths = collectPaths(endpoints as unknown as EndpointNode);

describe("frontend/Django API contract parity", () => {
  it("covers every endpoint group", () => {
    // Guards the walker itself: a silently-empty traversal would make every
    // assertion below vacuously pass.
    expect(allPaths.length).toBeGreaterThan(60);
  });

  it.each(allPaths)("%s → %s exists on the backend", (_name, path) => {
    expect(backendPaths.has(canonical(path))).toBe(true);
  });

  it("builds every path relative to /api/v1 with Django's trailing slash", () => {
    for (const [name, path] of allPaths) {
      expect(path, name).toMatch(/^\//u);
      expect(path, name).toMatch(/\/$/u);
      expect(path, name).not.toContain("//");
      expect(path, name).not.toContain("/api/v1");
    }
  });
});
