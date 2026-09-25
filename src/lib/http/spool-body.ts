import "server-only";
import { createWriteStream } from "node:fs";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

export class BodyTooLargeError extends Error {
  constructor() {
    super("Request body too large");
    this.name = "BodyTooLargeError";
  }
}

/**
 * Read a request body through a temporary file instead of memory.
 *
 * An upload from a slow connection takes minutes to arrive. Buffering it with
 * `request.arrayBuffer()` held the whole file in the (512MB) web container for
 * all of that time, so a classroom of students uploading together could run it
 * out of memory. The body is written to disk as it arrives -- the size limit is
 * enforced on every chunk, so an oversized body stops early whatever its
 * Content-Length said -- and only read back once complete, to be forwarded
 * over the internal network in well under a second. A streamed upstream body
 * is avoided on purpose: Next.js's instrumented fetch can drop one-shot stream
 * bodies (see tests/wire/auth-transport.wire.test.ts), and a replay after a
 * token refresh needs the bytes again anyway.
 */
export async function readBodyViaDisk(
  body: ReadableStream<Uint8Array> | null,
  limitBytes: number,
): Promise<ArrayBuffer> {
  if (!body) return new ArrayBuffer(0);
  const directory = await mkdtemp(path.join(tmpdir(), "bff-upload-"));
  try {
    const file = path.join(directory, "body");
    const sink = createWriteStream(file);
    let received = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        received += chunk.length;
        callback(received > limitBytes ? new BodyTooLargeError() : null, chunk);
      },
    });
    try {
      await pipeline(
        Readable.fromWeb(body as unknown as NodeReadableStream<Uint8Array>),
        limiter,
        sink,
      );
    } finally {
      // The file must be closed before it can be removed (Windows refuses,
      // and an aborted pipeline closes its sink asynchronously).
      if (!sink.closed) await once(sink, "close").catch(() => undefined);
    }
    const bytes = await readFile(file);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  } finally {
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
}
