"use client";

import { useTranslations, useLocale } from "next-intl";
import { useWeekPlan } from "@/features/study-plans/hooks/useStudyPlans";
import { TaskRow } from "@/features/study-plans/TaskRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { enumerateDates, formatWeekdayLabel, formatDayLabel, isToday } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

export default function KhotaWeekPage() {
  const t = useTranslations();
  const locale = useLocale();
  const week = useWeekPlan();

  if (week.isPending) return <LoadingState label={t("common.loading")} />;
  if (week.isError || !week.data) {
    return (
      <ErrorState
        title={t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => week.refetch()}
      />
    );
  }

  const { start_date, end_date, days } = week.data;
  // The backend omits days with no scheduled tasks entirely (verified against
  // a live instance — see docs/API_CONTRACT_MAP.md) — fill every date in
  // range so the grid always shows a full week, not just the days that
  // happen to have tasks.
  const dayByDate = new Map(days.map((day) => [day.date, day]));
  const allDates = enumerateDates(start_date, end_date);

  // The Unicode bidi algorithm reorders a plain "start – end" string when it
  // sits inside RTL (Arabic) text — confirmed visually: it rendered as
  // "end – start". Wrapping the whole range in LRI/PDI isolate characters
  // forces it to render left-to-right as one unit regardless of the
  // surrounding paragraph direction, without needing a `dir="ltr"` wrapper
  // element (`PageHeader.description` is a plain string prop).
  const dateRange = `⁦${t("studyPlans.week.range", { start: start_date, end: end_date })}⁩`;

  return (
    <div>
      <PageHeader title={t("studyPlans.week.title")} description={dateRange} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
        {allDates.map((date) => {
          const day = dayByDate.get(date);
          const today = isToday(date);
          return (
            <Card
              key={date}
              className={cn(
                "flex flex-col gap-2 p-0",
                today && "ring-2 ring-[color:var(--color-accent-solid)]",
              )}
            >
              <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-[color:var(--color-ink-faint)] uppercase">
                    {formatWeekdayLabel(date, locale)}
                  </p>
                  <p className="text-sm font-bold text-[color:var(--color-ink)]">
                    {formatDayLabel(date, locale)}
                  </p>
                </div>
                {today ? <Badge variant="accent">{t("studyPlans.today.title")}</Badge> : null}
              </div>
              {!day || day.tasks.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-[color:var(--color-ink-faint)]">
                  {t("studyPlans.week.emptyDay")}
                </p>
              ) : (
                <ul>
                  {day.tasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
