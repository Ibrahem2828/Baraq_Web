/**
 * Every response from `/api/bff/*` and `/api/auth/*` carries user-scoped data
 * gated behind auth cookies — never let a shared cache, CDN, or the browser's
 * disk cache store it.
 */
export const NO_STORE_HEADERS = { "Cache-Control": "no-store, must-revalidate" } as const;
