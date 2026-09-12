import { apiClient, requestPaginated } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { EducationStage, Subject, UserSubject } from "@/types/domain";

export interface SubjectFilters {
  education_stage?: number;
  grade_level?: number;
  is_active?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export function listEducationStages() {
  return requestPaginated<EducationStage>(endpoints.subjects.educationStages);
}

export function listSubjects(filters: SubjectFilters = {}) {
  return requestPaginated<Subject>(endpoints.subjects.subjects, { params: filters });
}

export function listUserSubjects() {
  return requestPaginated<UserSubject>(endpoints.subjects.userSubjects);
}

export function addUserSubject(subjectId: number) {
  return apiClient.post<UserSubject>(endpoints.subjects.userSubjects, { subject: subjectId });
}

export function removeUserSubject(userSubjectId: number) {
  return apiClient.delete<void>(endpoints.subjects.userSubject(userSubjectId));
}
