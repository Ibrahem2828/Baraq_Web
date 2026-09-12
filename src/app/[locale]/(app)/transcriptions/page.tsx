"use client";

import { useTranslations } from "next-intl";
import { Mic } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranscriptions } from "@/features/results/hooks/useResults";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

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
    </div>
  );
}
