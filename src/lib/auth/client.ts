"use client";

import { loadNativeSession } from "@/lib/auth/load-native-session";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CSRF_COOKIE } from "@/lib/auth/cookie-names";
import { readClientCookie } from "@/lib/utils/cookies-client";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query/keys";
import { fromErrorEnvelope, fromNetworkError } from "@/lib/api/errors";
import type { ErrorEnvelope, SuccessEnvelope } from "@/lib/api/envelope";
import type { User } from "@/types/domain";

// The app build (scripts/build-native.mjs) or the web one. Read here, not
// imported: Next inlines the literal, so the other build's branch is
// removed from this bundle (see docs/MOBILE_APP.md).
const IS_NATIVE = process.env.NEXT_PUBLIC_BUILD_TARGET === "native";

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

/**
 * The app's login and email verification: the same backend endpoints the
 * web's /api/auth routes call, with the tokens kept by lib/auth/native-session
 * instead of being written into HttpOnly cookies. Only `user` reaches the UI.
 */
async function nativeSignIn(path: string, body: unknown): Promise<{ user: User }> {
  // Dynamic: the web bundle must not contain the app's token handling.
  const { apiUrl, saveTokens } = await loadNativeSession();
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw fromNetworkError(error);
  }
  if (!response.ok) {
    const envelope = (await response.json().catch(() => null)) as ErrorEnvelope | null;
    throw fromErrorEnvelope(envelope, response.status, response.headers);
  }
  const envelope = (await response.json()) as SuccessEnvelope<{
    access: string;
    refresh: string;
    user: User;
  }>;
  await saveTokens({ access: envelope.data.access, refresh: envelope.data.refresh });
  return { user: envelope.data.user };
}

/** Revokes the refresh token server-side (best effort), then forgets both. */
async function nativeSignOut(): Promise<void> {
  const { apiUrl, clearTokens, getAccessToken, readRefreshToken } = await loadNativeSession();
  try {
    const refresh = await readRefreshToken();
    const access = await getAccessToken().catch(() => null);
    if (access && refresh) {
      await fetch(apiUrl(endpoints.auth.logout), {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
        body: JSON.stringify({ refresh }),
      });
    }
  } catch {
    // Offline or already revoked: the local session still ends.
  } finally {
    await clearTokens();
  }
}

/** Whether there is a session: a cookie check through /api/auth/session on the web, the stored token in the app. */
export function useSession() {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: IS_NATIVE
      ? () => loadNativeSession().then((session) => session.hasSession())
      : () =>
          fetch("/api/auth/session")
            .then((response) => response.json())
            .then((json) => json.data.authenticated as boolean),
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
      IS_NATIVE
        ? nativeSignIn(endpoints.auth.login, input)
        : postJson<{ user: User }>("/api/auth/login", input),
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
      IS_NATIVE
        ? nativeSignIn(endpoints.auth.verifyEmail, input)
        : postJson<{ user: User }>("/api/auth/verify-email", input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.me(), data.user);
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => (IS_NATIVE ? nativeSignOut() : postJson("/api/auth/logout", {})),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
