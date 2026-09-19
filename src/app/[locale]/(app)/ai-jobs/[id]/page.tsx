"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAIJob, useCancelAIJob } from "@/features/ai-jobs/hooks/useAIJob";
import { isTerminalAIJobStatus } from "@/types/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";

const RESULT_ROUTE: Record<string, string> = {
  quiz: "/quizzes",
  study_plan: "/study-plans",
  recommendation: "/recommendations",
  summary: "/summaries",
  transcription: "/transcriptions",
};

export default function AIJobProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const router = useRouter();
  const job = useAIJob(id);
  const cancel = useCancelAIJob();

  if (job.isPending) return <LoadingState label={t("common.loading")} />;
  if (job.isError || !job.data) {
    return (
      <ErrorState
        title={t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => job.refetch()}
      />
    );
  }

  const data = job.data;
  const isTerminal = isTerminalAIJobStatus(data.status);
  const resultRoute = data.result_type ? RESULT_ROUTE[data.result_type] : undefined;
  // Prefer wording specific to what this character is actually doing
  // ("reading your source" reads very differently for Sada than for Fahes),
  // and fall back to the generic stage label when there is no specific copy.
  const characterKey = `aiJobs.stage.${data.character}.${data.progress_stage}`;
  const genericKey = `aiJobs.stage.${data.progress_stage}`;
  const stageLabel = t.has(characterKey)
    ? t(characterKey)
    : t.has(genericKey)
      ? t(genericKey)
      : data.progress_stage;

  return (
    <div>
      <PageHeader title={t("nav.characters")} description={data.task_type} />
      <Card className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <Badge
            variant={
              data.status === "failed"
                ? "destructive"
                : data.status === "completed"
                  ? "success"
                  : "info"
            }
          >
            {t.has(`aiJobs.status.${data.status}`)
              ? t(`aiJobs.status.${data.status}`)
              : data.status}
          </Badge>
          {!isTerminal ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancel.mutate(data.public_id)}
              loading={cancel.isPending}
            >
              {t("common.cancel")}
            </Button>
          ) : null}
        </div>

        {/*
         * Stage, not a percentage. The AI service reports progress_percent
         * as a constant 0 -- its own percentages were synthetic -- so any
         * number rendered here would be invented. The bar is indeterminate
         * while work is in flight and the stage says what is happening.
         */}
        <div className="flex flex-col gap-2">
          <Progress value={isTerminal ? 100 : 0} indeterminate={!isTerminal} />
          <p className="text-xs text-[color:var(--color-ink-soft)]">{stageLabel}</p>
        </div>

        {data.status === "failed" ? (
          <p className="text-sm text-[color:var(--color-destructive)]">
            {data.error_message ?? t("errors.SERVER")}
          </p>
        ) : null}

        {data.status === "completed" && resultRoute && data.result_id ? (
          <Button onClick={() => router.push(`${resultRoute}/${data.result_id}`)}>
            {t("common.seeAll")}
          </Button>
        ) : null}
      </Card>
    </div>
  );
}
