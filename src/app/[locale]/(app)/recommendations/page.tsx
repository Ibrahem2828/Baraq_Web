"use client";

import { useTranslations } from "next-intl";
import { TrendingUp } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useRecommendations } from "@/features/results/hooks/useResults";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

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
        <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recommendations.data.items.map((recommendation) => (
            <StaggerItem key={recommendation.id}>
              <Link href={`/recommendations/${recommendation.id}`} className="block h-full">
                <Card className="flex h-full flex-col gap-3 transition-colors hover:border-[color:var(--color-border-strong)]">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-[color:var(--color-ink)]">
                      {recommendation.title}
                    </h3>
                    {!recommendation.is_read ? (
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-[color:var(--color-accent-solid)]"
                        aria-label={t("notifications.markRead")}
                      />
                    ) : null}
                  </div>
                  <p className="line-clamp-3 text-sm text-[color:var(--color-ink-soft)]">
                    {recommendation.summary}
                  </p>
                  <Badge variant="accent" className="mt-auto w-fit">
                    {t("recommendations.overallScore")}: {recommendation.overall_score}
                  </Badge>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </StaggerIn>
      )}
    </div>
  );
}
