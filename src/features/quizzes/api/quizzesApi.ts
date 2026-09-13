import { apiClient, requestPaginated } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  AttemptStatus,
  DifficultyLevel,
  Quiz,
  QuizAttempt,
  QuizAttemptQuizSummary,
  QuizQuestion,
  QuizResult,
  QuizStatus,
  QuizType,
} from "@/types/domain";

export interface QuizFilters {
  status?: QuizStatus;
  subject?: number;
  /** The Project's public_id. */
  project?: string;
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

/**
 * A single recorded answer within an attempt, as returned by `StudentAnswerSerializer`.
 * Does not include `is_correct` — that only appears in the graded `QuizResult.answers`
 * (`GradedQuestion`/`GradedChoice`) once the attempt is submitted.
 */
export interface QuizAttemptAnswerRecord {
  id: number;
  question: number;
  selected_choice: number | null;
  text_answer: string;
  created_at: string;
  updated_at: string;
}

/**
 * Full attempt detail, as returned by `GET /quiz-attempts/{id}/` and by the
 * `answer` action (`QuizAttemptDetailSerializer`). The nested `quiz` always
 * carries its `questions`; score/percentage fields default to zero on the
 * backend model until the attempt is submitted.
 */
export interface QuizAttemptDetail {
  id: number;
  quiz: QuizAttemptQuizSummary;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  /** Decimal fields, serialized as strings by DRF; default `"0.00"` until submitted. */
  score: string;
  max_score: string;
  percentage: string;
  correct_answers_count: number;
  wrong_answers_count: number;
  unanswered_count: number;
  duration_seconds: number | null;
  answers: QuizAttemptAnswerRecord[];
}

export interface AnswerQuestionInput {
  question: number;
  selected_choice?: number;
  text_answer?: string;
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
  return apiClient.post<QuizAttemptDetail>(endpoints.quizzes.attemptAnswer(attemptId), input);
}

export function submitAttempt(attemptId: number | string, answers?: AnswerQuestionInput[]) {
  return apiClient.post<QuizResult>(
    endpoints.quizzes.attemptSubmit(attemptId),
    answers ? { answers } : undefined,
  );
}

export function getAttemptResult(attemptId: number | string) {
  return apiClient.get<QuizResult>(endpoints.quizzes.attemptResult(attemptId));
}

export function abandonAttempt(attemptId: number | string) {
  return apiClient.post<QuizAttemptDetail>(endpoints.quizzes.attemptAbandon(attemptId));
}
