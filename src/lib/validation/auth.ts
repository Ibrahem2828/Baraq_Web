import { z } from "zod";

/** Mirrors the backend's Django password validators (min length 10) — see docs/WEB_API_CONTRACT_MAP.md §4. */
const passwordSchema = z.string().min(10, { message: "auth.passwordTooShort" });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z.string().min(2),
    email: z.string().email(),
    phone_number: z.string().optional().or(z.literal("")),
    password: passwordSchema,
    password_confirm: z.string(),
  })
  .refine((data) => data.password === data.password_confirm, {
    path: ["password_confirm"],
    message: "auth.passwordMismatch",
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
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
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    path: ["confirm_password"],
    message: "auth.passwordMismatch",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
