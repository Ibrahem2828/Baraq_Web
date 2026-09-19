/** App-wide defaults shared by the query layer, forms, and pagination. */
export const APP_DEFAULTS = {
  requestTimeoutMs: 20_000,
  queryStaleTimeMs: 30_000,
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;

/**
 * Upload constraints mirrored from the backend (`apps/sources/validators.py`
 * `ALLOWED_EXTENSIONS`). This list must not be wider than the backend's:
 * accepting a file the AI service cannot read means the upload succeeds and
 * the first character job fails minutes later.
 *
 * Images (jpg/jpeg/png/webp) and legacy Office (doc/ppt) were listed here
 * until the backend stopped accepting them -- the AI's `DocumentExtractor`
 * has no OCR path and no OLE reader. Re-add them here only when both sides
 * genuinely support them.
 */
export const SOURCE_UPLOAD = {
  /**
   * Platform ceiling only — NOT what to show the user.
   *
   * The limit a given user actually gets is `min(plan, platform)`, which the
   * backend computes and returns as `effective_limits.max_file_size_mb` on
   * `/subscriptions/me/`. Showing this constant told a Free user (10MB) that
   * 25MB was allowed. Use it solely as the fallback while that request is in
   * flight, and keep it in step with STUDENT_SOURCE_MAX_UPLOAD_MB.
   */
  platformMaxSizeBytes: 50 * 1024 * 1024,
  acceptedExtensions: ["pdf", "txt", "docx", "pptx", "mp3", "m4a", "wav"],
  acceptedMimeTypes: [
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "audio/*",
  ],
} as const;

/** AI job polling backoff schedule, ported from the mobile app's `useAIJobsLifecycle`. */
export const AI_JOB_POLLING = {
  scheduleMs: [
    { maxAgeMs: 20_000, delayMs: 2_000 },
    { maxAgeMs: 60_000, delayMs: 3_000 },
    { maxAgeMs: 180_000, delayMs: 5_000 },
  ],
  fallbackDelayMs: 10_000,
  retryAfterFailureMs: 5_000,
} as const;

export function getAIJobPollingDelay(createdAt: Date): number {
  const ageMs = Date.now() - createdAt.getTime();
  const tier = AI_JOB_POLLING.scheduleMs.find((entry) => ageMs < entry.maxAgeMs);
  return tier?.delayMs ?? AI_JOB_POLLING.fallbackDelayMs;
}

export function getAIJobPollingInterval(job: {
  status: string;
  created_at: string;
} | undefined): number | false {
  if (!job || job.status === "completed" || job.status === "failed" || job.status === "canceled") {
    return false;
  }
  return getAIJobPollingDelay(new Date(job.created_at));
}
