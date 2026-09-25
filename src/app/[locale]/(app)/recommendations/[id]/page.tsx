"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftCircle, Target, TrendingDown, TrendingUp } from "lucide-react";
import { useRecommendation, useMarkRecommendationRead } from "@/features/results/hooks/useResults";
import { OpenProjectLink } from "@/features/results/components/RelatedArtifactLinks";
import type { RasheedRecommendationItem, RecommendationPriority } from "@/types/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";

const PRIORITY_VARIANT: Record<RecommendationPriority, "destructive" | "warning" | "neutral"> = {
  now: "destructive",
  this_week: "warning",
  later: "neutral",
};

function isItem(value: unknown): value is RasheedRecommendationItem {
  return typeof value === "object" && value !== null && "title" in value && "action" in value;
}

function TopicChips({ items, tone }: { items: string[]; tone: "success" | "warning" }) {
  if (items.length === 0) return <p className="text-sm text-[color:var(--color-ink-faint)]">—</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item}>
          <Badge variant={tone}>{item}</Badge>
        </li>
      ))}
    </ul>
  );
}

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
  const score = data.overall_score === null ? null : Math.round(Number(data.overall_score));
  const nextStep = typeof data.next_best_action?.label === "string" ? data.next_best_action.label : "";
  const confidence =
    typeof data.next_best_action?.confidence_note === "string"
      ? data.next_best_action.confidence_note
      : "";
  const strengths = data.strengths.filter((item): item is string => typeof item === "string");
  const weaknesses = data.weaknesses.filter((item): item is string => typeof item === "string");

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
        {nextStep ? (
          <Card className="border-[color:var(--color-accent-solid)]/40 bg-[color:var(--color-accent-solid)]/5">
            <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-[color:var(--color-ink)]">
              <ArrowLeftCircle
                className="size-5 text-[color:var(--color-accent)] ltr:rotate-180"
                aria-hidden="true"
              />
              {t("recommendations.nextAction")}
            </h2>
            <p className="text-sm leading-7 text-[color:var(--color-ink)]">{nextStep}</p>
            {confidence ? (
              <p className="mt-3 text-xs text-[color:var(--color-ink-faint)]">
                {t("recommendations.confidence")}: {confidence}
              </p>
            ) : null}
          </Card>
        ) : null}

        <Card className="flex flex-col gap-3">
          <span className="text-sm font-medium text-[color:var(--color-ink-soft)]">
            {t("recommendations.overallScore")}
          </span>
          {score === null || Number.isNaN(score) ? (
            <p className="text-sm text-[color:var(--color-ink-faint)]">{t("recommendations.noScore")}</p>
          ) : (
            <Progress value={score} label={t("recommendations.scoreOutOf", { score })} />
          )}
        </Card>

        {data.recommendations.length > 0 ? (
          <section aria-labelledby="rasheed-recommendations">
            <h2
              id="rasheed-recommendations"
              className="mb-3 text-base font-bold text-[color:var(--color-ink)]"
            >
              {t("recommendations.recommendationsList")}
            </h2>
            <ol className="flex flex-col gap-4">
              {data.recommendations.map((item, index) =>
                isItem(item) ? (
                  <li key={index}>
                    <Card className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="flex items-start gap-2 text-sm font-bold text-[color:var(--color-ink)]">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-bg-soft)] text-xs">
                            {index + 1}
                          </span>
                          {item.title}
                        </h3>
                        {item.priority in PRIORITY_VARIANT ? (
                          <Badge variant={PRIORITY_VARIANT[item.priority]}>
                            {t(`recommendations.priority.${item.priority}`)}
                          </Badge>
                        ) : null}
                      </div>
                      <dl className="grid grid-cols-1 gap-2 text-sm">
                        <div>
                          <dt className="font-semibold text-[color:var(--color-ink)]">
                            {t("recommendations.step")}
                          </dt>
                          <dd className="leading-7 text-[color:var(--color-ink-soft)]">{item.action}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-[color:var(--color-ink)]">
                            {t("recommendations.why")}
                          </dt>
                          <dd className="leading-7 text-[color:var(--color-ink-soft)]">{item.reason}</dd>
                        </div>
                        <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[color:var(--color-bg-soft)] px-3 py-2">
                          <Target
                            className="mt-1 size-4 shrink-0 text-[color:var(--color-success)]"
                            aria-hidden="true"
                          />
                          <div>
                            <dt className="font-semibold text-[color:var(--color-ink)]">
                              {t("recommendations.successMeasure")}
                            </dt>
                            <dd className="text-[color:var(--color-ink-soft)]">{item.success_measure}</dd>
                          </div>
                        </div>
                      </dl>
                      {item.related_topics.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--color-ink-faint)]">
                          {t("recommendations.relatedTopics")}
                          {item.related_topics.map((topic) => (
                            <Badge key={topic} variant="neutral">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </Card>
                  </li>
                ) : (
                  <li key={index}>
                    <Card className="text-sm text-[color:var(--color-ink-soft)]">{String(item)}</Card>
                  </li>
                ),
              )}
            </ol>
          </section>
        ) : null}

        {strengths.length > 0 || weaknesses.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-[color:var(--color-ink)]">
                <TrendingUp className="size-4 text-[color:var(--color-success)]" aria-hidden="true" />
                {t("recommendations.strengths")}
              </h3>
              <TopicChips items={strengths} tone="success" />
            </Card>
            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-[color:var(--color-ink)]">
                <TrendingDown className="size-4 text-[color:var(--color-warning)]" aria-hidden="true" />
                {t("recommendations.weaknesses")}
              </h3>
              <TopicChips items={weaknesses} tone="warning" />
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
