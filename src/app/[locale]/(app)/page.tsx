"use client";

import { useTranslations } from "next-intl";
import { useCurrentUser } from "@/lib/auth/client";
import { useTodayPlan } from "@/features/study-plans/hooks/useStudyPlans";
import { TaskRow } from "@/features/study-plans/TaskRow";
import { useIsClient } from "@/lib/utils/use-is-client";
import { CharacterGrid } from "@/components/brand/CharacterGrid";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";

export default function HomePage() {
  const t = useTranslations();
  const { data: user } = useCurrentUser();
  const today = useTodayPlan();

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
        description={t("home.subtitle")}
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
                <TaskRow key={task.id} task={task} showPlan />
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <SectionHeader title={t("characters.hub.title")} />
        <CharacterGrid />
      </section>
    </div>
  );
}
