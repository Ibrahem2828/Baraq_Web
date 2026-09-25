"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StudentRecommendation, Summary, Transcription } from "@/types/domain";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

/**
 * Result cards shared by each character's hub and its all-projects page,
 * which used to carry two hand-copied versions of the same markup.
 */
function ResultGrid<T extends { id: number }>({
  items,
  href,
  children,
}: {
  items: T[];
  href: (item: T) => string;
  children: (item: T) => ReactNode;
}) {
  return (
    <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <StaggerItem key={item.id}>
          <Link href={href(item)} className="block h-full">
            <Card className="flex h-full flex-col gap-3 transition-colors hover:border-[color:var(--color-border-strong)]">
              {children(item)}
            </Card>
          </Link>
        </StaggerItem>
      ))}
    </StaggerIn>
  );
}

export function SummaryCards({ items }: { items: Summary[] }) {
  return (
    <ResultGrid items={items} href={(item) => `/summaries/${item.id}`}>
      {(summary) => (
        <>
          <h3 className="text-base font-bold text-[color:var(--color-ink)]">{summary.title}</h3>
          <p className="line-clamp-4 text-sm text-[color:var(--color-ink-soft)]">{summary.short_summary}</p>
        </>
      )}
    </ResultGrid>
  );
}

export function RecommendationCards({ items }: { items: StudentRecommendation[] }) {
  const t = useTranslations();
  return (
    <ResultGrid items={items} href={(item) => `/recommendations/${item.id}`}>
      {(recommendation) => (
        <>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-bold text-[color:var(--color-ink)]">{recommendation.title}</h3>
            {!recommendation.is_read ? (
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full bg-[color:var(--color-accent-solid)]"
                aria-label={t("notifications.markRead")}
              />
            ) : null}
          </div>
          <p className="line-clamp-3 text-sm text-[color:var(--color-ink-soft)]">{recommendation.summary}</p>
          {recommendation.overall_score !== null ? (
            <Badge variant="accent" className="mt-auto w-fit">
              {t("recommendations.overallScore")}:{" "}
              {t("recommendations.scoreOutOf", { score: Math.round(Number(recommendation.overall_score)) })}
            </Badge>
          ) : null}
        </>
      )}
    </ResultGrid>
  );
}

export function TranscriptionCards({ items }: { items: Transcription[] }) {
  const t = useTranslations();
  return (
    <ResultGrid items={items} href={(item) => `/transcriptions/${item.id}`}>
      {(transcription) => (
        <>
          <h3 className="text-base font-bold text-[color:var(--color-ink)]">{transcription.title}</h3>
          {transcription.duration_seconds > 0 ? (
            <p className="text-sm text-[color:var(--color-ink-soft)]">
              {t("transcriptions.duration", {
                minutes: Math.max(1, Math.round(transcription.duration_seconds / 60)),
              })}
            </p>
          ) : null}
        </>
      )}
    </ResultGrid>
  );
}
