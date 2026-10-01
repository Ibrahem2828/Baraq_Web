import { apiClient, requestPaginated } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { AIJobCharacter } from "@/types/domain";

export type LibraryCategory = "handout" | "worksheet" | "past_exam" | "recording" | "other";

/** A file the learner's school or class shared (Classroom Shared Library). */
export interface ClassLibraryItem {
  public_id: string;
  organization: string;
  organization_name: string;
  classroom: string | null;
  classroom_name: string | null;
  subject: number | null;
  subject_name: string | null;
  title: string;
  description: string;
  category: LibraryCategory;
  original_filename: string;
  file_size: number;
  extension: string;
  source_type: string;
  status: "active" | "archived";
  uploaded_by_name: string | null;
  /** Characters this file can be sent to (documents: fahes/kholasa/khota; audio: sada). */
  characters: AIJobCharacter[];
  created_at: string;
  updated_at: string;
}

export interface ClassLibraryFilters {
  classroom?: string;
  category?: string;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface UseLibraryItemResult {
  source_id: number;
  project: string;
  project_title: string;
  character: AIJobCharacter | null;
  created: boolean;
}

export function listClassLibrary(filters: ClassLibraryFilters = {}) {
  return requestPaginated<ClassLibraryItem>(endpoints.classLibrary.list, {
    params: { page_size: 100, ...filters },
  });
}

/**
 * Puts the item in one of the learner's own projects (once) and returns the
 * copy's id: the server copies the file, the learner never re-uploads it.
 */
export function sendLibraryItem(id: string, character?: AIJobCharacter) {
  return apiClient.post<UseLibraryItemResult>(endpoints.classLibrary.use(id), character ? { character } : {});
}

/** Same-origin download through the BFF (session cookie, no token in the URL). */
export function libraryDownloadHref(id: string) {
  return `/api/bff${endpoints.classLibrary.download(id)}`;
}
