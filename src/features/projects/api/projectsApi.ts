import { apiClient, requestPaginated } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { Project, ProjectStatus } from "@/types/domain";

export interface ProjectFilters {
  status?: ProjectStatus | string;
  subject?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface CreateProjectInput {
  title: string;
  goal?: string | null;
  subject?: number | null;
  education_context?: string | null;
  color?: string | null;
  icon?: string | null;
}

export type UpdateProjectInput = Partial<CreateProjectInput>;

/**
 * Verified against a live backend instance (Phase 2.5): `GET
 * /projects/{public_id}/activity/` returns entries shaped like
 * `ProjectActivitySerializer`, not the `{type, description}` guess Phase 1/2
 * had left here. Real example: `{id, event_type: "project.created", request_id,
 * artifact_type: "Project", artifact_id, metadata, actor_name, created_at}`.
 */
export interface ProjectActivityEntry {
  id: number;
  event_type: string;
  request_id: string;
  artifact_type: string;
  artifact_id: string;
  metadata: Record<string, unknown>;
  actor_name: string;
  created_at: string;
}

export function listProjects(filters: ProjectFilters = {}) {
  return requestPaginated<Project>(endpoints.projects.list, { params: filters });
}

export function getProject(publicId: string) {
  return apiClient.get<Project>(endpoints.projects.detail(publicId));
}

export function createProject(input: CreateProjectInput) {
  return apiClient.post<Project>(endpoints.projects.list, input);
}

export function updateProject(publicId: string, patch: UpdateProjectInput) {
  return apiClient.patch<Project>(endpoints.projects.detail(publicId), patch);
}

export function archiveProject(publicId: string) {
  return apiClient.post<Project>(endpoints.projects.archive(publicId));
}

export function restoreProject(publicId: string) {
  return apiClient.post<Project>(endpoints.projects.restore(publicId));
}

export function getProjectActivity(publicId: string) {
  return requestPaginated<ProjectActivityEntry>(endpoints.projects.activity(publicId));
}
