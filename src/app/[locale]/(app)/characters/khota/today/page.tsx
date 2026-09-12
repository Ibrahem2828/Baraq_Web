"use client";

import { useTranslations } from "next-intl";
import { useTodayPlan } from "@/features/study-plans/hooks/useStudyPlans";
import { TaskRow } from "@/features/study-plans/TaskRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function KhotaTodayPage() {
  const t = useTranslations();
  const today = useTodayPlan();

  if (today.isPending) return <LoadingState label={t("common.loading")} />;
  if (today.isError || !today.data) {
    return (
      <ErrorState
        title={t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => today.refetch()}
      />
    );
  }

  const { summary, tasks } = today.data;

  return (
    <div>
      <PageHeader title={t("studyPlans.today.title")} description={today.data.date} />

      {tasks.length === 0 ? (
        <EmptyState
          title={t("studyPlans.today.empty")}
          description={t("emptyStates.generic.description")}
        />
      ) : (
        <Card className="p-0">
          <div className="border-b border-[color:var(--color-border)] p-5">
            <Progress
              value={summary.completed_tasks}
              max={Math.max(summary.total_tasks, 1)}
              label={t("studyPlans.progress", {
                completed: summary.completed_tasks,
                total: summary.total_tasks,
              })}
            />
          </div>
          <ul>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} showPlan />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
