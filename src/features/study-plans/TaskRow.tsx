"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Circle, SkipForward, RotateCcw } from "lucide-react";
import { useCompleteTask, useSkipTask, useReopenTask } from "./hooks/useStudyPlans";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import type { TodayTask } from "@/types/domain";
import { cn } from "@/lib/utils/cn";

const STATUS_BADGE: Record<TodayTask["status"], "neutral" | "info" | "success" | "warning"> = {
  pending: "neutral",
  in_progress: "info",
  completed: "success",
  skipped: "warning",
};

/**
 * A single task row with complete/skip/reopen actions, shared by Today and
 * Week. Mutations invalidate `studyPlans.*` broadly (see `useStudyPlans.ts`),
 * so completing a task here is reflected on Home, the Khota hub, Today,
 * Week, and the owning plan's detail page without a manual refetch anywhere.
 */
export function TaskRow({ task, showPlan = false }: { task: TodayTask; showPlan?: boolean }) {
  const t = useTranslations();
  const completeTask = useCompleteTask();
  const skipTask = useSkipTask();
  const reopenTask = useReopenTask();

  const isPending = completeTask.isPending || skipTask.isPending || reopenTask.isPending;
  const isTerminal = task.status === "completed" || task.status === "skipped";

  return (
    <li className="flex items-center gap-3 border-b border-[color:var(--color-border)] px-4 py-3 last:border-0">
      <button
        type="button"
        onClick={() => completeTask.mutate(task.id)}
        disabled={task.status === "completed" || isPending}
        aria-label={t("studyPlans.taskActions.complete")}
        className="shrink-0"
      >
        {task.status === "completed" ? (
          <CheckCircle2 className="size-5 text-[color:var(--color-success)]" aria-hidden="true" />
        ) : (
          <Circle className="size-5 text-[color:var(--color-ink-faint)]" aria-hidden="true" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm text-[color:var(--color-ink)]",
            task.status === "completed" && "text-[color:var(--color-ink-faint)] line-through",
          )}
        >
          {task.title}
        </p>
        {showPlan ? (
          <p className="truncate text-xs text-[color:var(--color-ink-faint)]">
            {task.plan.subject.name} · {task.plan.title}
          </p>
        ) : null}
      </div>

      <Badge variant={STATUS_BADGE[task.status]} className="hidden sm:inline-flex">
        {t(`studyPlans.taskStatus.${task.status}`)}
      </Badge>

      <span className="hidden shrink-0 text-xs text-[color:var(--color-ink-faint)] sm:inline">
        {task.estimated_minutes}m
      </span>

      <div className="flex shrink-0 items-center gap-1">
        {!isTerminal ? (
          <IconButton
            size="sm"
            variant="ghost"
            aria-label={t("studyPlans.taskActions.skip")}
            disabled={isPending}
            onClick={() => skipTask.mutate(task.id)}
          >
            <SkipForward className="size-4" aria-hidden="true" />
          </IconButton>
        ) : null}
        {isTerminal ? (
          <IconButton
            size="sm"
            variant="ghost"
            aria-label={t("studyPlans.taskActions.reopen")}
            disabled={isPending}
            onClick={() => reopenTask.mutate(task.id)}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </IconButton>
        ) : null}
      </div>
    </li>
  );
}
