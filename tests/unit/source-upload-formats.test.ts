import { describe, expect, it } from "vitest";
import { SOURCE_UPLOAD } from "@/config/constants";
import { validateSourceFile, effectiveUploadLimitBytes } from "@/features/sources/validation";

/**
 * Format-contract guard across three layers.
 *
 * The backend allowlist (`apps/sources/validators.py ALLOWED_EXTENSIONS`) is
 * itself constrained by what Baraq_AI can read: `DocumentExtractor.extract()`
 * dispatches on txt/pdf/docx/pptx, and the Sada pipeline handles audio/*.
 * This app must never offer more than that, or the user uploads successfully
 * and the first character job fails minutes later with a generic message.
 */

/** Mirrors apps/sources/validators.py ALLOWED_EXTENSIONS exactly. */
const BACKEND_ALLOWED = ["pdf", "txt", "docx", "pptx", "mp3", "m4a", "wav"];

/** Accepted by the backend until it stopped promising what the AI can't do. */
const REMOVED = ["jpg", "jpeg", "png", "webp", "doc", "ppt"];

function file(name: string, size = 1024): File {
  return new File([new Uint8Array(size)], name);
}

const MB = 1024 * 1024;
/** A generous limit, so format assertions are never size assertions. */
const ANY_SIZE = 500 * MB;

describe("source upload format contract", () => {
  it("offers exactly the backend allowlist — no more, no less", () => {
    expect([...SOURCE_UPLOAD.acceptedExtensions].sort()).toEqual([...BACKEND_ALLOWED].sort());
  });

  it.each(BACKEND_ALLOWED)("accepts .%s", (extension) => {
    expect(validateSourceFile(file(`lesson.${extension}`), ANY_SIZE)).toBeNull();
  });

  it.each(REMOVED)("rejects .%s, which no AI pipeline can process", (extension) => {
    expect(validateSourceFile(file(`lesson.${extension}`), ANY_SIZE)).toBe(
      "library.upload.unsupportedType",
    );
  });

  it("advertises no mime type that would let a removed format through", () => {
    // `image/*` used to be listed, which made the native file picker offer
    // every image even though none can be processed.
    expect(SOURCE_UPLOAD.acceptedMimeTypes).not.toContain("image/*");
    for (const mime of SOURCE_UPLOAD.acceptedMimeTypes) {
      expect(mime.startsWith("image/")).toBe(false);
    }
  });

  it("still rejects an unknown extension", () => {
    expect(validateSourceFile(file("payload.exe"), ANY_SIZE)).toBe(
      "library.upload.unsupportedType",
    );
  });

  it("enforces the effective limit, not the platform ceiling", () => {
    // A Free user's real limit is 10MB even though the platform accepts 50.
    const freeLimit = effectiveUploadLimitBytes(10);
    expect(validateSourceFile(file("lesson.pdf", 9 * MB), freeLimit)).toBeNull();
    expect(validateSourceFile(file("lesson.pdf", 11 * MB), freeLimit)).toBe(
      "library.upload.fileTooLarge",
    );
  });

  it("accepts a file exactly at the limit and rejects one byte over", () => {
    const limit = effectiveUploadLimitBytes(1);
    expect(validateSourceFile(file("lesson.pdf", MB), limit)).toBeNull();
    expect(validateSourceFile(file("lesson.pdf", MB + 1), limit)).toBe(
      "library.upload.fileTooLarge",
    );
  });

  it("falls back to the platform ceiling only while the plan is unknown", () => {
    expect(effectiveUploadLimitBytes(undefined)).toBe(SOURCE_UPLOAD.platformMaxSizeBytes);
    expect(effectiveUploadLimitBytes(10)).toBe(10 * MB);
  });

  it("keeps the platform fallback in step with the backend ceiling", () => {
    // STUDENT_SOURCE_MAX_UPLOAD_MB in config/settings.py, itself bounded by
    // Baraq_AI's max_source_file_bytes (50MB).
    expect(SOURCE_UPLOAD.platformMaxSizeBytes).toBe(50 * MB);
  });
});
