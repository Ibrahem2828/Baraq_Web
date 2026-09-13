/**
 * Server-only environment configuration.
 *
 * Never prefixed `NEXT_PUBLIC_` — these values must not reach the browser bundle.
 * Importing this module from a Client Component is a build-time error (enforced by
 * the `server-only` import) because it can carry the backend origin, cookie
 * security flags, and other values that should never ship to the client.
 *
 * Client-safe values live in `./env.public.ts`.
 */
import "server-only";
import { z } from "zod";

const appEnvSchema = z.enum(["development", "staging", "production"]);

const serverEnvSchema = z.object({
  APP_ENV: appEnvSchema.default("development"),
  BACKEND_API_URL: z
    .string()
    .url()
    .refine((value) => !value.endsWith("/"), "BACKEND_API_URL must not end with a trailing slash"),
  BACKEND_API_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
  /** Hard cap on request bodies the BFF proxy will forward upstream (bytes). Default gives headroom above `SOURCE_UPLOAD.maxSizeBytes` (25MB) for multipart overhead. */
  BFF_MAX_BODY_BYTES: z.coerce.number().int().positive().default(30 * 1024 * 1024),
  AUTH_COOKIE_SECURE: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  AUTH_COOKIE_DOMAIN: z.string().optional().default(""),
  FRONTEND_PASSWORD_RESET_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().optional().default(""),
});

function loadServerEnv() {
  const parsed = serverEnvSchema.safeParse({
    APP_ENV: process.env.APP_ENV,
    BACKEND_API_URL: process.env.BACKEND_API_URL,
    BACKEND_API_TIMEOUT_MS: process.env.BACKEND_API_TIMEOUT_MS,
    BFF_MAX_BODY_BYTES: process.env.BFF_MAX_BODY_BYTES,
    AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE,
    AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,
    FRONTEND_PASSWORD_RESET_URL: process.env.FRONTEND_PASSWORD_RESET_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
  });

  if (!parsed.success) {
    // Fail loudly and early: a misconfigured server env must never fall back to
    // pointing at production (or nowhere) silently.
    const formatted = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment configuration: ${formatted}`);
  }

  const secureDefault = parsed.data.APP_ENV === "production";

  return {
    ...parsed.data,
    AUTH_COOKIE_SECURE: parsed.data.AUTH_COOKIE_SECURE ?? secureDefault,
  };
}

export const serverEnv = loadServerEnv();

export const isProduction = serverEnv.APP_ENV === "production";
export const isStaging = serverEnv.APP_ENV === "staging";
export const isDevelopment = serverEnv.APP_ENV === "development";
