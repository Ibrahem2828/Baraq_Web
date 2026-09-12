"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { Project } from "@/types/domain";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  archiveProject,
  restoreProject,
  getProjectActivity,
  type ProjectFilters,
  type UpdateProjectInput,
} from "../api/projectsApi";

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: () => listProjects(filters),
  });
}

export function useProject(publicId: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(publicId),
    queryFn: () => getProject(publicId),
    enabled: Boolean(publicId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useUpdateProject(publicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateProjectInput) => updateProject(publicId, patch),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(project.public_id), project);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

function useProjectStatusMutation(mutationFn: (publicId: string) => Promise<Project>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(project.public_id), project);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useArchiveProject() {
  return useProjectStatusMutation(archiveProject);
}

export function useRestoreProject() {
  return useProjectStatusMutation(restoreProject);
}

export function useProjectActivity(publicId: string) {
  return useQuery({
    queryKey: queryKeys.projects.activity(publicId),
    queryFn: () => getProjectActivity(publicId),
    enabled: Boolean(publicId),
  });
}
