"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useQuizzes } from "@/features/quizzes/hooks/useQuizzes";
import { useStartAIJob } from "@/features/ai-jobs/hooks/useStartAIJob";
import { useActiveProject } from "@/features/projects/ActiveProjectContext";
import { SourceScopePicker, type SourceScope } from "@/features/sources/components/SourceScopePicker";
import type { CharacterDefinition } from "@/config/characters";
import type { QuizStatus } from "@/types/domain";
import { CharacterAvatar } from "@/components/brand/CharacterAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

const STATUS_VARIANT: Record<QuizStatus, "neutral" | "success" | "warning"> = {
  draft: "neutral",
  published: "success",
  archived: "warning",
};

/** Fahes's project-scoped hub: every quiz produced from this project's sources, plus the trigger to generate a new one. */
export function FahesHub({ character }: { character: CharacterDefinition }) {
  const t = useTranslations();
  const { projectId, project } = useActiveProject();
  const quizzes = useQuizzes({ project: projectId ?? undefined });
  const startJob = useStartAIJob();
  const [pickerOpen, setPickerOpen] = useState(false);

  // RequireProject already guarantees this, but keep the component safe on its own.
  if (!projectId || !project) return null;

  function handleScope(scope: SourceScope) {
    startJob.start({ task_type: character.taskType, ...scope });
  }

  return (
    <div>
      <PageHeader
        title={character.name}
        description={t("fahes.hubSubtitle")}
        actions={
          <>
            <CharacterAvatar character={character} size="lg" />
            <Button onClick={() => setPickerOpen(true)} loading={startJob.isPending}>
              <Plus className="size-4" aria-hidden="true" />
              {t("fahes.generate")}
            </Button>
          </>
        }
      />

      {quizzes.isPending ? (
        <LoadingState label={t("common.loading")} />
      ) : quizzes.isError ? (
        <ErrorState
          title={t("errors.UNKNOWN")}
          retryLabel={t("common.retry")}
          onRetry={() => quizzes.refetch()}
        />
      ) : quizzes.data.items.length === 0 ? (
        <EmptyState
          title={t("fahes.emptyTitle")}
          description={t("fahes.emptyDescription")}
          action={<Button onClick={() => setPickerOpen(true)}>{t("fahes.generate")}</Button>}
        />
      ) : (
        <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.data.items.map((quiz) => (
            <StaggerItem key={quiz.id}>
              <Link href={`/quizzes/${quiz.id}`}>
                <Card className="flex h-full flex-col gap-2 transition-shadow duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)]">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-bold text-[color:var(--color-ink)]">
                      {quiz.title}
                    </h3>
                    <Badge variant={STATUS_VARIANT[quiz.status]}>
                      {t(`quizzes.status.${quiz.status}`)}
                    </Badge>
                  </div>
                  <Badge variant="neutral" className="self-start">
                    {t("quizzes.questionsCount", { count: quiz.questions_count })}
                  </Badge>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </StaggerIn>
      )}

      <SourceScopePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projectId={projectId}
        projectTitle={project.title}
        confirmLabel={t("common.confirm")}
        onConfirm={handleScope}
      />
    </div>
  );
}
