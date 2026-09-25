"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, CalendarRange, ListChecks, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTodayPlan } from "@/features/study-plans/hooks/useStudyPlans";
import { useStudyPlans } from "@/features/study-plans/hooks/useStudyPlans";
import { useActiveProject } from "@/features/projects/ActiveProjectContext";
import { useStartAIJob } from "@/features/ai-jobs/hooks/useStartAIJob";
import { SourceScopePicker, type SourceScope } from "@/features/sources/components/SourceScopePicker";
import type { CharacterDefinition } from "@/config/characters";
import { CharacterAvatar } from "@/components/brand/CharacterAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

/**
 * Khota's character page is a real workflow hub, not the generic
 * character-identity view every other character gets — Khota (study
 * planning) is the highest Phase 2 priority. Today/Week/Plans all share the
 * same React Query hooks (and therefore the same cache keys) used on Home
 * and the plan detail page, so a task completed here is reflected
 * everywhere else without a manual refetch.
 */
export function KhotaHub({ character }: { character: CharacterDefinition }) {
  const t = useTranslations();
  const { projectId, project } = useActiveProject();
  const today = useTodayPlan();
  const activePlans = useStudyPlans({ status: "active", project: projectId ?? undefined });
  const startJob = useStartAIJob();
  const [pickerOpen, setPickerOpen] = useState(false);
  // The today/week pages are project-scoped too; keep the project in the URL.
  const withProject = (href: string) => (projectId ? `${href}?project=${projectId}` : href);

  // Khota could only be *viewed* here: there was no way to ask it for a plan,
  // and "create your first plan" looped through /study-plans back to this page.
  function handleScope(scope: SourceScope) {
    startJob.start({ task_type: character.taskType, ...scope });
  }

  return (
    <div>
      <PageHeader
        title={character.name}
        description={t("khota.hubSubtitle")}
        actions={
          <>
            <CharacterAvatar character={character} size="lg" />
            {projectId ? (
              <Button onClick={() => setPickerOpen(true)} loading={startJob.isPending}>
                <Plus className="size-4" aria-hidden="true" />
                {t("khota.generate")}
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href={withProject("/characters/khota/today")}>
          <Card className="flex h-full flex-col gap-2 transition-shadow duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)]">
            <CalendarDays
              className="size-5 text-[color:var(--color-character-khota)]"
              aria-hidden="true"
            />
            <h3 className="text-sm font-bold text-[color:var(--color-ink)]">
              {t("khota.todayLink")}
            </h3>
            <p className="text-xs text-[color:var(--color-ink-soft)]">
              {t("khota.todayLinkDescription")}
            </p>
            {today.data ? (
              <Progress
                className="mt-1"
                value={today.data.summary.completed_tasks}
                max={Math.max(today.data.summary.total_tasks, 1)}
                label={t("studyPlans.progress", {
                  completed: today.data.summary.completed_tasks,
                  total: today.data.summary.total_tasks,
                })}
              />
            ) : null}
          </Card>
        </Link>

        <Link href={withProject("/characters/khota/week")}>
          <Card className="flex h-full flex-col gap-2 transition-shadow duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)]">
            <CalendarRange
              className="size-5 text-[color:var(--color-character-khota)]"
              aria-hidden="true"
            />
            <h3 className="text-sm font-bold text-[color:var(--color-ink)]">
              {t("khota.weekLink")}
            </h3>
            <p className="text-xs text-[color:var(--color-ink-soft)]">
              {t("khota.weekLinkDescription")}
            </p>
          </Card>
        </Link>

        <Link href="/study-plans">
          <Card className="flex h-full flex-col gap-2 transition-shadow duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)]">
            <ListChecks
              className="size-5 text-[color:var(--color-character-khota)]"
              aria-hidden="true"
            />
            <h3 className="text-sm font-bold text-[color:var(--color-ink)]">
              {t("khota.plansLink")}
            </h3>
            <p className="text-xs text-[color:var(--color-ink-soft)]">{t("studyPlans.subtitle")}</p>
          </Card>
        </Link>
      </div>

      <section>
        <SectionHeader title={t("khota.activePlans")} />
        {activePlans.isPending ? (
          <LoadingState label={t("common.loading")} />
        ) : activePlans.data && activePlans.data.items.length > 0 ? (
          <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activePlans.data.items.map((plan) => (
              <StaggerItem key={plan.id}>
                <Link href={`/study-plans/${plan.id}`}>
                  <Card className="flex h-full flex-col gap-2 transition-shadow duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)]">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 text-sm font-bold text-[color:var(--color-ink)]">
                        {plan.title}
                      </h3>
                      <Badge variant="accent">{plan.subject.name}</Badge>
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
        ) : (
          <EmptyState
            title={t("khota.noActivePlans")}
            description={t("studyPlans.subtitle")}
            action={
              projectId ? (
                <Button onClick={() => setPickerOpen(true)}>{t("khota.createFirstPlan")}</Button>
              ) : null
            }
          />
        )}
      </section>
      {projectId && project ? (
        <SourceScopePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          projectId={projectId}
          projectTitle={project.title}
          confirmLabel={t("common.confirm")}
          onConfirm={handleScope}
        />
      ) : null}
    </div>
  );
}
