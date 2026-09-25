"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { useSummary } from "@/features/results/hooks/useResults";
import { OpenSourceLink, OpenProjectLink } from "@/features/results/components/RelatedArtifactLinks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { StructuredText } from "@/components/content/StructuredText";
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
      <PageHeader
        title={data.title}
        description={data.short_summary}
        actions={
          <>
            <OpenSourceLink sourceId={data.source} />
            <OpenProjectLink projectId={data.project} />
          </>
        }
      />

      <div className="flex flex-col gap-6">
        {data.covered_topics.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2" aria-label={t("summaries.coveredTopics")}>
            {data.covered_topics.map((topic, index) => (
              <Chip key={index} tabIndex={-1} className="pointer-events-none">
                {topic}
              </Chip>
            ))}
          </div>
        ) : null}

        <Card>
          <h2 className="mb-3 text-base font-bold text-[color:var(--color-ink)]">
            {t("summaries.detailed")}
          </h2>
          <StructuredText text={data.detailed_summary} />
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

        {data.flashcards && data.flashcards.length > 0 ? (
          <Card>
            <h3 className="mb-1 text-base font-bold text-[color:var(--color-ink)]">
              {t("summaries.flashcards")}
            </h3>
            <p className="mb-3 text-xs text-[color:var(--color-ink-faint)]">
              {t("summaries.flashcardHint")}
            </p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.flashcards.map((card, index) => (
                <li key={index}>
                  <Flashcard front={card.front} back={card.back} />
                </li>
              ))}
            </ul>
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

/** One study card: the question until the learner asks for the answer. */
function Flashcard({ front, back }: { front: string; back: string }) {
  const t = useTranslations("summaries");
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setRevealed((value) => !value)}
      aria-pressed={revealed}
      aria-label={revealed ? t("showQuestion") : t("showAnswer")}
      className="flex min-h-28 w-full flex-col justify-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4 text-start transition-colors hover:border-[color:var(--color-accent-solid)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-solid)] focus-visible:outline-none"
    >
      <span className="text-sm font-semibold text-[color:var(--color-ink)]">{front}</span>
      {revealed ? (
        <span className="text-sm leading-6 text-[color:var(--color-accent)]">{back}</span>
      ) : (
        <span className="text-xs text-[color:var(--color-ink-faint)]">{t("showAnswer")}</span>
      )}
    </button>
  );
}
