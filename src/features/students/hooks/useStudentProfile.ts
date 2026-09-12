"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { getStudentProfile, setupStudentProfile, updateStudentProfile } from "../api/studentsApi";

export function useStudentProfile(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.studentProfile(),
    queryFn: getStudentProfile,
    enabled,
    retry: false,
  });
}

export function useSetupStudentProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setupStudentProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.studentProfile(), data);
    },
  });
}

export function useUpdateStudentProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStudentProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.studentProfile(), data);
    },
  });
}
