/**
 * Client-safe environment configuration.
 *
 * Only values prefixed `NEXT_PUBLIC_` belong here — anything else must go in
 * `./env.ts` (server-only). This module has no `server-only` guard on purpose:
 * it is imported from both Server and Client Components.
 */
import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("برّاق"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("https://web.baraqapp.com"),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(["ar", "en"]).default("ar"),
  NEXT_PUBLIC_APP_VERSION: z.string().default("0.1.0"),
  // The app build only (docs/MOBILE_APP.md): it calls the Django API
  // directly, where the web goes through its own /api/bff proxy.
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url()
    .refine(
      (value) =>
        value.startsWith("https://") || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(value),
      "must be https (plain http only for a local backend)",
    )
    .transform((value) => value.replace(/\/+$/, ""))
    .default("https://api.baraqapp.com"),
  NEXT_PUBLIC_FEATURE_ACCOUNT_DELETION: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  NEXT_PUBLIC_FEATURE_SUBSCRIPTIONS_CHECKOUT: z
    .string()
    .optional()
    .transform((value) => value === "true"),
});

function loadPublicEnv() {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_FEATURE_ACCOUNT_DELETION: process.env.NEXT_PUBLIC_FEATURE_ACCOUNT_DELETION,
    NEXT_PUBLIC_FEATURE_SUBSCRIPTIONS_CHECKOUT:
      process.env.NEXT_PUBLIC_FEATURE_SUBSCRIPTIONS_CHECKOUT,
  });

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid public environment configuration: ${formatted}`);
  }

  return parsed.data;
}

export const publicEnv = loadPublicEnv();
