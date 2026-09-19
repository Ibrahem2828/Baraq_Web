"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  confirmInvitation,
  listMyMemberships,
  previewInvitation,
  type JoinCredential,
} from "../api/organizationsApi";

export function useMyMemberships() {
  return useQuery({
    queryKey: ["memberships", "list"] as const,
    queryFn: listMyMemberships,
  });
}

/**
 * Resolves the token an invitation link arrives with.
 *
 * A query rather than an effect, so the page never writes state from inside
 * one. The key deliberately does not contain the token -- an invitation code
 * is a credential and has no business in a cache key -- and `gcTime: 0`
 * drops the result the moment the page unmounts.
 */
export function useInvitationLinkPreview(token: string | null) {
  return useQuery({
    queryKey: ["join", "linkPreview"] as const,
    queryFn: () => previewInvitation({ token: token as string }),
    enabled: Boolean(token),
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
}

/**
 * Preview by typed code is a mutation rather than a query on purpose: it is
 * a POST carrying a secret, and the learner may try several codes.
 */
export function usePreviewInvitation() {
  return useMutation({
    mutationFn: (credential: JoinCredential) => previewInvitation(credential),
  });
}

export function useConfirmInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credential: JoinCredential) => confirmInvitation(credential),
    onSuccess: () => {
      // Confirming creates a pending request, not a membership -- but the
      // memberships view is where the learner watches for the decision.
      queryClient.invalidateQueries({ queryKey: ["memberships", "list"] });
    },
  });
}
