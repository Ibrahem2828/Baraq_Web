"use client";

import { SummaryCards } from "@/features/results/components/ResultCards";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { useSummaries } from "@/features/results/hooks/useResults";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function SummariesPage() {
  const t = useTranslations();
  const summaries = useSummaries();

  return (
    <div>
      <PageHeader title={t("summaries.title")} description={t("summaries.subtitle")} />

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
          icon={<FileText className="size-6" aria-hidden="true" />}
          title={t("emptyStates.generic.title")}
          description={t("emptyStates.generic.description")}
        />
      ) : (
        <SummaryCards items={summaries.data.items} />
      )}
    </div>
  );
}
