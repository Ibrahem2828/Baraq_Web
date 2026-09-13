"use client";

import { useLocale, useTranslations } from "next-intl";
import { FolderKanban, FileQuestion } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useQuizzes } from "@/features/quizzes/hooks/useQuizzes";
import { isApiError } from "@/lib/api/errors";
import type { DifficultyLevel } from "@/types/domain";
import type { QuizStatus } from "@/types/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

const STATUS_BADGE_VARIANT: Record<QuizStatus, "neutral" | "success" | "warning"> = {
  draft: "neutral",
  published: "success",
  archived: "warning",
};

// Fahes-generation and difficulty copy has no entry in the shared
// `quizzes.*` message namespace yet (see final report) — kept as a small local
// bilingual lookup rather than inventing new top-level message keys.
function localText(locale: string, en: string, ar: string): string {
  return locale === "ar" ? ar : en;
}

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; en: string; ar: string }[] = [
  { value: "easy", en: "Easy", ar: "سهل" },
  { value: "medium", en: "Medium", ar: "متوسط" },
  { value: "hard", en: "Hard", ar: "صعب" },
];

/**
 * A read-only, cross-project browse of every quiz the user owns. Per
 * 04_WEB_APP.md §4/§11, no AI feature (and, per the backend's own
 * `A project is required to create a quiz` rule, no manual quiz either) may
 * be created without a Project in context — creating a quiz now only happens
 * inside a project's workspace (Fahes's hub, reached via `/characters/fahes`
 * with `?project=`).
 */
export default function QuizzesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const quizzes = useQuizzes();

  return (
    <div>
      <PageHeader
        title={t("quizzes.title")}
        description={t("quizzes.subtitle")}
        actions={
          <Button asChild>
            <Link href="/projects">
              <FolderKanban className="size-4" aria-hidden="true" />
              {t("quizzes.goToProject")}
            </Link>
          </Button>
        }
      />

      {quizzes.isPending ? (
        <LoadingState label={t("common.loading")} />
      ) : quizzes.isError ? (
        <ErrorState
          title={
            isApiError(quizzes.error) ? t(`errors.${quizzes.error.code}`) : t("errors.UNKNOWN")
          }
          retryLabel={t("common.retry")}
          onRetry={() => quizzes.refetch()}
        />
      ) : quizzes.data.items.length === 0 ? (
        <EmptyState
          icon={<FileQuestion className="size-6" aria-hidden="true" />}
          title={t("emptyStates.quizzes.title")}
          description={t("emptyStates.quizzes.description")}
          action={
            <Button asChild>
              <Link href="/projects">{t("quizzes.goToProject")}</Link>
            </Button>
          }
        />
      ) : (
        <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.data.items.map((quiz) => {
            const difficultyOption = DIFFICULTY_OPTIONS.find(
              (option) => option.value === quiz.difficulty_level,
            );
            return (
              <StaggerItem key={quiz.id}>
                <Card
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/quizzes/${quiz.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") router.push(`/quizzes/${quiz.id}`);
                  }}
                  className="flex h-full cursor-pointer flex-col justify-between transition-shadow hover:shadow-[var(--shadow-md)]"
                >
                  <CardHeader className="gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
                      <Badge variant={STATUS_BADGE_VARIANT[quiz.status]}>
                        {t(`quizzes.status.${quiz.status}`)}
                      </Badge>
                    </div>
                    {quiz.description ? (
                      <CardDescription className="line-clamp-2">{quiz.description}</CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardFooter className="mt-0 flex flex-wrap gap-2">
                    <Badge variant="neutral">
                      {t("quizzes.questionsCount", { count: quiz.questions_count })}
                    </Badge>
                    {quiz.time_limit_minutes ? (
                      <Badge variant="neutral">
                        {t("quizzes.timeLimit", { minutes: quiz.time_limit_minutes })}
                      </Badge>
                    ) : null}
                    {difficultyOption ? (
                      <Badge variant="accent">
                        {localText(locale, difficultyOption.en, difficultyOption.ar)}
                      </Badge>
                    ) : null}
                  </CardFooter>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerIn>
      )}
    </div>
  );
}
