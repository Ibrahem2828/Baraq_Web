"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Circle, SkipForward } from "lucide-react";
import {
  useStudyPlan,
  useCompleteTask,
  useSkipTask,
  useReopenTask,
} from "@/features/study-plans/hooks/useStudyPlans";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { IconButton } from "@/components/ui/IconButton";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";

export default function StudyPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const plan = useStudyPlan(id);
  const completeTask = useCompleteTask();
  const skipTask = useSkipTask();
  const reopenTask = useReopenTask();

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
  const tasks = data.tasks ?? [];

  return (
    <div>
      <PageHeader
        title={data.title}
        description={data.description ?? undefined}
        actions={<Badge variant="info">{t(`studyPlans.status.${data.status}`)}</Badge>}
      />

      <Card className="mb-6">
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

      {tasks.length === 0 ? (
        <EmptyState
          title={t("emptyStates.generic.title")}
          description={t("emptyStates.generic.description")}
        />
      ) : (
        <Card className="p-0">
          <ul>
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-3 border-b border-[color:var(--color-border)] px-5 py-4 last:border-0"
              >
                <IconButton
                  aria-label={t("common.confirm")}
                  size="sm"
                  onClick={() => completeTask.mutate(task.id)}
                  disabled={task.status === "completed" || completeTask.isPending}
                >
                  {task.status === "completed" ? (
                    <CheckCircle2
                      className="size-5 text-[color:var(--color-success)]"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="size-5 text-[color:var(--color-ink-faint)]"
                      aria-hidden="true"
                    />
                  )}
                </IconButton>
                <div className="flex-1">
                  <p
                    className={cn(
                      "text-sm text-[color:var(--color-ink)]",
                      task.status === "completed" &&
                        "text-[color:var(--color-ink-faint)] line-through",
                    )}
                  >
                    {task.title}
                  </p>
                  <p className="text-xs text-[color:var(--color-ink-faint)]">
                    {task.task_date} · {task.estimated_minutes}m
                  </p>
                </div>
                <Badge variant="neutral">{t(`studyPlans.taskStatus.${task.status}`)}</Badge>
                {task.status === "pending" || task.status === "in_progress" ? (
                  <IconButton
                    aria-label={t("common.skip")}
                    size="sm"
                    onClick={() => skipTask.mutate(task.id)}
                    disabled={skipTask.isPending}
                  >
                    <SkipForward className="size-4" aria-hidden="true" />
                  </IconButton>
                ) : task.status === "skipped" ? (
                  <button
                    type="button"
                    onClick={() => reopenTask.mutate(task.id)}
                    className="text-xs font-medium text-[color:var(--color-accent)]"
                  >
                    {t("common.retry")}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
