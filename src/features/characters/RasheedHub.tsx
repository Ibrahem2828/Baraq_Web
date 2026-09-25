"use client";

import { RecommendationCards } from "@/features/results/components/ResultCards";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { useRecommendations } from "@/features/results/hooks/useResults";
import { useStartAIJob } from "@/features/ai-jobs/hooks/useStartAIJob";
import { useActiveProject } from "@/features/projects/ActiveProjectContext";
import type { AIRequestInput } from "@/features/ai-jobs/components/AIRequestFields";
import { RasheedGoalDialog } from "./RasheedGoalDialog";
import type { CharacterDefinition } from "@/config/characters";
import { CharacterAvatar } from "@/components/brand/CharacterAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";

/** Rasheed's project-scoped hub: performance recommendations derived from this project's sources. */
export function RasheedHub({ character }: { character: CharacterDefinition }) {
  const t = useTranslations();
  const { projectId, project } = useActiveProject();
  const recommendations = useRecommendations({ project: projectId ?? undefined });
  const startJob = useStartAIJob();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!projectId || !project) return null;

  function handleGoal(input: AIRequestInput) {
    // Rasheed works from the learner's results in this project, not sources.
    startJob.start({ task_type: character.taskType, project: projectId ?? undefined, input: { ...input } });
  }

  return (
    <div>
      <PageHeader
        title={character.name}
        description={t("rasheed.hubSubtitle")}
        actions={
          <>
            <CharacterAvatar character={character} size="lg" />
            <Button onClick={() => setPickerOpen(true)} loading={startJob.isPending}>
              <Plus className="size-4" aria-hidden="true" />
              {t("rasheed.generate")}
            </Button>
          </>
        }
      />

      {recommendations.isPending ? (
        <LoadingState label={t("common.loading")} />
      ) : recommendations.isError ? (
        <ErrorState
          title={t("errors.UNKNOWN")}
          retryLabel={t("common.retry")}
          onRetry={() => recommendations.refetch()}
        />
      ) : recommendations.data.items.length === 0 ? (
        <EmptyState
          title={t("rasheed.emptyTitle")}
          description={t("rasheed.emptyDescription")}
          action={<Button onClick={() => setPickerOpen(true)}>{t("rasheed.generate")}</Button>}
        />
      ) : (
        <RecommendationCards items={recommendations.data.items} />
      )}

      <RasheedGoalDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        loading={startJob.isPending}
        onConfirm={handleGoal}
      />
    </div>
  );
}
