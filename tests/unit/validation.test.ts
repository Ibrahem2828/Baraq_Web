import { describe, expect, it } from "vitest";
import { registerSchema, loginSchema } from "@/lib/validation/auth";

describe("registerSchema", () => {
  const base = {
    full_name: "Sara Ahmad",
    email: "sara@example.com",
    phone_number: "",
    password: "correct-horse-battery",
    password_confirm: "correct-horse-battery",
  };

  it("accepts a valid registration payload", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({ ...base, password_confirm: "different" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["password_confirm"]);
    }
  });

  it("rejects a password shorter than the backend's minimum (10 chars)", () => {
    const result = registerSchema.safeParse({
      ...base,
      password: "short1",
      password_confirm: "short1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({ ...base, email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a non-empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});
