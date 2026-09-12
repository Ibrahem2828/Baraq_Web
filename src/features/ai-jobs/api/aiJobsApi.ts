import { apiClient, requestPaginated } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { AIJob, AIJobCharacter, AIJobTaskType } from "@/types/domain";

export interface CreateAIJobInput {
  task_type: AIJobTaskType;
  source?: number;
  collection?: number;
  subject?: number;
  project?: string;
  input?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  force?: boolean;
}

export interface AIJobCapabilities {
  service_enabled: boolean;
  characters: AIJobCharacter[];
  task_types: AIJobTaskType[];
  phase_one: AIJobCharacter[];
  phase_two: AIJobCharacter[];
}

export function getAIJobCapabilities() {
  return apiClient.get<AIJobCapabilities>(endpoints.ai.capabilities);
}

export function listAIJobs(filters: { status?: string; character?: string } = {}) {
  return requestPaginated<AIJob>(endpoints.ai.jobs, { params: filters });
}

export function createAIJob(input: CreateAIJobInput) {
  return apiClient.post<AIJob>(endpoints.ai.jobs, input);
}

export function getAIJob(publicId: string) {
  return apiClient.get<AIJob>(endpoints.ai.job(publicId));
}

export function refreshAIJob(publicId: string) {
  return apiClient.post<AIJob>(endpoints.ai.jobRefresh(publicId));
}

export function cancelAIJob(publicId: string) {
  return apiClient.post<AIJob>(endpoints.ai.jobCancel(publicId));
}

export interface AIJobFeedbackInput {
  rating: number;
  is_helpful?: boolean;
  feedback_type?: string;
  reason_codes?: string[];
  comment?: string;
  training_consent?: boolean;
}

export function submitAIJobFeedback(publicId: string, input: AIJobFeedbackInput) {
  return apiClient.post(endpoints.ai.jobFeedback(publicId), input);
}
