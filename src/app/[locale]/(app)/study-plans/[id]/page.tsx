"use client";

import { use, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Clock } from "lucide-react";
import { useStudyPlan } from "@/features/study-plans/hooks/useStudyPlans";
import { TaskRow } from "@/features/study-plans/TaskRow";
import type { StudyTask } from "@/types/domain";
import { OpenProjectLink } from "@/features/results/components/RelatedArtifactLinks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { isApiError } from "@/lib/api/errors";

/** Tasks grouped by day, days and tasks in plan order. */
function byDay(tasks: StudyTask[]): Array<[string, StudyTask[]]> {
  const days = new Map<string, StudyTask[]>();
  for (const task of [...tasks].sort((a, b) => a.task_date.localeCompare(b.task_date) || a.order - b.order)) {
    days.set(task.task_date, [...(days.get(task.task_date) ?? []), task]);
  }
  return [...days.entries()];
}

export default function StudyPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const plan = useStudyPlan(id);
  const days = useMemo(() => byDay(plan.data?.tasks ?? []), [plan.data?.tasks]);
  const dayLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }),
    [locale],
  );
  const shortDate = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }),
    [locale],
  );
  const asDate = (value: string) => new Date(`${value}T00:00:00`);

  if (plan.isPending) return <LoadingState label={t("common.loading")} />;
  if (plan.isError || !plan.data) {
    return (
      <ErrorState
        title={isApiError(plan.error) ? t(`errors.${plan.error.code}`) : t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => plan.refetch()}
      />
    );
  }

  const data = plan.data;

  return (
    <div>
      <PageHeader
        title={data.title}
        description={data.description ?? undefined}
        actions={
          <>
            <OpenProjectLink projectId={data.project} />
            <Badge variant="info">{t(`studyPlans.status.${data.status}`)}</Badge>
          </>
        }
      />

      <Card className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[color:var(--color-ink-soft)]">
          {data.start_date && data.end_date ? (
            <span className="flex items-center gap-2">
              <CalendarDays className="size-4" aria-hidden="true" />
              {t("studyPlans.planPeriod", {
                start: shortDate.format(asDate(data.start_date)),
                end: shortDate.format(asDate(data.end_date)),
              })}
            </span>
          ) : null}
          {data.daily_study_minutes ? (
            <span className="flex items-center gap-2">
              <Clock className="size-4" aria-hidden="true" />
              {t("studyPlans.dailyMinutes")}: {t("studyPlans.minutesShort", { count: data.daily_study_minutes })}
            </span>
          ) : null}
        </div>
        <Progress
          value={data.completed_tasks}
          max={Math.max(data.total_tasks, 1)}
          label={t("studyPlans.progress", {
            completed: data.completed_tasks,
            total: data.total_tasks,
          })}
        />
      </Card>

      <h2 className="mb-3 text-lg font-bold text-[color:var(--color-ink)]">
        {t("studyPlans.tasks")}
      </h2>

      {days.length === 0 ? (
        <EmptyState
          title={t("emptyStates.generic.title")}
          description={t("emptyStates.generic.description")}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {days.map(([date, tasks]) => (
            <section key={date} aria-label={dayLabel.format(asDate(date))}>
              <h3 className="mb-2 text-sm font-bold text-[color:var(--color-ink)]">
                {dayLabel.format(asDate(date))}
                <span className="ms-2 text-xs font-normal text-[color:var(--color-ink-faint)]">
                  {t("studyPlans.minutesShort", {
                    count: tasks.reduce((sum, task) => sum + task.estimated_minutes, 0),
                  })}
                </span>
              </h3>
              <Card className="p-0">
                <ul>
                  {tasks.map((task) => (
                    <TaskRow key={task.id} task={task} showDetails />
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
