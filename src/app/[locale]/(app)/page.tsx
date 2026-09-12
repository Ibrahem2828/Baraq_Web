"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Circle } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useCurrentUser } from "@/lib/auth/client";
import { useTodayPlan, useCompleteTask } from "@/features/study-plans/hooks/useStudyPlans";
import { useIsClient } from "@/lib/utils/use-is-client";
import { CHARACTER_LIST } from "@/config/characters";
import { CharacterCard } from "@/components/brand/CharacterCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";
import { cn } from "@/lib/utils/cn";

export default function HomePage() {
  const t = useTranslations();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const today = useTodayPlan();
  const completeTask = useCompleteTask();

  // `user` comes from a client-only query with no SSR data, so the server
  // always renders the name-less greeting. On a fast localhost round trip
  // the query can resolve before React finishes hydrating, and reading
  // `user?.full_name` directly here made the client's *first* render
  // already include the name — a genuine hydration mismatch (found live in
  // Phase 2.5 QA, reproducible on a cold load). `useIsClient` keeps the
  // first client render identical to the server's, then upgrades to the
  // personalized greeting once hydration is done.
  const mounted = useIsClient();

  return (
    <div>
      <PageHeader
        title={`${t("home.greeting")}${mounted && user?.full_name ? `، ${user.full_name}` : ""}`}
        description={t("nav.home")}
      />

      <section className="mb-10">
        <SectionHeader title={t("home.todayTasks")} />
        {today.isPending ? (
          <LoadingState />
        ) : today.isError ? (
          <ErrorState
            title={t("errors.UNKNOWN")}
            retryLabel={t("common.retry")}
            onRetry={() => today.refetch()}
          />
        ) : today.data.tasks.length === 0 ? (
          <EmptyState
            title={t("emptyStates.generic.title")}
            description={t("emptyStates.generic.description")}
          />
        ) : (
          <Card className="p-0">
            <div className="border-b border-[color:var(--color-border)] p-5">
              <Progress
                value={today.data.summary.completed_tasks}
                max={today.data.summary.total_tasks}
                label={`${today.data.summary.completed_tasks}/${today.data.summary.total_tasks}`}
              />
            </div>
            <ul>
              {today.data.tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-3 border-b border-[color:var(--color-border)] px-5 py-4 last:border-0"
                >
                  <button
                    type="button"
                    onClick={() => completeTask.mutate(task.id)}
                    disabled={task.status === "completed" || completeTask.isPending}
                    aria-label={t("common.confirm")}
                    className="shrink-0"
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
                  </button>
                  <span
                    className={cn(
                      "flex-1 text-sm text-[color:var(--color-ink)]",
                      task.status === "completed" &&
                        "text-[color:var(--color-ink-faint)] line-through",
                    )}
                  >
                    {task.title}
                  </span>
                  <span className="text-xs text-[color:var(--color-ink-faint)]">
                    {task.estimated_minutes}m
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <SectionHeader title={t("characters.hub.title")} />
        <StaggerIn className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CHARACTER_LIST.map((character) => (
            <StaggerItem key={character.key}>
              <CharacterCard
                character={character}
                role={t(`characters.${character.key}.role`)}
                comingSoonLabel={t("common.comingSoon")}
                onSelect={() => router.push(`/characters/${character.key}`)}
              />
            </StaggerItem>
          ))}
        </StaggerIn>
      </section>
    </div>
  );
}
