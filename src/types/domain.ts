/**
 * Shared domain types, matching the Django backend's serializer field names
 * verbatim (see docs/WEB_API_CONTRACT_MAP.md). Cross-checked field-by-field
 * against the real OpenAPI schema pulled from a live backend instance in
 * Phase 2 (`API_DOCS_PUBLIC=true` locally — see docs/BACKEND_INTEGRATION_STATUS.md).
 * A recurring pattern the Phase 1 types got wrong throughout: **read**
 * responses (list/detail serializers) nest a summary object for FK fields
 * like `subject`/`quiz` (e.g. `{id, name, ...}`), while only **write**
 * request bodies (create/update inputs, defined per-feature in each
 * `*Api.ts` file) accept a bare numeric id for the same field. Decimal
 * fields (`score`, `percentage`, `cost_usd`, etc.) are serialized as
 * strings by DRF, not numbers — kept as `string` here to match.
 */

export type UserRole = "student" | "admin" | "support" | "super_admin";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface EducationStage {
  id: number;
  name: string;
  description: string;
  order: number;
  is_active: boolean;
}

export interface Subject {
  id: number;
  name: string;
  education_stage: number;
  education_stage_name: string;
  /** e.g. "الثالث الثانوي" — a free-text label, not a numeric grade. */
  grade_level: string;
  description: string;
  is_active: boolean;
}

export interface UserSubject {
  id: number;
  subject: Subject;
  created_at: string;
}

