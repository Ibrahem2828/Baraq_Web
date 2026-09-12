"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useSummary } from "@/features/results/hooks/useResults";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";

export default function SummaryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const summary = useSummary(id);

  if (summary.isPending) return <LoadingState label={t("common.loading")} />;
  if (summary.isError || !summary.data) {
    return (
      <ErrorState
        title={t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => summary.refetch()}
      />
    );
  }

  const data = summary.data;

  return (
    <div>
      <PageHeader title={data.title} description={data.short_summary} />

      <div className="flex flex-col gap-6">
        <Card>
          <h3 className="mb-2 text-base font-bold text-[color:var(--color-ink)]">
            {t("summaries.title")}
          </h3>
          <p className="text-sm leading-relaxed whitespace-pre-line text-[color:var(--color-ink-soft)]">
            {data.detailed_summary}
          </p>
        </Card>

        {data.key_points.length > 0 ? (
          <Card>
            <h3 className="mb-3 text-base font-bold text-[color:var(--color-ink)]">
              {t("summaries.keyPoints")}
            </h3>
            <ul className="flex flex-col gap-2">
              {data.key_points.map((point, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-[color:var(--color-ink-soft)]"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[color:var(--color-accent-solid)]" />
                  {point}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {data.important_terms.length > 0 ? (
          <Card>
            <h3 className="mb-3 text-base font-bold text-[color:var(--color-ink)]">
              {t("summaries.importantTerms")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.important_terms.map((term, index) => (
                <Chip key={index} tabIndex={-1} className="pointer-events-none">
                  {term}
                </Chip>
              ))}
            </div>
          </Card>
        ) : null}

        {data.review_questions.length > 0 ? (
          <Card>
            <h3 className="mb-3 text-base font-bold text-[color:var(--color-ink)]">
              {t("summaries.reviewQuestions")}
            </h3>
            <ol className="flex flex-col gap-2 ps-4 text-sm text-[color:var(--color-ink-soft)]">
              {data.review_questions.map((question, index) => (
                <li key={index} className="list-decimal ps-1">
                  {question}
                </li>
              ))}
            </ol>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
