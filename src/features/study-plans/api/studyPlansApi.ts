import { apiClient, requestPaginated } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { StudyPlan, StudyTask, TodayTask } from "@/types/domain";

export interface DaySummary {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  total_estimated_minutes: number;
}

export interface TodayPlan {
  date: string;
  summary: DaySummary;
  tasks: TodayTask[];
}

/** One entry per date that has at least one task — verified against a live backend: days with
 * no scheduled tasks are omitted entirely, not returned with an empty `tasks: []`. Render a full
 * 7-day grid by iterating `start_date`..`end_date` and looking up a matching entry, not `days[i]`. */
export interface WeekDay {
  date: string;
  summary: DaySummary;
  tasks: TodayTask[];
}

export interface WeekPlan {
  start_date: string;
  end_date: string;
  days: WeekDay[];
}

export interface StudyPlanFilters {
  status?: string;
  subject?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface CreateStudyPlanInput {
  title: string;
  subject: number;
  description?: string;
  start_date: string;
  end_date: string;
  daily_study_minutes: number;
}

export function listStudyPlans(filters: StudyPlanFilters = {}) {
  return requestPaginated<StudyPlan>(endpoints.studyPlans.list, { params: filters });
}

export function getStudyPlan(id: number | string) {
  return apiClient.get<StudyPlan>(endpoints.studyPlans.detail(id));
}

/** Manual plans only — AI-generated plans go through `POST /ai/jobs/` with `task_type: "khota_generate_plan"` instead. */
export function createStudyPlan(input: CreateStudyPlanInput) {
  return apiClient.post<StudyPlan>(endpoints.studyPlans.list, input);
}

export function getTodayPlan() {
  return apiClient.get<TodayPlan>(endpoints.studyPlans.today);
}

/** `startDate` (YYYY-MM-DD) anchors the returned 7-day range; omit for the backend's default (the current week). */
export function getWeekPlan(startDate?: string) {
  return apiClient.get<WeekPlan>(endpoints.studyPlans.week, {
    params: startDate ? { start_date: startDate } : undefined,
  });
}

export function completeTask(id: number) {
  return apiClient.post<StudyTask>(endpoints.studyPlans.taskComplete(id));
}

export function skipTask(id: number) {
  return apiClient.post<StudyTask>(endpoints.studyPlans.taskSkip(id));
}

export function reopenTask(id: number) {
  return apiClient.post<StudyTask>(endpoints.studyPlans.taskReopen(id));
}
