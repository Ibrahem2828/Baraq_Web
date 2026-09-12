import { apiClient, requestPaginated } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  AttemptStatus,
  DifficultyLevel,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  QuizStatus,
  QuizType,
} from "@/types/domain";

export interface QuizFilters {
  status?: QuizStatus;
  subject?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface CreateQuizInput {
  subject: number;
  title: string;
  description?: string;
  topic?: string;
  difficulty_level?: DifficultyLevel;
  quiz_type?: QuizType;
  time_limit_minutes?: number;
}

export interface QuizAttemptFilters {
  status?: AttemptStatus;
  quiz?: number;
  [key: string]: string | number | boolean | undefined;
}

/** Response shape of `POST /quizzes/{id}/start/` — a fresh in-progress attempt with its question set. */
export interface StartQuizAttemptResponse {
  attempt_id: number;
  quiz: Quiz;
  questions: QuizQuestion[];
  started_at: string;
  time_limit_minutes: number | null;
  status: AttemptStatus;
}

/** A single recorded answer within an attempt. `is_correct` is only populated after submit. */
export interface QuizAttemptAnswerRecord {
  question: number;
  selected_choice: number | null;
  text_answer: string | null;
  is_correct?: boolean | null;
}

/**
 * Full attempt detail, as returned by `GET /quiz-attempts/{id}/`. Extends the
 * slim `QuizAttempt` domain type with the nested quiz, question set, and any
 * answers recorded so far. `QuizAttemptDetailSerializer` hides
 * `QuizChoice.is_correct` and question `explanation` while `status ===
 * "in_progress"` — they only appear once the attempt is submitted.
 */
export interface QuizAttemptDetail {
  id: number;
  quiz: Quiz;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  time_limit_minutes?: number | null;
  questions: QuizQuestion[];
  answers?: QuizAttemptAnswerRecord[];
}

export interface AnswerQuestionInput {
  question: number;
  selected_choice?: number;
  text_answer?: string;
}

export interface QuizAttemptResult {
  attempt_id: number;
  quiz: Quiz;
  status: AttemptStatus;
  score: number;
  total_points?: number;
  earned_points?: number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  recommendations?: string[];
  questions?: (QuizQuestion & { student_answer?: QuizAttemptAnswerRecord | null })[];
}

export function listQuizzes(filters: QuizFilters = {}) {
  return requestPaginated<Quiz>(endpoints.quizzes.list, { params: filters });
}

export function getQuiz(id: number | string) {
  return apiClient.get<Quiz>(endpoints.quizzes.detail(id));
}

/** Creates a manual draft quiz only. AI-generated quizzes go through `POST /ai/jobs/`. */
export function createQuiz(input: CreateQuizInput) {
  return apiClient.post<Quiz>(endpoints.quizzes.list, input);
}

export function publishQuiz(id: number | string) {
  return apiClient.post<Quiz>(endpoints.quizzes.publish(id));
}

export function archiveQuiz(id: number | string) {
  return apiClient.post<Quiz>(endpoints.quizzes.archive(id));
}

export function startQuizAttempt(id: number | string) {
  return apiClient.post<StartQuizAttemptResponse>(endpoints.quizzes.start(id));
}

export function listAttempts(filters: QuizAttemptFilters = {}) {
  return requestPaginated<QuizAttempt>(endpoints.quizzes.attempts, { params: filters });
}

export function getAttempt(id: number | string) {
  return apiClient.get<QuizAttemptDetail>(endpoints.quizzes.attempt(id));
}

export function answerQuestion(attemptId: number | string, input: AnswerQuestionInput) {
  return apiClient.post<QuizAttemptAnswerRecord>(endpoints.quizzes.attemptAnswer(attemptId), input);
}

export function submitAttempt(attemptId: number | string, answers?: AnswerQuestionInput[]) {
  return apiClient.post<QuizAttemptDetail>(
    endpoints.quizzes.attemptSubmit(attemptId),
    answers ? { answers } : undefined,
  );
}

export function getAttemptResult(attemptId: number | string) {
  return apiClient.get<QuizAttemptResult>(endpoints.quizzes.attemptResult(attemptId));
}

export function abandonAttempt(attemptId: number | string) {
  return apiClient.post<QuizAttemptDetail>(endpoints.quizzes.attemptAbandon(attemptId));
}
