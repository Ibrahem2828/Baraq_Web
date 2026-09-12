/**
 * Shapes for the Django backend's stable response envelope:
 * `{ success, message, data, meta?, request_id }` on success,
 * `{ success: false, message, code, errors, request_id }` on error.
 * See docs/WEB_API_CONTRACT_MAP.md for the verified contract.
 */

export interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

export interface SuccessEnvelope<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta | Record<string, unknown> | null;
  request_id?: string | null;
}

export interface ErrorEnvelope {
  success: false;
  message: string;
  code?: string;
  errors?: Record<string, string[] | string> | { detail?: string };
  request_id?: string | null;
  [key: string]: unknown;
}

export type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

export interface Paginated<T> {
  items: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export function isPaginationMeta(meta: unknown): meta is PaginationMeta {
  return (
    typeof meta === "object" &&
    meta !== null &&
    "count" in meta &&
    "next" in meta &&
    "previous" in meta
  );
}

/** Unwraps a paginated list envelope into a flat `{ items, count, next, previous }` shape. */
export function unwrapPaginated<T>(envelope: SuccessEnvelope<T[]>): Paginated<T> {
  const meta = envelope.meta;
  if (isPaginationMeta(meta)) {
    return { items: envelope.data, count: meta.count, next: meta.next, previous: meta.previous };
  }
  return { items: envelope.data, count: envelope.data.length, next: null, previous: null };
}
