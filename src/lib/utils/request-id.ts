/** Client-generated correlation id, echoed back by the backend in `request_id`. */
export function createRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `web-${timestamp}-${random}`;
}
