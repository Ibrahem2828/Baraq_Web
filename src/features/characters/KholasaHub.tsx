"use client";

import { SummaryCards } from "@/features/results/components/ResultCards";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { useSummaries } from "@/features/results/hooks/useResults";
import { useStartAIJob } from "@/features/ai-jobs/hooks/useStartAIJob";
import { useActiveProject } from "@/features/projects/ActiveProjectContext";
import { SourceScopePicker, type SourceScope } from "@/features/sources/components/SourceScopePicker";
import type { AIRequestInput } from "@/features/ai-jobs/components/AIRequestFields";
import type { CharacterDefinition } from "@/config/characters";
import { usePreselectedSource } from "./usePreselectedSource";
import { CharacterAvatar } from "@/components/brand/CharacterAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";

/** Kholasa's project-scoped hub: every summary produced from this project's sources. */
export function KholasaHub({ character }: { character: CharacterDefinition }) {
  const t = useTranslations();
  const { projectId, project } = useActiveProject();
  const summaries = useSummaries({ project: projectId ?? undefined });
  const startJob = useStartAIJob();
  const preselected = usePreselectedSource();
  const [pickerOpen, setPickerOpen] = useState(preselected !== null);

  if (!projectId || !project) return null;

  function handleScope(scope: SourceScope, input: AIRequestInput) {
    startJob.start({ task_type: character.taskType, ...scope, input: { ...input } });
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
        <SummaryCards items={summaries.data.items} />
      )}

      <SourceScopePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        initialSelection={preselected ? [preselected] : undefined}
        projectId={projectId}
        projectTitle={project.title}
        confirmLabel={t("aiRequest.start")}
        request={{ character: "kholasa", summaryLength: true }}
        onConfirm={handleScope}
      />
    </div>
  );
}
