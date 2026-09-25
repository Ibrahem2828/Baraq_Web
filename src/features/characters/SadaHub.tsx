"use client";

import { TranscriptionCards } from "@/features/results/components/ResultCards";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { useTranscriptions } from "@/features/results/hooks/useResults";
import { useStartAIJob } from "@/features/ai-jobs/hooks/useStartAIJob";
import { useActiveProject } from "@/features/projects/ActiveProjectContext";
import { SourceScopePicker, type SourceScope } from "@/features/sources/components/SourceScopePicker";
import type { CharacterDefinition } from "@/config/characters";
import { usePreselectedSource } from "./usePreselectedSource";
import { CharacterAvatar } from "@/components/brand/CharacterAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";

/**
 * Sada's project-scoped hub: every transcription produced from this
 * project's audio sources. Unlike the other characters, the backend rejects
 * a collection scope for this task entirely (exactly one audio source per
 * job) — the scope picker is restricted accordingly.
 */
export function SadaHub({ character }: { character: CharacterDefinition }) {
  const t = useTranslations();
  const { projectId, project } = useActiveProject();
  const transcriptions = useTranscriptions({ project: projectId ?? undefined });
  const startJob = useStartAIJob();
  const preselected = usePreselectedSource();
  const [pickerOpen, setPickerOpen] = useState(preselected !== null);

  if (!projectId || !project) return null;

  function handleScope(scope: SourceScope) {
    if (!("source" in scope)) return;
    startJob.start({ task_type: character.taskType, source: scope.source });
  }

  return (
    <div>
      <PageHeader
        title={character.name}
        description={t("sada.hubSubtitle")}
        actions={
          <>
            <CharacterAvatar character={character} size="lg" />
            <Button onClick={() => setPickerOpen(true)} loading={startJob.isPending}>
              <Plus className="size-4" aria-hidden="true" />
              {t("sada.generate")}
            </Button>
          </>
        }
      />

      {transcriptions.isPending ? (
        <LoadingState label={t("common.loading")} />
      ) : transcriptions.isError ? (
        <ErrorState
          title={t("errors.UNKNOWN")}
          retryLabel={t("common.retry")}
          onRetry={() => transcriptions.refetch()}
        />
      ) : transcriptions.data.items.length === 0 ? (
        <EmptyState
          title={t("sada.emptyTitle")}
          description={t("sada.emptyDescription")}
          action={<Button onClick={() => setPickerOpen(true)}>{t("sada.generate")}</Button>}
        />
      ) : (
        <TranscriptionCards items={transcriptions.data.items} />
      )}

      <SourceScopePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        initialSelection={preselected ? [preselected] : undefined}
        projectId={projectId}
        projectTitle={project.title}
        sourceType="audio"
        singleSelectOnly
        confirmLabel={t("common.confirm")}
        onConfirm={handleScope}
      />
    </div>
  );
}
