"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useSummaries } from "@/features/results/hooks/useResults";
import { useStartAIJob } from "@/features/ai-jobs/hooks/useStartAIJob";
import { useActiveProject } from "@/features/projects/ActiveProjectContext";
import { SourceScopePicker, type SourceScope } from "@/features/sources/components/SourceScopePicker";
import type { CharacterDefinition } from "@/config/characters";
import { CharacterAvatar } from "@/components/brand/CharacterAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

/** Kholasa's project-scoped hub: every summary produced from this project's sources. */
export function KholasaHub({ character }: { character: CharacterDefinition }) {
  const t = useTranslations();
  const { projectId, project } = useActiveProject();
  const summaries = useSummaries({ project: projectId ?? undefined });
  const startJob = useStartAIJob();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!projectId || !project) return null;

  function handleScope(scope: SourceScope) {
    startJob.start({ task_type: character.taskType, ...scope });
  }

  return (
    <div>
      <PageHeader
        title={character.name}
        description={t("kholasa.hubSubtitle")}
        actions={
          <>
            <CharacterAvatar character={character} size="lg" />
            <Button onClick={() => setPickerOpen(true)} loading={startJob.isPending}>
              <Plus className="size-4" aria-hidden="true" />
              {t("kholasa.generate")}
            </Button>
          </>
        }
      />

      {summaries.isPending ? (
        <LoadingState label={t("common.loading")} />
      ) : summaries.isError ? (
        <ErrorState
          title={t("errors.UNKNOWN")}
          retryLabel={t("common.retry")}
          onRetry={() => summaries.refetch()}
        />
      ) : summaries.data.items.length === 0 ? (
        <EmptyState
          title={t("kholasa.emptyTitle")}
          description={t("kholasa.emptyDescription")}
          action={<Button onClick={() => setPickerOpen(true)}>{t("kholasa.generate")}</Button>}
        />
      ) : (
        <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.data.items.map((summary) => (
            <StaggerItem key={summary.id}>
              <Link href={`/summaries/${summary.id}`} className="block h-full">
                <Card className="flex h-full flex-col gap-3 transition-colors hover:border-[color:var(--color-border-strong)]">
                  <h3 className="text-base font-bold text-[color:var(--color-ink)]">
                    {summary.title}
                  </h3>
                  <p className="line-clamp-4 text-sm text-[color:var(--color-ink-soft)]">
                    {summary.short_summary}
                  </p>
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
