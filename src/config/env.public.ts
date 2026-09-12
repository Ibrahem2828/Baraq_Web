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
  NEXT_PUBLIC_SITE_URL: z.string().url().default("https://baraqapp.com"),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(["ar", "en"]).default("ar"),
  NEXT_PUBLIC_APP_VERSION: z.string().default("0.1.0"),
  NEXT_PUBLIC_FEATURE_KHOLASA: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
  NEXT_PUBLIC_FEATURE_SADA: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
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
    NEXT_PUBLIC_FEATURE_KHOLASA: process.env.NEXT_PUBLIC_FEATURE_KHOLASA,
    NEXT_PUBLIC_FEATURE_SADA: process.env.NEXT_PUBLIC_FEATURE_SADA,
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
