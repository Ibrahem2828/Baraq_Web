"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  listRecommendations,
  getRecommendation,
  markRecommendationRead,
  listSummaries,
  getSummary,
  listTranscriptions,
  getTranscription,
  type ResultFilters,
} from "../api/resultsApi";

export function useRecommendations(filters: ResultFilters = {}) {
  return useQuery({
    queryKey: queryKeys.results.recommendations(filters),
    queryFn: () => listRecommendations(filters),
  });
}

export function useRecommendation(id: string | number) {
  return useQuery({
    queryKey: queryKeys.results.recommendation(id),
    queryFn: () => getRecommendation(id),
  });
}

export function useMarkRecommendationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markRecommendationRead,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.results.recommendation(data.id), data);
      queryClient.invalidateQueries({ queryKey: ["recommendations", "list"] });
    },
  });
}

export function useSummaries(filters: ResultFilters = {}) {
  return useQuery({
    queryKey: queryKeys.results.summaries(filters),
    queryFn: () => listSummaries(filters),
  });
}

export function useSummary(id: string | number) {
  return useQuery({
    queryKey: queryKeys.results.summary(id),
    queryFn: () => getSummary(id),
  });
}

export function useTranscriptions(filters: ResultFilters = {}) {
  return useQuery({
    queryKey: queryKeys.results.transcriptions(filters),
    queryFn: () => listTranscriptions(filters),
  });
}

export function useTranscription(id: string | number) {
  return useQuery({
    queryKey: queryKeys.results.transcription(id),
    queryFn: () => getTranscription(id),
  });
}