export interface StudentProfile {
  id: number;
  education_stage: number | null;
  education_stage_name: string;
  grade_level: string;
  specialization: string | null;
  study_goal: string | null;
  daily_study_hours: number | null;
  is_setup_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = "active" | "archived";

export interface Project {
  public_id: string;
  title: string;
  subject: number | null;
  goal: string | null;
  education_context: string | null;
  status: ProjectStatus;
  color: string | null;
  icon: string | null;
  source_count: number;
  ai_job_count: number;
  created_at: string;
  updated_at: string;
}

export type StudyPlanStatus = "draft" | "active" | "completed" | "cancelled";
export type DifficultyLevel = "easy" | "medium" | "hard";
export type GenerationType = "manual" | "ai";
export type StudyTaskStatus = "pending" | "in_progress" | "completed" | "skipped";
export type TaskPriority = "low" | "medium" | "high";

export interface StudyTask {
  id: number;
  title: string;
  description: string | null;
  task_date: string;
  estimated_minutes: number;
  priority: TaskPriority;
  status: StudyTaskStatus;
  order: number;
  completed_at: string | null;
}

/** A minimal plan reference, as embedded on each task from `today/` and `week/`. */
export interface StudyPlanMini {
  id: number;
  title: string;
  status: StudyPlanStatus;
  subject: Subject;
}

/**
 * The `today/` and `week/` endpoints return tasks with an embedded `plan`
 * (unlike a plan's own nested `tasks[]`, which omit it — the plan is already
 * the parent there). Same fields as `StudyTask` otherwise.
 */
export interface TodayTask extends StudyTask {
  plan: StudyPlanMini;
}

export interface StudyPlan {
  id: number;
  title: string;
  description: string | null;
  project: string | null;
  subject: Subject;
  start_date: string;
  end_date: string;
  status: StudyPlanStatus;
  difficulty_level: DifficultyLevel;
  generation_type: GenerationType;
  daily_study_minutes: number;
  goal: string | null;
  /** Decimal, serialized as a string by DRF (e.g. `"42.50"`) — parse with `Number(...)` before use. */
  completion_percentage: string;
  total_tasks: number;
  completed_tasks: number;
  tasks?: StudyTask[];
  ai_request_id?: string;
  created_at: string;
  updated_at: string;
}

export type QuizStatus = "draft" | "published" | "archived";
export type QuizType = "practice" | "exam" | "quick";
export type QuestionType = "mcq" | "true_false" | "short_answer";
export type AttemptStatus = "in_progress" | "submitted" | "abandoned";

export interface QuizChoice {
  id: number;
  text: string;
  order: number;
  /** Only present once an attempt is submitted (`ChoiceResult`) — draft/in-progress reads omit it. */
  is_correct?: boolean;
}

export interface QuizQuestion {
  id: number;
  text: string;
  question_type: QuestionType;
  difficulty_level: DifficultyLevel;
  /** Only present in a submitted attempt's result, never on the plain question. */
  explanation?: string;
  order: number;
  points: number;
  choices: QuizChoice[];
}

/** A previous attempt's headline result, embedded on `Quiz.last_attempt`. */
export interface QuizAttemptMini {
  id: number;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  score?: string;
  max_score?: string;
  percentage?: string;
}

export interface Quiz {
  id: number;
  title: string;
  description: string | null;
  topic: string | null;
  subject: Subject;
  project: string | null;
  status: QuizStatus;
  quiz_type: QuizType;
  difficulty_level: DifficultyLevel;
  generation_type: GenerationType;
  questions_count: number;
  time_limit_minutes: number | null;
  questions?: QuizQuestion[];
  attempts_count?: number;
  last_attempt?: QuizAttemptMini | null;
  ai_request_id?: string;
  created_at: string;
  updated_at: string;
}

export interface QuizAttempt {
  id: number;
  /** List/detail responses nest a slim quiz summary here, not a bare id. */
  quiz: Pick<Quiz, "id" | "title" | "subject"> | number;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  /** Decimal fields, serialized as strings by DRF. */
  score?: string;
  max_score?: string;
  percentage?: string;
  correct_answers_count?: number;
  wrong_answers_count?: number;
  unanswered_count?: number;
  duration_seconds?: number | null;
}

/** A graded choice, as returned inside a submitted attempt's result (`ChoiceResult`). */
export interface GradedChoice {
  id: number;
  text: string;
  is_correct: boolean;
  order: number;
}

/** One graded question within `QuizResult.answers` (`QuestionResult`). */
export interface GradedQuestion {
  question_id: number;
  text: string;
  question_type: QuestionType;
  difficulty_level: DifficultyLevel;
  order: number;
  points: number;
  choices: GradedChoice[];
  correct_choice: GradedChoice | null;
  selected_choice: GradedChoice | null;
  text_answer: string;
  is_correct: boolean;
  explanation: string;
  /** Decimal, serialized as a string. */
  points_awarded: string;
}

/**
 * Response of both `POST /quiz-attempts/{id}/submit/` and
 * `GET /quiz-attempts/{id}/result/` (`QuizResult` — identical shape,
 * idempotently re-fetchable). Phase 1 had invented a different, incorrect
 * shape here (`correct_count`/`wrong_count`/`score` instead of the real
 * `correct_answers_count`/`wrong_answers_count`/`percentage`).
 */
export interface QuizResult {
  attempt: QuizAttempt;
  quiz: Quiz;
  answers: GradedQuestion[];
  correct_answers_count: number;
  wrong_answers_count: number;
  unanswered_count: number;
  /** Decimal, serialized as a string (e.g. `"80.00"`). */
  percentage: string;
  recommendations: string[];
}

export type SourceType = "pdf" | "text" | "image" | "document" | "presentation" | "audio";
export type SourceStatus = "uploaded" | "processing" | "ready" | "failed";

export interface StudentSource {
  id: number;
  title: string;
  description: string | null;
  source_type: SourceType;
  status: SourceStatus;
  project: string | null;
  /** `null` unless a subject was set — a nested object, not a bare id (see file header note). */
  subject: Subject | null;
  subject_name: string;
  /** Writable FK — set this (a plain id) when moving a source between collections. */
  collection: number | null;
  collection_id: number | null;
  collection_name: string;
  original_filename?: string;
  file_size?: number;
  mime_type?: string;
  extension?: string;
  file_url: string | null;
  extracted_text_preview: string | null;
  has_extracted_text: boolean;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentSourceCollection {
  id: number;
  name: string;
  description: string | null;
  subject: Subject | null;
  subject_name: string;
  project: string | null;
  color: string | null;
  icon: string | null;
  status: "active" | "archived";
  source_count: number;
  total_file_size: number;
  last_source_at: string | null;
  /** Only present on the detail read (`GET .../{id}/`), not the list. */
  sources?: StudentSource[];
  /** Freeform, backend-defined shape — same per-character capability map as the standalone `capabilities/` endpoint. */
  capabilities?: Record<string, unknown>;
  characters_summary?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type AIJobCharacter = "fahes" | "khota" | "rasheed" | "kholasa" | "sada";
export type AIJobTaskType =
  | "fahes_generate_quiz"
  | "khota_generate_plan"
  | "rasheed_recommendations"
  | "kholasa_generate_summary"
  | "sada_transcribe_audio";
export type AIJobStatus =
  | "created"
  | "queued"
  | "submitted"
  | "processing"
  | "validating"
  | "output_ready"
  | "materializing"
  | "completed"
  | "failed"
  | "canceled";

export function isTerminalAIJobStatus(status: AIJobStatus): boolean {
  return status === "completed" || status === "failed" || status === "canceled";
}

export interface AIJob {
  public_id: string;
  character: AIJobCharacter;
  task_type: AIJobTaskType;
  status: AIJobStatus;
  source: number | null;
  collection: number | null;
  subject: number | null;
  project: string | null;
  result_type: "quiz" | "study_plan" | "recommendation" | "summary" | "transcription" | null;
  result_id: number | null;
  error_code: string | null;
  error_message: string | null;
  /** Present on the detail read (`GET /ai/jobs/{id}/`), omitted from the list. */
  result_payload?: unknown;
  provider_account?: string;
  model_name?: string;
  input_tokens?: number;
  output_tokens?: number;
  /** Decimal, serialized as a string. */
  cost_usd?: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface StudentRecommendation {
  id: number;
  subject: number | null;
  title: string;
  summary: string;
  /** Decimal, serialized as a string; `null` if not yet computed. */
  overall_score: string | null;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  /**
   * The backend's `next_best_action` is a Django `JSONField(default=dict)` —
   * genuinely a freeform object, not a string. Confirmed live in Phase 2.5
   * (a real value looked like `{action: "study_plan", label: "..."}`) — the
   * `string | null` type here previously caused a real "Objects are not
   * valid as a React child" crash on the recommendation detail page, which
   * rendered this field directly assuming it was plain text.
   */
  next_best_action: Record<string, unknown> | null;
  /** Also a freeform `JSONField(default=dict)` on the backend. */
  source_metrics: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface Summary {
  id: number;
  source: number | null;
  collection: number | null;
  title: string;
  short_summary: string;
  detailed_summary: string;
  key_points: string[];
  important_terms: string[];
  covered_topics: string[];
  review_questions: string[];
  /** Decimal, serialized as a string. */
  quality_score: string | null;
  created_at: string;
}

export interface Transcription {
  id: number;
  source: number;
  title: string;
  language: string;
  full_transcript: string;
  cleaned_transcript: string;
  detected_topics: string[];
  duration_seconds: number;
  /** Decimal, serialized as a string. */
  confidence_score: string | null;
  created_at: string;
}

export interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  billing_interval: "free" | "monthly" | "yearly" | "lifetime" | "custom";
  features: Record<string, boolean>;
  limits: Record<string, number>;
  sort_order: number;
}

export type SubscriptionStatus =
  "active" | "trialing" | "expired" | "canceled" | "past_due" | "paused";

/** `UserSubscription` — always present (every user has a subscription row, `free` by default), never `null`. */
export interface UserSubscriptionRecord {
  id: number;
  user: number;
  user_email: string;
  user_full_name: string;
  plan: SubscriptionPlan;
  plan_name: string;
  plan_code: string;
  status: SubscriptionStatus;
  started_at: string;
  current_period_start: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  canceled_at: string | null;
  auto_renew: boolean;
  /** No real payment provider is integrated yet — always `"local"` today. See docs/API_CONTRACT_MAP.md. */
  provider: string;
  provider_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionUsage {
  id: number;
  period_start: string;
  period_end: string;
  sources_uploaded: number;
  collections_created: number;
  ai_requests_used: number;
  khota_requests: number;
  fahes_requests: number;
  rasheed_requests: number;
  kholasa_requests: number;
  sada_requests: number;
  storage_used_bytes: number;
}

export interface MySubscription {
  plan: SubscriptionPlan;
  subscription: UserSubscriptionRecord;
  usage: SubscriptionUsage;
  limits: Record<string, number>;
  features: Record<string, boolean>;
  remaining: Record<string, number>;
}

export type NotificationCategory = "system" | "study" | "quiz" | "plan" | "ai" | "subscription";

export interface AppNotification {
  id: number;
  category: NotificationCategory;
  title: string;
  body: string;
  data: Record<string, unknown>;
  action_url: string | null;
  read_at: string | null;
  is_read: boolean;
  created_at: string;
}

export type SupportTicketCategory =
  "technical" | "account" | "billing" | "content" | "ai_result" | "other";
export type SupportTicketPriority = "low" | "medium" | "high" | "urgent";
export type SupportTicketStatus = "open" | "in_progress" | "waiting_user" | "resolved" | "closed";

export interface SupportMessage {
  id: number;
  body: string;
  is_staff: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  message_count: number;
  messages?: SupportMessage[];
  created_at: string;
  updated_at: string;
}
