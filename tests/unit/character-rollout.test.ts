import { describe, expect, it } from "vitest";
import { CHARACTERS } from "@/config/characters";

describe("character availability", () => {
  it("exposes every implemented AI character in the web UI", () => {
    for (const character of Object.values(CHARACTERS)) {
      expect(character.isLive).toBe(true);
    }
  });

  it("does not use a browser environment flag as an authorization boundary", () => {
    // Entitlement and source compatibility are enforced by Django's
    // capabilities endpoint. A public build-time variable must not hide a
    // legitimate, authorized AI workflow.
    expect(CHARACTERS.kholasa.isLive).toBe(true);
    expect(CHARACTERS.sada.isLive).toBe(true);
  });
});
