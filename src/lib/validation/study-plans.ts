import { z } from "zod";

// Plain z.number() + RHF's `valueAsNumber` on the input (see the create-plan
// form) rather than `z.coerce`/`z.preprocess` — the latter breaks
// `zodResolver`'s generic inference with this zod v4 / react-hook-form v7.87
// combination (the input type collapses to `unknown`). This is the
// RHF-idiomatic fix, not a workaround for a real gap — see the same pattern
// in `src/lib/validation/onboarding.ts`.
export const createStudyPlanSchema = z.object({
  title: z.string().min(1),
  subject: z.number().int().positive(),
  description: z.string().optional(),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  daily_study_minutes: z.number().int().min(5),
});
export type CreateStudyPlanInput = z.infer<typeof createStudyPlanSchema>;
