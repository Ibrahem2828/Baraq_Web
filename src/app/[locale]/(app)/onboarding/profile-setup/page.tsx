"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { profileSetupSchema, type ProfileSetupInput } from "@/lib/validation/onboarding";
import { useEducationStages } from "@/features/subjects/hooks/useSubjects";
import { useSetupStudentProfile } from "@/features/students/hooks/useStudentProfile";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { useToast } from "@/components/feedback/Toast";
import { FadeIn } from "@/components/motion/FadeIn";

export default function ProfileSetupPage() {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const educationStages = useEducationStages();
  const setupProfile = useSetupStudentProfile();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProfileSetupInput>({ resolver: zodResolver(profileSetupSchema) });

  const onSubmit = handleSubmit((data) => {
    setupProfile.mutate(data, {
      onSuccess: () => router.push("/onboarding/subjects"),
      onError: () => toast({ title: t("errors.UNKNOWN"), variant: "error" }),
    });
  });

  return (
    <FadeIn preset="slide-up" className="mx-auto max-w-lg">
      <PageHeader title={t("onboarding.profileSetup.title")} />

      {educationStages.isPending ? (
        <LoadingState />
      ) : educationStages.isError ? (
        <ErrorState
          title={t("errors.UNKNOWN")}
          retryLabel={t("common.retry")}
          onRetry={() => educationStages.refetch()}
        />
      ) : (
        <Card>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <Controller
              name="education_stage"
              control={control}
              render={({ field }) => (
                <Select
                  label={t("onboarding.profileSetup.educationStage")}
                  placeholder={t("onboarding.profileSetup.educationStage")}
                  value={field.value === undefined ? "" : String(field.value)}
                  onChange={(event) =>
                    field.onChange(
                      event.target.value === "" ? undefined : Number(event.target.value),
                    )
                  }
                  error={errors.education_stage ? t("common.requiredField") : undefined}
                  options={educationStages.data.items.map((stage) => ({
                    value: String(stage.id),
                    label: stage.name,
                  }))}
                />
              )}
            />

            <Input
              label={t("onboarding.profileSetup.gradeLevel")}
              type="number"
              min={1}
              error={errors.grade_level ? t("common.requiredField") : undefined}
              {...register("grade_level", { valueAsNumber: true })}
            />

            <Input
              label={t("onboarding.profileSetup.specialization")}
              {...register("specialization")}
            />

            <Input label={t("onboarding.profileSetup.studyGoal")} {...register("study_goal")} />

            <Input
              label={t("onboarding.profileSetup.dailyStudyHours")}
              type="number"
              min={1}
              max={24}
              error={errors.daily_study_hours ? t("common.requiredField") : undefined}
              {...register("daily_study_hours", {
                setValueAs: (value) => (value === "" || value === null ? undefined : Number(value)),
              })}
            />

            <Button type="submit" size="lg" loading={setupProfile.isPending} className="mt-2">
              {t("onboarding.profileSetup.submit")}
            </Button>
          </form>
        </Card>
      )}
    </FadeIn>
  );
}
