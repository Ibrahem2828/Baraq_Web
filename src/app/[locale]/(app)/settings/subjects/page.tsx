"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { X, BookOpen } from "lucide-react";
import {
  useEducationStages,
  useSubjectsList,
  useUserSubjects,
  useAddUserSubject,
  useRemoveUserSubject,
} from "@/features/subjects/hooks/useSubjects";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useToast } from "@/components/feedback/Toast";
import { FadeIn } from "@/components/motion/FadeIn";

export default function SubjectsSettingsPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const userSubjects = useUserSubjects();
  const educationStages = useEducationStages();
  const addUserSubject = useAddUserSubject();
  const removeUserSubject = useRemoveUserSubject();

  const [stageId, setStageId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");

  const subjectsList = useSubjectsList(
    stageId ? { education_stage: Number(stageId), is_active: true } : { is_active: true },
  );

  const alreadyAddedIds = useMemo(
    () => new Set((userSubjects.data?.items ?? []).map((item) => item.subject.id)),
    [userSubjects.data],
  );

  const availableSubjects = useMemo(
    () => (subjectsList.data?.items ?? []).filter((subject) => !alreadyAddedIds.has(subject.id)),
    [subjectsList.data, alreadyAddedIds],
  );

  function handleAdd() {
    if (!subjectId) return;
    addUserSubject.mutate(Number(subjectId), {
      onSuccess: () => {
        setSubjectId("");
        toast({ title: t("settings.subjects.addSubject"), variant: "success" });
      },
      onError: () => toast({ title: t("errors.UNKNOWN"), variant: "error" }),
    });
  }

  function handleRemove(userSubjectId: number) {
    removeUserSubject.mutate(userSubjectId, {
      onError: () => toast({ title: t("errors.UNKNOWN"), variant: "error" }),
    });
  }

  return (
    <FadeIn>
      <PageHeader title={t("settings.subjects.title")} />

      <section className="mb-8">
        <SectionHeader title={t("settings.subjects.title")} />
        {userSubjects.isPending ? (
          <LoadingState />
        ) : userSubjects.isError ? (
          <ErrorState
            title={t("errors.UNKNOWN")}
            retryLabel={t("common.retry")}
            onRetry={() => userSubjects.refetch()}
          />
        ) : userSubjects.data.items.length === 0 ? (
          <EmptyState icon={<BookOpen className="size-6" />} title={t("settings.subjects.empty")} />
        ) : (
          <Card className="divide-y divide-[color:var(--color-border)] p-0">
            {userSubjects.data.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[color:var(--color-ink)]">
                    {item.subject.name}
                  </p>
                  <p className="text-xs text-[color:var(--color-ink-soft)]">
                    {item.subject.education_stage_name}
                  </p>
                </div>
                <IconButton
                  aria-label={t("common.delete")}
                  size="sm"
                  onClick={() => handleRemove(item.id)}
                  disabled={removeUserSubject.isPending}
                >
                  <X className="size-4" aria-hidden="true" />
                </IconButton>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <SectionHeader title={t("settings.subjects.addSubject")} />
        <Card className="flex flex-col gap-4 sm:max-w-lg">
          {educationStages.isPending ? (
            <LoadingState />
          ) : educationStages.isError ? (
            <ErrorState
              title={t("errors.UNKNOWN")}
              retryLabel={t("common.retry")}
              onRetry={() => educationStages.refetch()}
            />
          ) : (
            <>
              <Select
                label={t("onboarding.profileSetup.educationStage")}
                placeholder={t("onboarding.profileSetup.educationStage")}
                value={stageId}
                onChange={(event) => {
                  setStageId(event.target.value);
                  setSubjectId("");
                }}
                options={educationStages.data.items.map((stage) => ({
                  value: String(stage.id),
                  label: stage.name,
                }))}
              />
              <Select
                label={t("settings.subjects.title")}
                placeholder={t("settings.subjects.addSubject")}
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                disabled={subjectsList.isPending || availableSubjects.length === 0}
                options={availableSubjects.map((subject) => ({
                  value: String(subject.id),
                  label: subject.name,
                }))}
              />
              <Button
                onClick={handleAdd}
                loading={addUserSubject.isPending}
                disabled={!subjectId}
                className="self-start"
              >
                {t("settings.subjects.addSubject")}
              </Button>
            </>
          )}
        </Card>
      </section>
    </FadeIn>
  );
}
