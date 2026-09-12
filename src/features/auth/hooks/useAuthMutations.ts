"use client";

import { useMutation } from "@tanstack/react-query";
import {
  register,
  requestPasswordReset,
  confirmPasswordReset,
  changePassword,
} from "../api/authApi";

export function useRegister() {
  return useMutation({ mutationFn: register });
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset });
}

export function useConfirmPasswordReset() {
  return useMutation({ mutationFn: confirmPasswordReset });
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword });
}
