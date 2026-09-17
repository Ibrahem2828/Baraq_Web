/**
 * Central backend route contract. Every backend call in the app must build its
 * path from here — no stringly-typed route literals in components or feature
 * API modules. Paths are relative to `/api/v1` (added by `backendFetch`, see
 * `lib/api/backend.ts`); the BFF proxy at `app/api/bff/[...path]/route.ts`
 * forwards whatever suffix is requested.
 *
 * Verified against `Baraaq_back/backend` (Django) — see docs/WEB_API_CONTRACT_MAP.md.
 */

function withId(base: string, id: string | number): string {
  return `${base}${id}/`;
}

export const endpoints = {
  system: {
    root: "/",
    health: "/health/",
    healthLive: "/health/live/",
    healthReady: "/health/ready/",
    meta: "/meta/",
  },
  auth: {
    root: "/auth/",
    register: "/auth/register/",
    login: "/auth/login/",
    refresh: "/auth/refresh/",
    verify: "/auth/verify/",
    // Distinct from `verify` above (SimpleJWT's unrelated token-verify
    // endpoint) -- this is the registration email-OTP check.
    verifyEmail: "/auth/verify-email/",
    resendOtp: "/auth/resend-otp/",
    logout: "/auth/logout/",
    changePassword: "/auth/change-password/",
    passwordReset: "/auth/password-reset/",
    passwordResetConfirm: "/auth/password-reset/confirm/",
  },
  users: {
    me: "/users/me/",
  },
  students: {
    setupProfile: "/students/setup-profile/",
    profile: "/students/profile/",
  },
  subjects: {
    educationStages: "/education-stages/",
    subjects: "/subjects/",
    userSubjects: "/users/subjects/",
    userSubject: (id: string | number) => withId("/users/subjects/", id),
  },
  projects: {
    list: "/projects/",
    detail: (publicId: string) => withId("/projects/", publicId),
    archive: (publicId: string) => `/projects/${publicId}/archive/`,
    restore: (publicId: string) => `/projects/${publicId}/restore/`,
    activity: (publicId: string) => `/projects/${publicId}/activity/`,
  },
  studyPlans: {
    list: "/study-plans/",
    detail: (id: string | number) => withId("/study-plans/", id),
    tasks: (id: string | number) => `/study-plans/${id}/tasks/`,
    today: "/study-plans/today/",
    week: "/study-plans/week/",
    task: (id: string | number) => withId("/study-tasks/", id),
    taskComplete: (id: string | number) => `/study-tasks/${id}/complete/`,
    taskSkip: (id: string | number) => `/study-tasks/${id}/skip/`,
    taskReopen: (id: string | number) => `/study-tasks/${id}/reopen/`,
  },
  quizzes: {
    list: "/quizzes/",
    detail: (id: string | number) => withId("/quizzes/", id),
    start: (id: string | number) => `/quizzes/${id}/start/`,
    publish: (id: string | number) => `/quizzes/${id}/publish/`,
    archive: (id: string | number) => `/quizzes/${id}/archive/`,
    questions: "/quiz-questions/",
    question: (id: string | number) => withId("/quiz-questions/", id),
    attempts: "/quiz-attempts/",
    attempt: (id: string | number) => withId("/quiz-attempts/", id),
    attemptAnswer: (id: string | number) => `/quiz-attempts/${id}/answer/`,
    attemptSubmit: (id: string | number) => `/quiz-attempts/${id}/submit/`,
    attemptResult: (id: string | number) => `/quiz-attempts/${id}/result/`,
    attemptAbandon: (id: string | number) => `/quiz-attempts/${id}/abandon/`,
    questionBank: "/question-bank/",
  },
  sources: {
    list: "/student-sources/",
    detail: (id: string | number) => withId("/student-sources/", id),
    process: (id: string | number) => `/student-sources/${id}/process/`,
    capabilities: (id: string | number) => `/student-sources/${id}/capabilities/`,
    useWithCharacter: (id: string | number) => `/student-sources/${id}/use-with-character/`,
    collections: "/student-source-collections/",
    collection: (id: string | number) => withId("/student-source-collections/", id),
    collectionSources: (id: string | number) => `/student-source-collections/${id}/sources/`,
    collectionCapabilities: (id: string | number) =>
      `/student-source-collections/${id}/capabilities/`,
    collectionUseWithCharacter: (id: string | number) =>
      `/student-source-collections/${id}/use-with-character/`,
  },
  ai: {
    root: "/ai/",
    capabilities: "/ai/capabilities/",
    serviceHealth: "/ai/service-health/",
    jobs: "/ai/jobs/",
    job: (publicId: string) => `/ai/jobs/${publicId}/`,
    jobCancel: (publicId: string) => `/ai/jobs/${publicId}/cancel/`,
    jobRefresh: (publicId: string) => `/ai/jobs/${publicId}/refresh/`,
    jobFeedback: (publicId: string) => `/ai/jobs/${publicId}/feedback/`,
  },
  results: {
    recommendations: "/recommendations/",
    recommendation: (id: string | number) => withId("/recommendations/", id),
    recommendationMarkRead: (id: string | number) => `/recommendations/${id}/mark-read/`,
    summaries: "/summaries/",
    summary: (id: string | number) => withId("/summaries/", id),
    transcriptions: "/transcriptions/",
    transcription: (id: string | number) => withId("/transcriptions/", id),
  },
  subscriptions: {
    root: "/subscriptions/",
    me: "/subscriptions/me/",
    plans: "/subscriptions/plans/",
    plan: (id: string | number) => withId("/subscriptions/plans/", id),
  },
  notifications: {
    list: "/notifications/",
    detail: (id: string | number) => withId("/notifications/", id),
    unreadCount: "/notifications/unread-count/",
    markRead: (id: string | number) => `/notifications/${id}/mark-read/`,
    markAllRead: "/notifications/mark-all-read/",
  },
  support: {
    tickets: "/support/tickets/",
    ticket: (id: string | number) => withId("/support/tickets/", id),
    ticketMessages: (id: string | number) => `/support/tickets/${id}/messages/`,
    ticketClose: (id: string | number) => `/support/tickets/${id}/close/`,
  },
} as const;
