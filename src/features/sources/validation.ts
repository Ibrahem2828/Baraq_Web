import { SOURCE_UPLOAD } from "@/config/constants";

/** Message keys under `library.upload.*`, meant to be passed to `useTranslations()`'s `t()`. */
export type SourceFileErrorKey = "library.upload.unsupportedType" | "library.upload.fileTooLarge";

/**
 * Client-side mirror of the backend's upload validators
 * (`apps/sources/validators.py`, see `SOURCE_UPLOAD` in `@/config/constants`).
 * Returns a translated-message key on failure, or `null` when the file is valid.
 *
 * `maxSizeBytes` must be the *effective* limit for this user — `min(plan,
 * platform)`, which the backend returns as
 * `effective_limits.max_file_size_mb` on `/subscriptions/me/`. It is a
 * required argument rather than a default so a caller cannot silently fall
 * back to the platform ceiling and promise a Free user five times what their
 * plan allows. The backend re-checks regardless; this only spares the user a
 * pointless upload.
 */
export function validateSourceFile(file: File, maxSizeBytes: number): SourceFileErrorKey | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const acceptedExtensions: readonly string[] = SOURCE_UPLOAD.acceptedExtensions;
  if (!extension || !acceptedExtensions.includes(extension)) {
    return "library.upload.unsupportedType";
  }
  if (file.size > maxSizeBytes) {
    return "library.upload.fileTooLarge";
  }
  return null;
}

/**
 * The upload limit to enforce and display, in bytes. Falls back to the
 * platform ceiling only while `/subscriptions/me/` is still loading.
 */
export function effectiveUploadLimitBytes(effectiveMaxFileSizeMb: number | undefined): number {
  if (typeof effectiveMaxFileSizeMb !== "number" || !Number.isFinite(effectiveMaxFileSizeMb)) {
    return SOURCE_UPLOAD.platformMaxSizeBytes;
  }
  return Math.max(0, effectiveMaxFileSizeMb) * 1024 * 1024;
}
