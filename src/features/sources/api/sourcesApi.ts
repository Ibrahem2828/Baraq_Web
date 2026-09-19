import { apiClient, requestPaginated } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  AIJob,
  AIJobCharacter,
  SourceStatus,
  SourceType,
  StudentSource,
  StudentSourceCollection,
  Subject,
} from "@/types/domain";

export interface SourceFilters {
  status?: string;
  source_type?: string;
  project?: string;
  collection?: number;
  subject?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface CollectionFilters {
  project?: string;
  subject?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface UpdateSourceInput {
  title?: string;
  description?: string | null;
  project?: string | null;
  subject?: number | null;
  collection?: number | null;
}

export interface CreateCollectionInput {
  name: string;
  description?: string | null;
  subject?: number | null;
  project?: string | null;
  color?: string | null;
  icon?: string | null;
}

export interface UpdateCollectionInput extends Partial<CreateCollectionInput> {
  status?: "active" | "archived";
}

/**
 * Verified against a live backend instance (Phase 2) — `GET
 * /student-sources/{id}/capabilities/` returns a flat map keyed by character,
 * not wrapped in a `characters` key as Phase 1 had guessed. Each entry always
 * has a human-readable `message` (Arabic), even when `available` is false —
 * e.g. "هذه الشخصية غير متاحة في خطتك الحالية." for a plan-gated character,
 * so the UI should surface it rather than just hiding the action.
 */
export type SourceCapabilities = Partial<
  Record<AIJobCharacter, { available: boolean; actions: string[]; message: string }>
>;

export interface UseWithCharacterInput {
  character: AIJobCharacter;
  action?: string;
}

/**
 * Verified against a live backend instance (Phase 2.5): `GET
 * /student-source-collections/{id}/sources/` is genuinely unpaginated (no
 * `meta` in the envelope at all — a plain array in `data`, same pattern as
 * `education-stages/`) and returns a slimmer field set than full
 * `StudentSource` (`StudentSourceBriefSerializer` server-side) —
 * `description`, `file_url`, `extracted_text_preview`, etc. are absent.
 * Phase 1/2 had this typed as paginated `StudentSource[]`, which happened to
 * not break the one page that reads it (only `id`/`title`/`status` are
 * used there) purely because `requestPaginated()` falls back to
 * `data.length` when `meta` is missing — but the type was wrong.
 */
export interface StudentSourceBrief {
  id: number;
  title: string;
  source_type: SourceType;
  project: string | null;
  subject: Subject | null;
  collection: number | null;
  collection_id: number | null;
  collection_name: string;
  original_filename: string;
  file_size: number;
  extension: string;
  status: SourceStatus;
  created_at: string;
}

/** Inferred response shape: an AI job is created and returned when applicable. */
export interface UseWithCharacterResponse {
  ai_job?: AIJob | null;
  [key: string]: unknown;
}

export function listSources(filters: SourceFilters = {}) {
  return requestPaginated<StudentSource>(endpoints.sources.list, { params: filters });
}

export function getSource(id: number | string) {
  return apiClient.get<StudentSource>(endpoints.sources.detail(id));
}

export function uploadSource(formData: FormData) {
  return apiClient.post<StudentSource>(endpoints.sources.list, formData);
}

export function updateSource(id: number | string, patch: UpdateSourceInput) {
  return apiClient.patch<StudentSource>(endpoints.sources.detail(id), patch);
}

export function deleteSource(id: number | string) {
  return apiClient.delete<void>(endpoints.sources.detail(id));
}

/**
 * `POST /student-sources/{id}/process/` answers **202** with an envelope, not
 * a bare source — see `SourceProcessingQueuedResponseSerializer`
 * (`apps/sources/serializers.py`) and `SourceProcessingQueuedResponse` in
 * `contracts/openapi.json`. `source` is the source as it stands *before* the
 * queued work runs, so callers must re-fetch (or rely on query invalidation)
 * to observe the processed result.
 *
 * This was previously typed as a bare `StudentSource`, which type-checked
 * cleanly while every field read `undefined` at runtime.
 */
export interface SourceProcessingQueuedResponse {
  message: string;
  source: StudentSource;
}

export function processSource(id: number | string) {
  return apiClient.post<SourceProcessingQueuedResponse>(endpoints.sources.process(id));
}

export function getSourceCapabilities(id: number | string) {
  return apiClient.get<SourceCapabilities>(endpoints.sources.capabilities(id));
}

export function useSourceWithCharacter(id: number | string, input: UseWithCharacterInput) {
  return apiClient.post<UseWithCharacterResponse>(endpoints.sources.useWithCharacter(id), input);
}

export function listCollections(filters: CollectionFilters = {}) {
  return requestPaginated<StudentSourceCollection>(endpoints.sources.collections, {
    params: filters,
  });
}

export function getCollection(id: number | string) {
  return apiClient.get<StudentSourceCollection>(endpoints.sources.collection(id));
}

export function createCollection(input: CreateCollectionInput) {
  return apiClient.post<StudentSourceCollection>(endpoints.sources.collections, input);
}

export function updateCollection(id: number | string, patch: UpdateCollectionInput) {
  return apiClient.patch<StudentSourceCollection>(endpoints.sources.collection(id), patch);
}

export function deleteCollection(id: number | string) {
  return apiClient.delete<void>(endpoints.sources.collection(id));
}

export function listCollectionSources(id: number | string) {
  return apiClient.get<StudentSourceBrief[]>(endpoints.sources.collectionSources(id));
}
