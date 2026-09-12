"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CSRF_COOKIE } from "@/lib/auth/cookie-names";
import { readClientCookie } from "@/lib/utils/cookies-client";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query/keys";
import type { User } from "@/types/domain";

async function ensureCsrfToken(): Promise<string> {
  const existing = readClientCookie(CSRF_COOKIE);
  if (existing) return existing;
  const response = await fetch("/api/auth/csrf", { credentials: "same-origin" });
  const json = await response.json();
  return json.data.csrfToken as string;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const csrfToken = await ensureCsrfToken();
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message ?? "Request failed");
  }
  return json.data as T;
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

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postJson("/api/auth/logout", {}),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
