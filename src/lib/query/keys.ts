/**
 * Query key factories, one per feature domain. Hierarchical array keys,
 * mirroring the mobile app's convention (`aiJobQueryKeys`, `sourceQueryKeys`,
 * etc.) so invalidation rules translate directly.
 *
 * Every `id` is coerced through `String(id)` before entering the key array.
 * Found in Phase 2.5 (a real, live bug, not a theoretical one): a page reads
 * a detail query using the route param — always a `string`, e.g. `"1"` from
 * `/recommendations/1` — while a mutation's `onSuccess` writes the cache
 * using the freshly-created/updated entity's `id` straight from the JSON
 * response — a `number`, e.g. `1`. React Query compares keys by deep
 * equality, so `["recommendations","detail","1"]` and
 * `["recommendations","detail",1]` are two *different* cache entries —
 * `queryClient.setQueryData(key(data.id), data)` silently updated the wrong
 * one, and the visible page (subscribed to the string-keyed entry) never
 * reflected the mutation's result without a manual refetch. Normalizing at
 * the factory means every caller — read or write, string or number — always
 * lands on the same key.
 */
function idKey(id: string | number): string {
  return String(id);
}

export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
    studentProfile: () => ["auth", "studentProfile"] as const,
  },
  subjects: {
    educationStages: () => ["subjects", "educationStages"] as const,
    list: (filters?: Record<string, unknown>) => ["subjects", "list", filters] as const,
    userSubjects: () => ["subjects", "userSubjects"] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: (filters?: Record<string, unknown>) => ["projects", "list", filters] as const,
    detail: (publicId: string) => ["projects", "detail", publicId] as const,
    activity: (publicId: string) => ["projects", "activity", publicId] as const,
  },
  studyPlans: {
    all: ["studyPlans"] as const,
    list: (filters?: Record<string, unknown>) => ["studyPlans", "list", filters] as const,
    detail: (id: string | number) => ["studyPlans", "detail", idKey(id)] as const,
    today: () => ["studyPlans", "today"] as const,
    week: (startDate?: string) => ["studyPlans", "week", startDate] as const,
    task: (id: string | number) => ["studyTasks", "detail", idKey(id)] as const,
  },
  quizzes: {
    all: ["quizzes"] as const,
    list: (filters?: Record<string, unknown>) => ["quizzes", "list", filters] as const,
    detail: (id: string | number) => ["quizzes", "detail", idKey(id)] as const,
    attempts: (filters?: Record<string, unknown>) => ["quizAttempts", "list", filters] as const,
    attempt: (id: string | number) => ["quizAttempts", "detail", idKey(id)] as const,
    questionBank: (filters?: Record<string, unknown>) => ["questionBank", "list", filters] as const,
  },
  sources: {
    all: ["sources"] as const,
    list: (filters?: Record<string, unknown>) => ["sources", "list", filters] as const,
    detail: (id: string | number) => ["sources", "detail", idKey(id)] as const,
    capabilities: (id: string | number) => ["sources", "capabilities", idKey(id)] as const,
    collections: (filters?: Record<string, unknown>) =>
      ["sourceCollections", "list", filters] as const,
    collection: (id: string | number) => ["sourceCollections", "detail", idKey(id)] as const,
  },
  aiJobs: {
    all: ["aiJobs"] as const,
    capabilities: () => ["aiJobs", "capabilities"] as const,
    list: (filters?: Record<string, unknown>) => ["aiJobs", "list", filters] as const,
    detail: (publicId: string) => ["aiJobs", "detail", publicId] as const,
  },
  results: {
    recommendations: (filters?: Record<string, unknown>) =>
      ["recommendations", "list", filters] as const,
    recommendation: (id: string | number) => ["recommendations", "detail", idKey(id)] as const,
    summaries: (filters?: Record<string, unknown>) => ["summaries", "list", filters] as const,
    summary: (id: string | number) => ["summaries", "detail", idKey(id)] as const,
    transcriptions: (filters?: Record<string, unknown>) =>
      ["transcriptions", "list", filters] as const,
    transcription: (id: string | number) => ["transcriptions", "detail", idKey(id)] as const,
  },
  subscriptions: {
    me: () => ["subscriptions", "me"] as const,
    plans: () => ["subscriptions", "plans"] as const,
  },
  notifications: {
    list: (filters?: Record<string, unknown>) => ["notifications", "list", filters] as const,
    unreadCount: () => ["notifications", "unreadCount"] as const,
  },
  support: {
    tickets: (filters?: Record<string, unknown>) => ["supportTickets", "list", filters] as const,
    ticket: (id: string | number) => ["supportTickets", "detail", idKey(id)] as const,
  },
} as const;
