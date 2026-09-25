// @vitest-environment node
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { startCaptureServer, type CaptureServer } from "./capture-server";

/**
 * Uploads are spooled to disk in the BFF (src/lib/http/spool-body.ts) rather
 * than held in memory for the minutes a slow connection takes. What matters is
 * that the bytes still reach Django exactly, that the size limit still holds
 * when no Content-Length is sent, and that nothing is left on disk.
 */

let capture: CaptureServer;
const LIMIT = 1024 * 1024;

const cookieJar = vi.hoisted(() => new Map<string, { value: string }>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
    delete: (name: string) => cookieJar.delete(name),
  }),
}));

beforeAll(async () => {
  capture = await startCaptureServer();
  process.env.BACKEND_API_URL = capture.backendApiUrl.replace(/\/api\/v1$/, "");
  process.env.APP_ENV = "production";
  process.env.BFF_MAX_BODY_BYTES = String(LIMIT);
});

afterAll(async () => {
  await capture.close();
});

beforeEach(() => {
  capture.requests.length = 0;
  cookieJar.clear();
  cookieJar.set("baraq_csrf", { value: "csrf-token" });
  cookieJar.set("baraq_access", { value: "access-token" });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

async function spoolDirectories() {
  return (await readdir(tmpdir())).filter((name) => name.startsWith("bff-upload-"));
}

async function post(body: BodyInit, contentType: string, extraHeaders: Record<string, string> = {}) {
  const { NextRequest } = await import("next/server");
  const { POST } = await import("@/app/api/bff/[...path]/route");
  return POST(
    new NextRequest("https://web.baraqapp.com/api/bff/student-sources", {
      method: "POST",
      headers: {
        origin: "https://web.baraqapp.com",
        host: "web.baraqapp.com",
        "x-csrf-token": "csrf-token",
        "content-type": contentType,
        ...extraHeaders,
      },
      body,
      // Node needs duplex for a streamed request body; the DOM type lacks it.
      duplex: "half",
    } as unknown as ConstructorParameters<typeof NextRequest>[1]),
    { params: Promise.resolve({ path: ["student-sources"] }) },
  );
}

function multipart(bytes: Uint8Array) {
  const form = new FormData();
  form.set("title", "كتاب علوم");
  form.set("file", new File([bytes.buffer as ArrayBuffer], "Sci-Biology.pdf", { type: "application/pdf" }));
  return form;
}

describe("BFF upload spooling", () => {
  it("delivers a binary upload to Django byte-for-byte and leaves nothing on disk", async () => {
    const before = await spoolDirectories();
    const bytes = new Uint8Array(700 * 1024).map((_, index) => (index * 31) % 256);
    const form = multipart(bytes);
    const encoded = new Uint8Array(await new Response(form).arrayBuffer());
    const contentType = new Response(form).headers.get("content-type")!;
    capture.reply(201, { success: true, data: { id: 1 } });

    const response = await post(encoded, contentType);

    expect(response.status).toBe(201);
    const upstream = capture.requests[0]!;
    expect(upstream.url).toBe("/api/v1/student-sources/");
    expect(String(upstream.headers["content-type"])).toBe(contentType);
    expect(Buffer.compare(upstream.rawBody, Buffer.from(encoded))).toBe(0);
    expect(await spoolDirectories()).toEqual(before);
  });

  it("refuses an oversized body that declares no Content-Length, without calling Django", async () => {
    const before = await spoolDirectories();
    const chunk = new Uint8Array(256 * 1024);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= 8) return controller.close();
        sent += 1;
        controller.enqueue(chunk);
      },
    });

    const response = await post(stream, "multipart/form-data; boundary=x");

    expect(response.status).toBe(413);
    expect((await response.json()).code).toBe("payload_too_large");
    // Reading stopped at the limit (1MB = 4 chunks) instead of consuming the
    // whole 2MB body first, as request.arrayBuffer() did.
    expect(sent).toBeLessThan(8);
    expect(capture.requests).toHaveLength(0);
    expect(await spoolDirectories()).toEqual(before);
  });
});
