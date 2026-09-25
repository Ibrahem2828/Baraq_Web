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

describe("validation messages are specific i18n keys", () => {
  const messageOf = (result: ReturnType<typeof loginSchema.safeParse>, field: string) =>
    result.success ? undefined : result.error.issues.find((issue) => issue.path[0] === field)?.message;

  it("tells an empty email apart from a malformed one", () => {
    expect(messageOf(loginSchema.safeParse({ email: "", password: "x" }), "email")).toBe(
      "common.requiredField",
    );
    expect(messageOf(loginSchema.safeParse({ email: "not-an-email", password: "x" }), "email")).toBe(
      "auth.invalidEmail",
    );
  });

  it("requires the password confirmation even when the password itself is invalid", () => {
    const result = registerSchema.safeParse({
      full_name: "Sara Ahmad",
      email: "sara@example.com",
      phone_number: "",
      password: "short",
      password_confirm: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirm = result.error.issues.find((issue) => issue.path[0] === "password_confirm");
      expect(confirm?.message).toBe("common.requiredField");
    }
  });

  it("rejects an obviously wrong phone number but keeps it optional", () => {
    const base = {
      full_name: "Sara Ahmad",
      email: "sara@example.com",
      password: "correct-horse-battery",
      password_confirm: "correct-horse-battery",
    };
    expect(registerSchema.safeParse({ ...base, phone_number: "" }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, phone_number: "+963 944 123 456" }).success).toBe(true);
    const bad = registerSchema.safeParse({ ...base, phone_number: "12" });
    expect(bad.success).toBe(false);
  });
});
