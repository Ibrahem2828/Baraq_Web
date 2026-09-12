"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  listStudyPlans,
  getStudyPlan,
  getTodayPlan,
  getWeekPlan,
  createStudyPlan,
  completeTask,
  skipTask,
  reopenTask,
  type StudyPlanFilters,
} from "../api/studyPlansApi";

export function useStudyPlans(filters: StudyPlanFilters = {}) {
  return useQuery({
    queryKey: queryKeys.studyPlans.list(filters),
    queryFn: () => listStudyPlans(filters),
  });
}

export function useStudyPlan(id: number | string) {
  return useQuery({
    queryKey: queryKeys.studyPlans.detail(id),
    queryFn: () => getStudyPlan(id),
  });
}

export function useTodayPlan() {
  return useQuery({
    queryKey: queryKeys.studyPlans.today(),
    queryFn: getTodayPlan,
  });
}

/** Same query key shape for the same `startDate` across Khota's hub, the Week page, and anywhere
 * else it's used — required for cross-screen cache sync after a task mutation (see `useTaskMutation`). */
export function useWeekPlan(startDate?: string) {
  return useQuery({
    queryKey: queryKeys.studyPlans.week(startDate),
    queryFn: () => getWeekPlan(startDate),
  });
}

export function useCreateStudyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStudyPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studyPlans.all });
    },
  });
}

function useTaskMutation(mutationFn: (id: number) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studyPlans.today() });
      queryClient.invalidateQueries({ queryKey: queryKeys.studyPlans.all });
    },
  });
}

export function useCompleteTask() {
  return useTaskMutation(completeTask);
}
export function useSkipTask() {
  return useTaskMutation(skipTask);
}
export function useReopenTask() {
  return useTaskMutation(reopenTask);
}
