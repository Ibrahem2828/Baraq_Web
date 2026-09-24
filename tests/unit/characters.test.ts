import { describe, expect, it } from "vitest";
import {
  CHARACTERS,
  CHARACTER_LIST,
  getCharacter,
  getCharacterByTaskType,
} from "@/config/characters";

describe("canonical character configuration", () => {
  it("uses the canonical Arabic name رشيد for the rasheed key, not the mobile app's legacy رفيق", () => {
    expect(CHARACTERS.rasheed.name).toBe("رشيد");
    expect(CHARACTERS.rasheed.name).not.toBe("رفيق");
  });

  it("defines exactly the 5 canonical characters", () => {
    expect(Object.keys(CHARACTERS).sort()).toEqual(
      ["fahes", "khota", "kholasa", "rasheed", "sada"].sort(),
    );
    expect(CHARACTER_LIST).toHaveLength(5);
  });

  it("marks all implemented characters as live while backend capabilities enforce entitlement", () => {
    for (const character of CHARACTER_LIST) {
      expect(character.isLive).toBe(true);
    }
  });

  it("getCharacter returns the matching definition", () => {
    expect(getCharacter("fahes").slug).toBe("fahes");
  });

  it("getCharacterByTaskType resolves the character that owns a given AI task type", () => {
    expect(getCharacterByTaskType("kholasa_generate_summary")?.key).toBe("kholasa");
    expect(getCharacterByTaskType("rasheed_recommendations")?.key).toBe("rasheed");
  });
});
