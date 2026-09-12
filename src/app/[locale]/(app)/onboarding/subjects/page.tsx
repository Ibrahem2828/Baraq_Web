"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useStudentProfile } from "@/features/students/hooks/useStudentProfile";
import {
  useSubjectsList,
  useUserSubjects,
  useAddUserSubject,
  useRemoveUserSubject,
} from "@/features/subjects/hooks/useSubjects";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useToast } from "@/components/feedback/Toast";
import { FadeIn } from "@/components/motion/FadeIn";
import { cn } from "@/lib/utils/cn";

export default function OnboardingSubjectsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();

  // Best-effort: read the education stage just chosen in profile-setup so the
  // subject list is pre-filtered. If the profile fetch fails (e.g. this page
  // was opened directly without completing setup) we fall back to all active
  // subjects rather than blocking the page on that error.
  const studentProfile = useStudentProfile();
  const stageId = studentProfile.data?.education_stage;

  const userSubjects = useUserSubjects();
  const subjectsList = useSubjectsList(
    stageId ? { education_stage: stageId, is_active: true } : { is_active: true },
  );
  const addUserSubject = useAddUserSubject();
  const removeUserSubject = useRemoveUserSubject();

  const addedBySubjectId = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of userSubjects.data?.items ?? []) {
      map.set(item.subject.id, item.id);
    }
    return map;
  }, [userSubjects.data]);

  const hasAtLeastOne = addedBySubjectId.size > 0;

  function toggle(subjectId: number) {
    const existingUserSubjectId = addedBySubjectId.get(subjectId);
    if (existingUserSubjectId) {
      removeUserSubject.mutate(existingUserSubjectId, {
        onError: () => toast({ title: t("errors.UNKNOWN"), variant: "error" }),
      });
    } else {
      addUserSubject.mutate(subjectId, {
        onError: () => toast({ title: t("errors.UNKNOWN"), variant: "error" }),
      });
    }
  }

  const isLoading = subjectsList.isPending || userSubjects.isPending;
  const isError = subjectsList.isError || userSubjects.isError;

  return (
    <FadeIn preset="slide-up" className="mx-auto max-w-2xl">
      <PageHeader
        title={t("onboarding.subjectsSelection.title")}
        description={t("onboarding.subjectsSelection.subtitle")}
      />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          title={t("errors.UNKNOWN")}
          retryLabel={t("common.retry")}
          onRetry={() => {
            subjectsList.refetch();
            userSubjects.refetch();
          }}
        />
      ) : subjectsList.data.items.length === 0 ? (
        <EmptyState
          title={t("emptyStates.generic.title")}
          description={t("emptyStates.generic.description")}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {subjectsList.data.items.map((subject) => {
              const added = addedBySubjectId.has(subject.id);
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => toggle(subject.id)}
                  disabled={addUserSubject.isPending || removeUserSubject.isPending}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-[var(--radius-md)] border p-4 text-start transition-colors",
                    added
                      ? "border-[color:var(--color-accent-solid)] bg-[color:var(--color-accent-solid)]/10"
                      : "border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-soft)]",
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                      {subject.name}
                    </p>
                    <p className="text-xs text-[color:var(--color-ink-soft)]">
                      {subject.education_stage_name}
                    </p>
                  </div>
                  {added ? (
                    <Check
                      className="size-5 shrink-0 text-[color:var(--color-accent)]"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <Button
            size="lg"
            className="mt-8 w-full"
            disabled={!hasAtLeastOne}
            onClick={() => router.push("/")}
          >
            {t("onboarding.subjectsSelection.submit")}
          </Button>
        </>
      )}
    </FadeIn>
  );
}
