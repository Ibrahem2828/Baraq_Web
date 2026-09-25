"use client";

import { TranscriptionCards } from "@/features/results/components/ResultCards";
import { useTranslations } from "next-intl";
import { Mic } from "lucide-react";
import { useTranscriptions } from "@/features/results/hooks/useResults";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function TranscriptionsPage() {
  const t = useTranslations();
  const transcriptions = useTranscriptions();

  return (
    <div>
      <PageHeader title={t("transcriptions.title")} description={t("transcriptions.subtitle")} />

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
          icon={<Mic className="size-6" aria-hidden="true" />}
          title={t("emptyStates.generic.title")}
          description={t("emptyStates.generic.description")}
        />
      ) : (
        <TranscriptionCards items={transcriptions.data.items} />
      )}
    </div>
  );
}
