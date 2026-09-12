import "@testing-library/jest-dom/vitest";

// Minimal server-env values so any test that transitively imports
// `src/config/env.ts` (Zod-validated, throws on missing vars) doesn't fail
// for reasons unrelated to what the test is actually checking.
process.env.APP_ENV ??= "development";
process.env.BACKEND_API_URL ??= "http://localhost:8000";
