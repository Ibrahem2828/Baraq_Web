/** App-wide defaults shared by the query layer, forms, and pagination. */
export const APP_DEFAULTS = {
  requestTimeoutMs: 20_000,
  queryStaleTimeMs: 30_000,
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;

/** Upload constraints mirrored from the backend (`apps/sources/validators.py`). */
export const SOURCE_UPLOAD = {
  maxSizeBytes: 25 * 1024 * 1024,
  acceptedExtensions: [
    "pdf",
    "txt",
    "jpg",
    "jpeg",
    "png",
    "webp",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "mp3",
    "m4a",
    "wav",
  ],
  acceptedMimeTypes: [
    "application/pdf",
    "text/plain",
    "image/*",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
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
