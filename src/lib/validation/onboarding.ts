import { z } from "zod";

/**
 * Numeric fields are validated as plain numbers here; the actual DOM
 * string -> number conversion (and empty-string -> undefined for the
 * optional field) happens at the `register(..., { valueAsNumber / setValueAs })`
 * call site, per react-hook-form convention — see onboarding/profile-setup/page.tsx.
 */
export const profileSetupSchema = z.object({
  education_stage: z.number().int().positive(),
  grade_level: z.number().int().positive(),
  specialization: z.string().optional().or(z.literal("")),
  study_goal: z.string().optional().or(z.literal("")),
  daily_study_hours: z.number().min(1).max(24).optional(),
});
export type ProfileSetupInput = z.infer<typeof profileSetupSchema>;
