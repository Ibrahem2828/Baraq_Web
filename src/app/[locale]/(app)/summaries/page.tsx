"use client";

import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useSummaries } from "@/features/results/hooks/useResults";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

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
    </div>
  );
}
