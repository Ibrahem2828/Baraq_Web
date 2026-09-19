import { describe, expect, it } from "vitest";
import { SOURCE_UPLOAD } from "@/config/constants";
import { validateSourceFile } from "@/features/sources/validation";

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

describe("source upload format contract", () => {
  it("offers exactly the backend allowlist — no more, no less", () => {
    expect([...SOURCE_UPLOAD.acceptedExtensions].sort()).toEqual([...BACKEND_ALLOWED].sort());
  });

  it.each(BACKEND_ALLOWED)("accepts .%s", (extension) => {
    expect(validateSourceFile(file(`lesson.${extension}`))).toBeNull();
  });

  it.each(REMOVED)("rejects .%s, which no AI pipeline can process", (extension) => {
    expect(validateSourceFile(file(`lesson.${extension}`))).toBe("library.upload.unsupportedType");
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
    expect(validateSourceFile(file("payload.exe"))).toBe("library.upload.unsupportedType");
  });
});
