import { apiClient, requestPaginated } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { StudentRecommendation, Summary, Transcription } from "@/types/domain";

/**
 * Read-only result types materialized from completed AI jobs (Rasheed
 * recommendations, Kholasa summaries, Sada transcriptions). Structurally
 * identical — list/detail only, no create/update/delete — so one module
 * covers all three, mirroring `notificationsApi.ts`'s shape.
 */

export interface ResultFilters {
  subject?: number;
  source?: number;
  /**
   * The Project's public_id. Supported by `summaries`/`transcriptions`/`recommendations`
   * list endpoints only once the backend Phase 0 project-scoping fix is deployed — on an
   * older backend this filter is silently ignored (the list returns unfiltered, not an error).
   */
  project?: string;
  [key: string]: string | number | boolean | undefined;
}

export function listRecommendations(filters: ResultFilters = {}) {
  return requestPaginated<StudentRecommendation>(endpoints.results.recommendations, {
    params: filters,
  });
}

export function getRecommendation(id: string | number) {
  return apiClient.get<StudentRecommendation>(endpoints.results.recommendation(id));
}

export function markRecommendationRead(id: string | number) {
  return apiClient.post<StudentRecommendation>(endpoints.results.recommendationMarkRead(id));
}

export function listSummaries(filters: ResultFilters = {}) {
  return requestPaginated<Summary>(endpoints.results.summaries, { params: filters });
}

export function getSummary(id: string | number) {
  return apiClient.get<Summary>(endpoints.results.summary(id));
}

export function listTranscriptions(filters: ResultFilters = {}) {
  return requestPaginated<Transcription>(endpoints.results.transcriptions, { params: filters });
}

export function getTranscription(id: string | number) {
  return apiClient.get<Transcription>(endpoints.results.transcription(id));
}
