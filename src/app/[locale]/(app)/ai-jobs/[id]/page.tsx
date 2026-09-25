"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { Clock3, RefreshCw, Sparkles } from "lucide-react";
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
import { domainErrorMessageKey } from "@/lib/api/error-messages";

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
  const isWorking = !isTerminal;
  const resultRoute = data.result_type ? RESULT_ROUTE[data.result_type] : undefined;
  const learnerRequest = data.input_payload?.instructions || data.input_payload?.learner_goal || "";
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
  const failureKey = domainErrorMessageKey(data.error_code);
  const failureMessage = failureKey && t.has(failureKey)
    ? t(failureKey)
      : data.error_message ?? t("errors.SERVER");

  const updatedAt = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(data.updated_at));

  return (
    <div>
      <PageHeader
        title={t("aiJobs.progressTitle")}
        description={t("aiJobs.progressDescription")}
      />
      <Card className="relative overflow-hidden">
        {isWorking ? (
          <div className="absolute inset-x-0 top-0 h-1 bg-[color:var(--color-accent-solid)]/15">
            <div className="h-full w-1/3 animate-progress-indeterminate rounded-full bg-[color:var(--color-accent-solid)]" />
          </div>
        ) : null}
        <div className="flex flex-col gap-6 p-1">
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

        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--color-accent-solid)]/12 text-[color:var(--color-accent)]">
            {isWorking ? <Sparkles className="size-6 animate-pulse" aria-hidden="true" /> : <Clock3 className="size-6" aria-hidden="true" />}
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="font-bold text-[color:var(--color-ink)]">
              {isWorking ? t("aiJobs.workingTitle") : t("aiJobs.resultTitle")}
            </h2>
            <p className="text-sm text-[color:var(--color-ink-soft)]">
              {isWorking ? t("aiJobs.workingDescription") : stageLabel}
            </p>
          </div>
        </div>

        {/*
         * Stage, not a percentage. The AI service reports progress_percent
         * as a constant 0 -- its own percentages were synthetic -- so any
         * number rendered here would be invented. The bar is indeterminate
         * while work is in flight and the stage says what is happening.
         */}
        <div className="flex flex-col gap-2">
          <Progress value={isTerminal ? 100 : 0} indeterminate={!isTerminal} />
          <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--color-ink-soft)]">
            <p>{stageLabel}</p>
            {isWorking ? <span>{t("aiJobs.updatedAt", { time: updatedAt })}</span> : null}
          </div>
        </div>

        {isWorking ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[color:var(--color-bg-soft)] px-4 py-3">
            <p className="text-xs text-[color:var(--color-ink-soft)]">{t("aiJobs.autoRefresh")}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => job.refetch()}
              loading={job.isFetching}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              {t("aiJobs.refresh")}
            </Button>
          </div>
        ) : null}

        {data.status === "failed" ? (
          <p className="text-sm text-[color:var(--color-destructive)]">
            {failureMessage}
          </p>
        ) : null}

        {learnerRequest ? (
          <p className="rounded-[var(--radius-md)] bg-[color:var(--color-bg-soft)] px-3 py-2 text-sm text-[color:var(--color-ink-soft)]">
            <span className="font-semibold text-[color:var(--color-ink)]">{t("aiJobs.yourRequest")}: </span>
            {learnerRequest}
          </p>
        ) : null}

        {data.status === "completed" && resultRoute && data.result_id ? (
          <Button onClick={() => router.push(`${resultRoute}/${data.result_id}`)}>
            {t("aiJobs.openResult")}
          </Button>
        ) : null}
        </div>
      </Card>
    </div>
  );
}
