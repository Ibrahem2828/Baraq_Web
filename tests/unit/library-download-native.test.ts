import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The app build has no BFF and no cookie to hand a plain link, so a class
 * library file gets no download link there; the web keeps its same-origin
 * download. The literal `/api/bff` must also be absent from the app bundle
 * (scripts/build-native.mjs fails the build when it is present).
 */
async function loadHref(target: "web" | "native") {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_BUILD_TARGET", target);
  return (await import("@/features/class-library/api/classLibraryApi")).libraryDownloadHref;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("libraryDownloadHref", () => {
  it("is the same-origin BFF download on the web", async () => {
    const href = await loadHref("web");
    expect(href("11111111-1111-1111-1111-111111111111")).toBe(
      "/api/bff/class-library/11111111-1111-1111-1111-111111111111/download/",
    );
  });

  it("is null in the app, so no link is rendered", async () => {
    const href = await loadHref("native");
    expect(href("11111111-1111-1111-1111-111111111111")).toBeNull();
  });
});
