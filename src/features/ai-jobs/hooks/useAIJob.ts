"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { isTerminalAIJobStatus } from "@/types/domain";
import { getAIJobPollingDelay } from "@/config/constants";
import {
  getAIJob,
  createAIJob,
  cancelAIJob,
  refreshAIJob,
  submitAIJobFeedback,
  getAIJobCapabilities,
} from "../api/aiJobsApi";

/**
 * Polls a single AI job until it reaches a terminal state, using the same
 * age-based backoff schedule as the mobile app's `useAIJobsLifecycle`
 * (2s → 3s → 5s → 10s). The backend has no push channel (no WebSocket/SSE —
 * see docs/WEB_API_CONTRACT_MAP.md §10), so polling is the only option.
 */
export function useAIJob(publicId: string) {
  return useQuery({
    queryKey: queryKeys.aiJobs.detail(publicId),
    // `refresh` while the job is in flight, plain `get` once it is terminal.
    //
    // A plain GET only reads what Django already knows, and Django only
    // learns anything when the AI service delivers its completion webhook --
    // so polling GET showed one frozen state for the entire run. `refresh`
    // pulls the AI service's current stage through the backend (which maps
    // and authorizes it) and returns the updated job, which is what makes
    // the stage on screen real rather than decorative.
    // No client-side branch needed: the backend's refresh returns the job
    // as-is for a terminal one or a job that was never dispatched, so it is
    // safe and cheap in every state. If the AI service is unreachable it
    // answers 503 -- fall back to the plain read so a transient AI outage
    // does not blank the page the learner is watching.
    queryFn: () => refreshAIJob(publicId).catch(() => getAIJob(publicId)),
    refetchInterval: (query) => {
      const job = query.state.data;
      if (!job || isTerminalAIJobStatus(job.status)) return false;
      return getAIJobPollingDelay(new Date(job.created_at));
    },
  });
}

export function useAIJobCapabilities() {
  return useQuery({
    queryKey: queryKeys.aiJobs.capabilities(),
    queryFn: getAIJobCapabilities,
    staleTime: 5 * 60_000,
  });
}

export function useCreateAIJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAIJob,
    onSuccess: (job) => {
      queryClient.setQueryData(queryKeys.aiJobs.detail(job.public_id), job);
    },
  });
}

export function useCancelAIJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelAIJob,
    onSuccess: (job) => {
      queryClient.setQueryData(queryKeys.aiJobs.detail(job.public_id), job);
    },
  });
}

export function useRefreshAIJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshAIJob,
    onSuccess: (job) => {
      queryClient.setQueryData(queryKeys.aiJobs.detail(job.public_id), job);
    },
  });
}

export function useSubmitAIJobFeedback(publicId: string) {
  return useMutation({
    mutationFn: (input: Parameters<typeof submitAIJobFeedback>[1]) =>
      submitAIJobFeedback(publicId, input),
  });
}
