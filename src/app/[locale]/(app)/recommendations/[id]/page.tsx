"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import { useRecommendation, useMarkRecommendationRead } from "@/features/results/hooks/useResults";
import { OpenProjectLink } from "@/features/results/components/RelatedArtifactLinks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";

export default function RecommendationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const recommendation = useRecommendation(id);
  const markRead = useMarkRecommendationRead();

  if (recommendation.isPending) return <LoadingState label={t("common.loading")} />;
  if (recommendation.isError || !recommendation.data) {
    return (
      <ErrorState
        title={t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => recommendation.refetch()}
      />
    );
  }

  const data = recommendation.data;

  return (
    <div>
      <PageHeader
        title={data.title}
        description={data.summary}
        actions={
          <>
            <OpenProjectLink projectId={data.project} />
            {!data.is_read ? (
              <Button
                variant="outline"
                size="sm"
                loading={markRead.isPending}
                onClick={() => markRead.mutate(data.id)}
              >
                {t("recommendations.markRead")}
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <Card className="flex items-center justify-between">
          <span className="text-sm font-medium text-[color:var(--color-ink-soft)]">
            {t("recommendations.overallScore")}
          </span>
          <Badge variant="accent">{data.overall_score}</Badge>
        </Card>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-[color:var(--color-ink)]">
              <TrendingUp className="size-4 text-[color:var(--color-success)]" aria-hidden="true" />
              {t("recommendations.strengths")}
            </h3>
            {data.strengths.length === 0 ? (
              <p className="text-sm text-[color:var(--color-ink-faint)]">—</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.strengths.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-[color:var(--color-ink-soft)]"
                  >
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-[color:var(--color-success)]"
                      aria-hidden="true"
                    />
                    {typeof item === "string" ? item : JSON.stringify(item)}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-[color:var(--color-ink)]">
              <TrendingDown
                className="size-4 text-[color:var(--color-warning)]"
                aria-hidden="true"
              />
              {t("recommendations.weaknesses")}
            </h3>
            {data.weaknesses.length === 0 ? (
              <p className="text-sm text-[color:var(--color-ink-faint)]">—</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.weaknesses.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-[color:var(--color-ink-soft)]"
                  >
                    <TrendingDown
                      className="mt-0.5 size-4 shrink-0 text-[color:var(--color-warning)]"
                      aria-hidden="true"
                    />
                    {typeof item === "string" ? item : JSON.stringify(item)}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {data.recommendations.length > 0 ? (
          <Card>
            <h3 className="mb-3 text-base font-bold text-[color:var(--color-ink)]">
              {t("recommendations.recommendationsList")}
            </h3>
            <ul className="flex flex-col gap-2">
              {data.recommendations.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-[color:var(--color-ink-soft)]"
                >
                  <span aria-hidden="true">•</span>
                  {/* `recommendations` is a freeform backend JSONField — defensively
                      stringify anything that isn't already plain text. */}
                  {typeof item === "string" ? item : JSON.stringify(item)}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {data.next_best_action && Object.keys(data.next_best_action).length > 0 ? (
          <Card className="border-[color:var(--color-accent-solid)]/30">
            <h3 className="mb-2 text-base font-bold text-[color:var(--color-ink)]">
              {t("recommendations.nextAction")}
            </h3>
            <p className="text-sm text-[color:var(--color-ink-soft)]">
              {/* Freeform JSONField from the backend (see types/domain.ts) — render its
                  `label` when present (the shape actually seen live), otherwise fall back
                  to a readable dump rather than crashing on an unexpected object shape. */}
              {typeof data.next_best_action.label === "string"
                ? data.next_best_action.label
                : JSON.stringify(data.next_best_action)}
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
