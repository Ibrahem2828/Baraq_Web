import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { User } from "@/types/domain";
import type { RegisterInput, ForgotPasswordInput, ResetPasswordInput } from "@/lib/validation/auth";

/**
 * Register, password-reset, and password-reset-confirm are all public
 * (unauthenticated) backend calls with no cookie side effects, so — unlike
 * login/logout — they go through the generic BFF proxy rather than a
 * dedicated Route Handler. See lib/auth/server.ts for why login/logout are
 * special-cased.
 */
export function register(input: RegisterInput) {
  const { password_confirm, ...rest } = input;
  return apiClient.post<User>(endpoints.auth.register, { ...rest, password_confirm });
}

export function requestPasswordReset(input: ForgotPasswordInput) {
  return apiClient.post<{ message: string }>(endpoints.auth.passwordReset, input);
}

export function confirmPasswordReset(input: ResetPasswordInput) {
  return apiClient.post<{ message: string }>(endpoints.auth.passwordResetConfirm, {
    uid: input.uid,
    token: input.token,
    new_password: input.new_password,
  });
}

export function changePassword(input: { current_password: string; new_password: string }) {
  return apiClient.post<{ message: string }>(endpoints.auth.changePassword, input);
}
