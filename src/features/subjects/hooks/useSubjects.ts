"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  listEducationStages,
  listSubjects,
  listUserSubjects,
  addUserSubject,
  removeUserSubject,
  type SubjectFilters,
} from "../api/subjectsApi";

export function useEducationStages() {
  return useQuery({
    queryKey: queryKeys.subjects.educationStages(),
    queryFn: listEducationStages,
  });
}

export function useSubjectsList(filters: SubjectFilters = {}) {
  return useQuery({
    queryKey: queryKeys.subjects.list(filters),
    queryFn: () => listSubjects(filters),
  });
}

export function useUserSubjects() {
  return useQuery({
    queryKey: queryKeys.subjects.userSubjects(),
    queryFn: listUserSubjects,
  });
}

export function useAddUserSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addUserSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.userSubjects() });
    },
  });
}

export function useRemoveUserSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeUserSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.userSubjects() });
    },
  });
}
