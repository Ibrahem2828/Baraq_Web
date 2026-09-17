"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  register,
  requestPasswordReset,
  confirmPasswordReset,
  changePassword,
  resendOtp,
  deleteAccount,
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

export function useResendOtp() {
  return useMutation({ mutationFn: resendOtp });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => queryClient.clear(),
  });
}
