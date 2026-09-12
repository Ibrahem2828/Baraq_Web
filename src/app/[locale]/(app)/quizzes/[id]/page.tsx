"use client";

import { use, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Archive } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  useQuiz,
  usePublishQuiz,
  useArchiveQuiz,
  useStartQuizAttempt,
} from "@/features/quizzes/hooks/useQuizzes";
import { isApiError } from "@/lib/api/errors";
import type { QuizStatus } from "@/types/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FadeIn } from "@/components/motion/FadeIn";

const STATUS_BADGE_VARIANT: Record<QuizStatus, "neutral" | "success" | "warning"> = {
  draft: "neutral",
  published: "success",
  archived: "warning",
};

export default function QuizDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const quiz = useQuiz(id);
  const publishQuiz = usePublishQuiz();
  const archiveQuiz = useArchiveQuiz();
  const startAttempt = useStartQuizAttempt();

  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  if (quiz.isPending) return <LoadingState label={t("common.loading")} />;
  if (quiz.isError || !quiz.data) {
    return (
      <ErrorState
        title={isApiError(quiz.error) ? t(`errors.${quiz.error.code}`) : t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => quiz.refetch()}
      />
    );
  }

  const data = quiz.data;

  function handleStart() {
    setStartError(null);
    startAttempt.mutate(id, {
      onSuccess: (result) => {
        router.push(`/quizzes/attempts/${result.attempt_id}`);
      },
      onError: (error) => {
        setStartError(isApiError(error) ? t(`errors.${error.code}`) : t("errors.UNKNOWN"));
      },
    });
  }

  return (
    <div>
      <PageHeader
        title={data.title}
        description={data.description ?? undefined}
        actions={
          data.status !== "archived" ? (
            // No dedicated "Archive" action label in `quizzes.*` yet (see final report).
            <Button variant="outline" size="sm" onClick={() => setArchiveConfirmOpen(true)}>
              <Archive className="size-4" aria-hidden="true" />
              {locale === "ar" ? "أرشفة" : "Archive"}
            </Button>
          ) : undefined
        }
      />

      <FadeIn preset="slide-up">
        <Card className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_BADGE_VARIANT[data.status]}>
              {t(`quizzes.status.${data.status}`)}
            </Badge>
            <Badge variant="neutral">
              {t("quizzes.questionsCount", { count: data.questions_count })}
            </Badge>
            {data.time_limit_minutes ? (
              <Badge variant="neutral">
                {t("quizzes.timeLimit", { minutes: data.time_limit_minutes })}
              </Badge>
            ) : null}
          </div>

          {data.topic ? (
            <p className="text-sm text-[color:var(--color-ink-soft)]">{data.topic}</p>
          ) : null}

          {startError ? (
            <p role="alert" className="text-xs text-[color:var(--color-destructive)]">
              {startError}
            </p>
          ) : null}

          <div className="flex gap-3">
            {data.status === "draft" ? (
              // "Publish" has no dedicated key in the `quizzes.*` message namespace yet
              // (see final report) — falls back to a small inline bilingual label.
              <Button onClick={() => publishQuiz.mutate(id)} loading={publishQuiz.isPending}>
                {locale === "ar" ? "نشر" : "Publish"}
              </Button>
            ) : null}
            {data.status === "published" ? (
              <Button onClick={handleStart} loading={startAttempt.isPending}>
                {t("quizzes.start")}
              </Button>
            ) : null}
          </div>
        </Card>
      </FadeIn>

      <ConfirmationDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title={locale === "ar" ? "أرشفة" : "Archive"}
        description={data.title}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        destructive
        loading={archiveQuiz.isPending}
        onConfirm={() => {
          archiveQuiz.mutate(id, {
            onSuccess: () => setArchiveConfirmOpen(false),
          });
        }}
      />
    </div>
  );
}
