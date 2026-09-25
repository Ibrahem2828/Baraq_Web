"use client";

import { createRequestId } from "@/lib/utils/request-id";
import { ensureCsrfToken } from "./client";
import type { ErrorEnvelope, SuccessEnvelope } from "./envelope";
import { ApiError, fromErrorEnvelope } from "./errors";

export interface UploadOptions {
  /** Called with the fraction of the request body sent so far (0..1). */
  onProgress?: (fraction: number) => void;
  /** Aborting it cancels the upload; the promise rejects with an AbortError. */
  signal?: AbortSignal;
}

/** Longer than any upload the server accepts (see server-timeouts.cjs). */
const UPLOAD_MIN_TOKEN_VALIDITY_SECONDS = 20 * 60;

function responseHeaders(xhr: XMLHttpRequest): Headers {
  const headers = new Headers();
  for (const line of xhr.getAllResponseHeaders().trim().split(/[\r\n]+/)) {
    const index = line.indexOf(":");
    if (index > 0) headers.append(line.slice(0, index).trim(), line.slice(index + 1).trim());
  }
  return headers;
}

function parse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Multipart upload through the BFF with real progress and no fixed timeout.
 *
 * `apiClient` aborts every request after 20s (APP_DEFAULTS.requestTimeoutMs),
 * which is right for JSON calls and fatal for files: a 17MB PDF needs about
 * 7 Mbps to finish in 20s, so on ordinary connections every larger upload was
 * cancelled and reported as "Couldn't reach the server". An upload ends when
 * it completes, fails, or the learner cancels it. XMLHttpRequest is used
 * because fetch still exposes no upload progress.
 */
export async function uploadWithProgress<T>(
  path: string,
  form: FormData,
  options: UploadOptions = {},
): Promise<T> {
  const normalizedPath = path.replace(/^\/+/, "").replace(/\/+$/, "");
  // The upload's request keeps the cookies it started with until the whole
  // file has arrived, so start it with an access token that outlives it.
  await fetch(`/api/auth/session?minValiditySeconds=${UPLOAD_MIN_TOKEN_VALIDITY_SECONDS}`, {
    credentials: "same-origin",
    cache: "no-store",
  }).catch(() => undefined);
  const csrfToken = await ensureCsrfToken();

  return new Promise<T>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new DOMException("Upload canceled", "AbortError"));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/bff/${normalizedPath}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("X-Request-ID", createRequestId());
    xhr.setRequestHeader("X-CSRF-Token", csrfToken);
    xhr.setRequestHeader("Accept", "application/json");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) options.onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      const body = parse(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.(1);
        resolve((body as SuccessEnvelope<T> | null)?.data as T);
        return;
      }
      reject(fromErrorEnvelope(body as ErrorEnvelope | null, xhr.status, responseHeaders(xhr)));
    };
    xhr.onerror = () =>
      reject(new ApiError({ code: "NETWORK", message: "Network request failed" }));
    xhr.onabort = () => reject(new DOMException("Upload canceled", "AbortError"));

    options.signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}

export function isUploadCanceled(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
