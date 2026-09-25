"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranscriptions } from "@/features/results/hooks/useResults";
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
  const [pickerOpen, setPickerOpen] = useState(false);

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
        <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {transcriptions.data.items.map((transcription) => (
            <StaggerItem key={transcription.id}>
              <Link href={`/transcriptions/${transcription.id}`} className="block h-full">
                <Card className="flex h-full flex-col gap-2 transition-colors hover:border-[color:var(--color-border-strong)]">
                  <h3 className="text-base font-bold text-[color:var(--color-ink)]">
                    {transcription.title}
                  </h3>
                  <p className="text-sm text-[color:var(--color-ink-soft)]">
                    {t("transcriptions.duration", {
                      minutes: Math.round(transcription.duration_seconds / 60),
                    })}
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
        sourceType="audio"
        singleSelectOnly
        confirmLabel={t("common.confirm")}
        onConfirm={handleScope}
      />
    </div>
  );
}
