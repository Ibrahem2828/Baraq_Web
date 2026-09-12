import { SOURCE_UPLOAD } from "@/config/constants";

/** Message keys under `library.upload.*`, meant to be passed to `useTranslations()`'s `t()`. */
export type SourceFileErrorKey = "library.upload.unsupportedType" | "library.upload.fileTooLarge";

/**
 * Client-side mirror of the backend's upload validators
 * (`apps/sources/validators.py`, see `SOURCE_UPLOAD` in `@/config/constants`).
 * Returns a translated-message key on failure, or `null` when the file is valid.
 */
export function validateSourceFile(file: File): SourceFileErrorKey | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const acceptedExtensions: readonly string[] = SOURCE_UPLOAD.acceptedExtensions;
  if (!extension || !acceptedExtensions.includes(extension)) {
    return "library.upload.unsupportedType";
  }
  if (file.size > SOURCE_UPLOAD.maxSizeBytes) {
    return "library.upload.fileTooLarge";
  }
  return null;
}
