"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useTranscription } from "@/features/results/hooks/useResults";
import { OpenSourceLink, OpenProjectLink } from "@/features/results/components/RelatedArtifactLinks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";

export default function TranscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const transcription = useTranscription(id);

  if (transcription.isPending) return <LoadingState label={t("common.loading")} />;
  if (transcription.isError || !transcription.data) {
    return (
      <ErrorState
        title={t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => transcription.refetch()}
      />
    );
  }

  const data = transcription.data;
  const transcript = data.cleaned_transcript || data.full_transcript;

  return (
    <div>
      <PageHeader
        title={data.title}
        description={t("transcriptions.duration", {
          minutes: Math.round(data.duration_seconds / 60),
        })}
        actions={
          <>
            <OpenSourceLink sourceId={data.source} />
            <OpenProjectLink projectId={data.project} />
          </>
        }
      />

      <div className="flex flex-col gap-6">
        {data.detected_topics.length > 0 ? (
          <Card>
            <h3 className="mb-3 text-base font-bold text-[color:var(--color-ink)]">
              {t("transcriptions.detectedTopics")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.detected_topics.map((topic, index) => (
                <Chip key={index} tabIndex={-1} className="pointer-events-none">
                  {topic}
                </Chip>
              ))}
            </div>
          </Card>
        ) : null}

        <Card>
          <h3 className="mb-3 text-base font-bold text-[color:var(--color-ink)]">
            {t("transcriptions.fullTranscript")}
          </h3>
          <p className="text-sm leading-relaxed whitespace-pre-line text-[color:var(--color-ink-soft)]">
            {transcript}
          </p>
        </Card>
      </div>
    </div>
  );
}
