import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({ ensureCsrfToken: async () => "csrf-token" }));

/** Just enough XMLHttpRequest to drive uploadWithProgress deterministically. */
class FakeXhr {
  static last: FakeXhr;
  method = "";
  url = "";
  headers: Record<string, string> = {};
  status = 0;
  responseText = "";
  sentBody: unknown;
  withCredentials = false;
  aborted = false;
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  getAllResponseHeaders() {
    return "content-type: application/json\r\nx-request-id: req-1";
  }
  send(body: unknown) {
    this.sentBody = body;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
  respond(status: number, body: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(body);
    this.onload?.();
  }
}

beforeEach(() => {
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function start(options: Parameters<typeof import("@/lib/api/upload").uploadWithProgress>[2] = {}) {
  const { uploadWithProgress } = await import("@/lib/api/upload");
  const form = new FormData();
  form.set("title", "كتاب");
  const promise = uploadWithProgress<{ id: number }>("/student-sources/", form, options);
  await vi.waitFor(() => expect(FakeXhr.last?.sentBody).toBe(form));
  return { promise, xhr: FakeXhr.last, form };
}

describe("uploadWithProgress", () => {
  it("posts the form to the BFF with CSRF, reports progress and resolves the envelope's data", async () => {
    const progress: number[] = [];
    const { promise, xhr } = await start({ onProgress: (value) => progress.push(value) });

    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("/api/bff/student-sources");
    expect(xhr.headers["X-CSRF-Token"]).toBe("csrf-token");
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 25, total: 100 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 });
    xhr.respond(201, { success: true, data: { id: 7 } });

    await expect(promise).resolves.toEqual({ id: 7 });
    expect(progress).toEqual([0.25, 1, 1]);
  });

  it("has no timeout of its own: a slow upload is still pending long after 20s", async () => {
    vi.useFakeTimers();
    try {
      const { promise, xhr } = await start();
      let settled = false;
      promise.then(() => (settled = true), () => (settled = true));
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
      expect(settled).toBe(false);
      xhr.respond(201, { success: true, data: { id: 1 } });
      await expect(promise).resolves.toEqual({ id: 1 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("turns an error envelope into an ApiError with the backend code", async () => {
    const { promise, xhr } = await start();
    xhr.respond(403, { success: false, message: "limit", code: "file_size_limit_exceeded" });
    await expect(promise).rejects.toMatchObject({ code: "SUBSCRIPTION_LIMIT", status: 403 });
  });

  it("reports a dropped connection as NETWORK", async () => {
    const { promise, xhr } = await start();
    xhr.onerror?.();
    await expect(promise).rejects.toMatchObject({ code: "NETWORK" });
  });

  it("cancels when the signal aborts", async () => {
    const { isUploadCanceled } = await import("@/lib/api/upload");
    const controller = new AbortController();
    const { promise, xhr } = await start({ signal: controller.signal });
    controller.abort();
    const error = await promise.catch((caught: unknown) => caught);
    expect(xhr.aborted).toBe(true);
    expect(isUploadCanceled(error)).toBe(true);
  });
});
