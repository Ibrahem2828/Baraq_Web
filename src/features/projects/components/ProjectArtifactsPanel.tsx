"use client";

import { useTranslations } from "next-intl";
import { useQuizzes } from "@/features/quizzes/hooks/useQuizzes";
import { useStudyPlans } from "@/features/study-plans/hooks/useStudyPlans";
import { useSummaries, useTranscriptions, useRecommendations } from "@/features/results/hooks/useResults";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

interface ArtifactRow {
  key: string;
  href: string;
  title: string;
  typeLabel: string;
  createdAt: string;
}

/**
 * "Related Artifacts": every AI result derived from this project's sources,
 * merged into one time-ordered feed — the concrete answer to 04_WEB_APP.md
 * §6's "توضيح أن النتيجة مشتقة من نفس المعرفة" within the project workspace.
 *
 * Each underlying list is queried with `?project=<publicId>`. On a backend
 * that hasn't deployed the Phase 0 project-scoping fix yet, the filter is
 * silently ignored by summaries/transcriptions/recommendations (not an
 * error) — those three rows may include items from other projects until the
 * backend is updated; quizzes/study-plans are unaffected since that filter
 * already existed.
 */
export function ProjectArtifactsPanel({ projectId }: { projectId: string }) {
  const t = useTranslations();
  const quizzes = useQuizzes({ project: projectId });
  const studyPlans = useStudyPlans({ project: projectId });
  const summaries = useSummaries({ project: projectId });
  const transcriptions = useTranscriptions({ project: projectId });
  const recommendations = useRecommendations({ project: projectId });

  const isPending =
    quizzes.isPending ||
    studyPlans.isPending ||
    summaries.isPending ||
    transcriptions.isPending ||
    recommendations.isPending;

  if (isPending) return <LoadingState label={t("common.loading")} />;

  const rows: ArtifactRow[] = [
    ...(quizzes.data?.items ?? []).map((item) => ({
      key: `quiz-${item.id}`,
      href: `/quizzes/${item.id}`,
      title: item.title,
      typeLabel: t("workspace.artifacts.types.quiz"),
      createdAt: item.created_at,
    })),
    ...(studyPlans.data?.items ?? []).map((item) => ({
      key: `plan-${item.id}`,
      href: `/study-plans/${item.id}`,
      title: item.title,
      typeLabel: t("workspace.artifacts.types.studyPlan"),
      createdAt: item.created_at,
    })),
    ...(summaries.data?.items ?? []).map((item) => ({
      key: `summary-${item.id}`,
      href: `/summaries/${item.id}`,
      title: item.title,
      typeLabel: t("workspace.artifacts.types.summary"),
      createdAt: item.created_at,
    })),
    ...(transcriptions.data?.items ?? []).map((item) => ({
      key: `transcription-${item.id}`,
      href: `/transcriptions/${item.id}`,
      title: item.title,
      typeLabel: t("workspace.artifacts.types.transcription"),
      createdAt: item.created_at,
    })),
    ...(recommendations.data?.items ?? []).map((item) => ({
      key: `recommendation-${item.id}`,
      href: `/recommendations/${item.id}`,
      title: item.title,
      typeLabel: t("workspace.artifacts.types.recommendation"),
      createdAt: item.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (rows.length === 0) {
    return (
      <EmptyState
        title={t("workspace.artifacts.emptyTitle")}
        description={t("workspace.artifacts.emptyDescription")}
      />
    );
  }

  return (
    <StaggerIn className="flex flex-col gap-3">
      {rows.map((row) => (
        <StaggerItem key={row.key}>
          <Link href={row.href}>
            <Card className="flex items-center justify-between gap-3">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[color:var(--color-ink)]">
                {row.title}
              </span>
              <Badge variant="neutral">{row.typeLabel}</Badge>
            </Card>
          </Link>
        </StaggerItem>
      ))}
    </StaggerIn>
  );
}
