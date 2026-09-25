"use client";

import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/feedback/Toast";
import { useApiErrorMessage } from "@/lib/api/useApiErrorMessage";
import type { CreateAIJobInput } from "@/features/ai-jobs/api/aiJobsApi";
import { useCreateAIJob } from "./useAIJob";

/**
 * Start a character's job from its hub: open the job page when it is
 * accepted, and say why when it is not. The hubs used to ignore failures, so
 * "this project has no subject" or "monthly limit reached" left the learner
 * looking at a button that did nothing.
 */
export function useStartAIJob() {
  const router = useRouter();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const createAIJob = useCreateAIJob();

  function start(input: CreateAIJobInput) {
    createAIJob.mutate(input, {
      onSuccess: (job) => router.push(`/ai-jobs/${job.public_id}`),
      onError: (error) => toast({ title: errorMessage(error), variant: "error" }),
    });
  }

  return { start, isPending: createAIJob.isPending };
}
