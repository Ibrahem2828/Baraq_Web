import { z } from "zod";

/** Mirrors the backend's Django password validators (min length 10) — see docs/WEB_API_CONTRACT_MAP.md §4. */
const passwordSchema = z.string().min(10, { message: "auth.passwordTooShort" });

// Messages are i18n keys, resolved by `validationMessage()` -- so an empty
// field and a malformed one no longer both read "This field is required".
const REQUIRED = { message: "common.requiredField" };
const emailSchema = z.string().trim().min(1, REQUIRED).email({ message: "auth.invalidEmail" });
/** Loose on purpose: the backend owns the real rule; this only catches obvious typos. */
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s()-]{7,20}$/, { message: "auth.invalidPhone" })
  .optional()
  .or(z.literal(""));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, REQUIRED),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, REQUIRED),
    email: emailSchema,
    phone_number: phoneSchema,
    password: passwordSchema,
    password_confirm: z.string().min(1, REQUIRED),
  })
  .refine((data) => data.password === data.password_confirm, {
    path: ["password_confirm"],
    message: "auth.passwordMismatch",
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const verifyEmailOtpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, { message: "auth.verifyEmail.invalidCode" }),
});
export type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpSchema>;

export const resetPasswordSchema = z
  .object({
    uid: z.string().min(1),
    token: z.string().min(1),
    new_password: passwordSchema,
    confirm_password: z.string().min(1, REQUIRED),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    path: ["confirm_password"],
    message: "auth.passwordMismatch",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
