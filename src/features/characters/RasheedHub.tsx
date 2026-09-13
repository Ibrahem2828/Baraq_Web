"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useRecommendations } from "@/features/results/hooks/useResults";
import { useCreateAIJob } from "@/features/ai-jobs/hooks/useAIJob";
import { useActiveProject } from "@/features/projects/ActiveProjectContext";
import { SourceScopePicker, type SourceScope } from "@/features/sources/components/SourceScopePicker";
import type { CharacterDefinition } from "@/config/characters";
import { CharacterAvatar } from "@/components/brand/CharacterAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

/** Rasheed's project-scoped hub: performance recommendations derived from this project's sources. */
export function RasheedHub({ character }: { character: CharacterDefinition }) {
  const t = useTranslations();
  const router = useRouter();
  const { projectId, project } = useActiveProject();
  const recommendations = useRecommendations({ project: projectId ?? undefined });
  const createAIJob = useCreateAIJob();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!projectId || !project) return null;

  function handleScope(scope: SourceScope) {
    createAIJob.mutate(
      { task_type: character.taskType, ...scope },
      { onSuccess: (job) => router.push(`/ai-jobs/${job.public_id}`) },
    );
  }

  return (
    <div>
      <PageHeader
        title={character.name}
        description={t("rasheed.hubSubtitle")}
        actions={
          <>
            <CharacterAvatar character={character} size="lg" />
            <Button onClick={() => setPickerOpen(true)} loading={createAIJob.isPending}>
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
        <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recommendations.data.items.map((recommendation) => (
            <StaggerItem key={recommendation.id}>
              <Link href={`/recommendations/${recommendation.id}`} className="block h-full">
                <Card className="flex h-full flex-col gap-3 transition-colors hover:border-[color:var(--color-border-strong)]">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-[color:var(--color-ink)]">
                      {recommendation.title}
                    </h3>
                    {!recommendation.is_read ? (
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-[color:var(--color-accent-solid)]"
                        aria-label={t("notifications.markRead")}
                      />
                    ) : null}
                  </div>
                  <p className="line-clamp-3 text-sm text-[color:var(--color-ink-soft)]">
                    {recommendation.summary}
                  </p>
                  <Badge variant="accent" className="mt-auto w-fit">
                    {t("recommendations.overallScore")}: {recommendation.overall_score}
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
