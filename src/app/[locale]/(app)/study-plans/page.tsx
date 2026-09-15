"use client";

import { useTranslations } from "next-intl";
import { FolderKanban } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useStudyPlans } from "@/features/study-plans/hooks/useStudyPlans";
import type { StudyPlanStatus } from "@/types/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

const STATUS_VARIANT: Record<StudyPlanStatus, "neutral" | "info" | "success" | "destructive"> = {
  draft: "neutral",
  active: "info",
  completed: "success",
  cancelled: "destructive",
};

/**
 * A read-only, cross-project browse of every study plan the user owns. Per
 * 04_WEB_APP.md §4/§11, no plan (manual or AI-generated) may be created
 * without a Project in context — creating one now only happens inside a
 * project's workspace (Khota's hub, reached via `/characters/khota`).
 */
export default function StudyPlansPage() {
  const t = useTranslations();
  const plans = useStudyPlans();

  return (
    <div>
      <PageHeader
        title={t("studyPlans.title")}
        description={t("studyPlans.subtitle")}
        actions={
          <Button asChild>
            <Link href="/projects">
              <FolderKanban className="size-4" aria-hidden="true" />
              {t("studyPlans.goToProject")}
            </Link>
          </Button>
        }
      />

      {plans.isPending ? (
        <LoadingState label={t("common.loading")} />
      ) : plans.isError ? (
        <ErrorState
          title={t("errors.UNKNOWN")}
          retryLabel={t("common.retry")}
          onRetry={() => plans.refetch()}
        />
      ) : plans.data.items.length === 0 ? (
        <EmptyState
          title={t("emptyStates.studyPlans.title")}
          description={t("emptyStates.studyPlans.description")}
          action={
            <Button asChild>
              <Link href="/projects">{t("studyPlans.goToProject")}</Link>
            </Button>
          }
        />
      ) : (
        <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.data.items.map((plan) => (
            <StaggerItem key={plan.id}>
              <Link href={`/study-plans/${plan.id}`}>
                <Card className="flex h-full flex-col gap-3 transition-shadow duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)]">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-base font-bold text-[color:var(--color-ink)]">
                      {plan.title}
                    </h3>
                    <Badge variant={STATUS_VARIANT[plan.status]}>
                      {t(`studyPlans.status.${plan.status}`)}
                    </Badge>
                  </div>
                  <Progress
                    value={plan.completed_tasks}
                    max={Math.max(plan.total_tasks, 1)}
                    label={t("studyPlans.progress", {
                      completed: plan.completed_tasks,
                      total: plan.total_tasks,
                    })}
                  />
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </StaggerIn>
      )}
    </div>
  );
}
