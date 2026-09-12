import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { StudentProfile } from "@/types/domain";
import type { ProfileSetupInput } from "@/lib/validation/onboarding";

export function getStudentProfile() {
  return apiClient.get<StudentProfile>(endpoints.students.profile);
}

export function setupStudentProfile(input: ProfileSetupInput) {
  return apiClient.post<StudentProfile>(endpoints.students.setupProfile, input);
}

export function updateStudentProfile(patch: Partial<ProfileSetupInput>) {
  return apiClient.patch<StudentProfile>(endpoints.students.profile, patch);
}
