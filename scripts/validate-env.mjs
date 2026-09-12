#!/usr/bin/env node
/**
 * Production environment validation gate — run in CI before deploy
 * (`npm run validate:env`). Deliberately dependency-free (no ts-node/tsx,
 * no Next.js runtime) so it can run as an early, fast CI step. The
 * authoritative runtime validation is `src/config/env.ts` (Zod) and
 * `src/config/env.public.ts`, which this script's rules mirror; keep them in
 * sync if either changes.
 */

const REQUIRED_SERVER_VARS = ["APP_ENV", "BACKEND_API_URL"];
const REQUIRED_PUBLIC_VARS = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_DEFAULT_LOCALE"];

const errors = [];

for (const key of [...REQUIRED_SERVER_VARS, ...REQUIRED_PUBLIC_VARS]) {
  if (!process.env[key]) {
    errors.push(`Missing required environment variable: ${key}`);
  }
}

const appEnv = process.env.APP_ENV;
if (appEnv && !["development", "staging", "production"].includes(appEnv)) {
  errors.push(`APP_ENV must be one of development|staging|production, got "${appEnv}"`);
}

const backendUrl = process.env.BACKEND_API_URL;
if (backendUrl) {
  if (backendUrl.endsWith("/")) {
    errors.push("BACKEND_API_URL must not end with a trailing slash");
  }
  if (appEnv === "production") {
    if (!backendUrl.startsWith("https://")) {
      errors.push("BACKEND_API_URL must be HTTPS in production");
    }
    if (/localhost|127\.0\.0\.1|\.sslip\.io/.test(backendUrl)) {
      errors.push("BACKEND_API_URL must not point at a local/sslip.io host in production");
    }
    // Guards against a staging deploy accidentally left pointed at prod, and
    // vice versa — the two must never be silently interchangeable.
    if (process.env.VERCEL_ENV === "preview" && /api\.baraqapp\.com/.test(backendUrl)) {
      errors.push(
        "A preview/staging deployment must not point BACKEND_API_URL at the production API",
      );
    }
  }
}

// Secrets must never be exposed to the client bundle.
for (const key of Object.keys(process.env)) {
  if (
    key.startsWith("NEXT_PUBLIC_") &&
    /SECRET|PASSWORD|PRIVATE_KEY|TOKEN(?!_LIFETIME)/i.test(key)
  ) {
    errors.push(`Suspicious secret-looking variable is marked NEXT_PUBLIC_: ${key}`);
  }
}

if (errors.length > 0) {
  console.error("Environment validation failed:\n");
  for (const error of errors) console.error(`  - ${error}`);
  console.error("");
  process.exit(1);
}

console.log("Environment validation passed.");
