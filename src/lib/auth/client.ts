"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CSRF_COOKIE } from "@/lib/auth/cookie-names";
import { readClientCookie } from "@/lib/utils/cookies-client";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query/keys";
import { fromErrorEnvelope, fromNetworkError } from "@/lib/api/errors";
import type { ErrorEnvelope, SuccessEnvelope } from "@/lib/api/envelope";
import type { User } from "@/types/domain";

async function ensureCsrfToken(): Promise<string> {
  const existing = readClientCookie(CSRF_COOKIE);
  if (existing) return existing;
  const response = await fetch("/api/auth/csrf", { credentials: "same-origin" });
  const json = await response.json();
  return json.data.csrfToken as string;
}

/**
 * Same error normalization as `apiClient` (`lib/api/client.ts`) — a real
 * `ApiError` with `code`/`fieldErrors`/`backendCode`, not a bare `Error` —
 * so callers (login/verify-email forms) can branch on the actual failure
 * instead of every error collapsing into one generic message.
 */
async function postJson<T>(url: string, body: unknown): Promise<T> {
  const csrfToken = await ensureCsrfToken();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw fromNetworkError(error);
  }

  if (!response.ok) {
    const envelope = (await response.json().catch(() => null)) as ErrorEnvelope | null;
    throw fromErrorEnvelope(envelope, response.status, response.headers);
  }

  const envelope = (await response.json()) as SuccessEnvelope<T>;
  return envelope.data;
}

/** Reports whether an access/refresh cookie is present. Cheap, no backend call. */
export function useSession() {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: () => fetch("/api/auth/session").then((response) => response.json()),
    select: (json) => json.data.authenticated as boolean,
    staleTime: 60_000,
  });
}

/** The authenticated user's profile — only fetched once a session cookie is present. */
export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: () => apiClient.get<User>(endpoints.users.me),
    enabled,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      postJson<{ user: User }>("/api/auth/login", input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.me(), data.user);
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    },
  });
}

/** Verifies a registration email-OTP code. On success the backend logs the user in directly, same as `useLogin`. */
export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; code: string }) =>
      postJson<{ user: User }>("/api/auth/verify-email", input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.me(), data.user);
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postJson("/api/auth/logout", {}),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
