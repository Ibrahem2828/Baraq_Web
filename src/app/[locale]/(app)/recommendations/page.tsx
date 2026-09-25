"use client";

import { RecommendationCards } from "@/features/results/components/ResultCards";
import { useTranslations } from "next-intl";
import { TrendingUp } from "lucide-react";
import { useRecommendations } from "@/features/results/hooks/useResults";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function RecommendationsPage() {
  const t = useTranslations();
  const recommendations = useRecommendations();

  return (
    <div>
      <PageHeader title={t("recommendations.title")} description={t("recommendations.subtitle")} />

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
          icon={<TrendingUp className="size-6" aria-hidden="true" />}
          title={t("emptyStates.generic.title")}
          description={t("emptyStates.generic.description")}
        />
      ) : (
        <RecommendationCards items={recommendations.data.items} />
      )}
    </div>
  );
}
