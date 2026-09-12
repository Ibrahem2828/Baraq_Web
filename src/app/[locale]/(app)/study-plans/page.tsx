"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Plus } from "lucide-react";
import { z } from "zod";
import { Link, useRouter } from "@/i18n/navigation";
import { useStudyPlans, useCreateStudyPlan } from "@/features/study-plans/hooks/useStudyPlans";
import { useCreateAIJob } from "@/features/ai-jobs/hooks/useAIJob";
import { createStudyPlanSchema, type CreateStudyPlanInput } from "@/lib/validation/study-plans";
import type { StudyPlanStatus } from "@/types/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Progress } from "@/components/ui/Progress";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

const STATUS_VARIANT: Record<StudyPlanStatus, "neutral" | "info" | "success" | "destructive"> = {
  draft: "neutral",
  active: "info",
  completed: "success",
  cancelled: "destructive",
};

const generateSchema = z.object({ source: z.number().int().positive() });
type GenerateInput = z.infer<typeof generateSchema>;

export default function StudyPlansPage() {
  const t = useTranslations();
  const router = useRouter();
  const plans = useStudyPlans();
  const createPlan = useCreateStudyPlan();
  const createAIJob = useCreateAIJob();

  const [createOpen, setCreateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  const createForm = useForm<CreateStudyPlanInput>({
    resolver: zodResolver(createStudyPlanSchema),
  });
  const generateForm = useForm<GenerateInput>({ resolver: zodResolver(generateSchema) });

  const onCreate = createForm.handleSubmit((values) => {
    createPlan.mutate(values, {
      onSuccess: (plan) => {
        setCreateOpen(false);
        createForm.reset();
        router.push(`/study-plans/${plan.id}`);
      },
    });
  });

  const onGenerate = generateForm.handleSubmit((values) => {
    createAIJob.mutate(
      { task_type: "khota_generate_plan", source: values.source },
      {
        onSuccess: (job) => {
          setGenerateOpen(false);
          generateForm.reset();
          router.push(`/ai-jobs/${job.public_id}`);
        },
      },
    );
  });

  return (
    <div>
      <PageHeader
        title={t("studyPlans.title")}
        description={t("studyPlans.subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={() => setGenerateOpen(true)}>
              <Sparkles className="size-4" aria-hidden="true" />
              {t("studyPlans.generateWithKhota")}
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              {t("studyPlans.newPlan")}
            </Button>
          </>
        }
      />

      {plans.isPending ? (
        <LoadingState label={t("common.loading")} />
      ) : plans.isError ? (
        <ErrorState
          title={t("errors.UNKNOWN")}
          retryLabel={t("common.retry")}
          onRetry={() => plans.refetch()}
        />
      ) : plans.data.items.length === 0 ? (
        <EmptyState
          title={t("emptyStates.studyPlans.title")}
          description={t("emptyStates.studyPlans.description")}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              {t("emptyStates.studyPlans.action")}
            </Button>
          }
        />
      ) : (
        <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.data.items.map((plan) => (
            <StaggerItem key={plan.id}>
              <Link href={`/study-plans/${plan.id}`}>
                <Card className="flex h-full flex-col gap-3 transition-shadow duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)]">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-base font-bold text-[color:var(--color-ink)]">
                      {plan.title}
                    </h3>
                    <Badge variant={STATUS_VARIANT[plan.status]}>
                      {t(`studyPlans.status.${plan.status}`)}
                    </Badge>
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
      )}

      <Modal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) createForm.reset();
        }}
        title={t("studyPlans.createTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={onCreate} loading={createPlan.isPending}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <form onSubmit={onCreate} noValidate className="flex flex-col gap-4">
          <Input
            label={t("studyPlans.titleField")}
            error={createForm.formState.errors.title ? t("common.requiredField") : undefined}
            {...createForm.register("title")}
          />
          <Input
            label={t("studyPlans.subjectField")}
            type="number"
            error={createForm.formState.errors.subject ? t("common.requiredField") : undefined}
            {...createForm.register("subject", { valueAsNumber: true })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t("studyPlans.startDate")}
              type="date"
              error={createForm.formState.errors.start_date ? t("common.requiredField") : undefined}
              {...createForm.register("start_date")}
            />
            <Input
              label={t("studyPlans.endDate")}
              type="date"
              error={createForm.formState.errors.end_date ? t("common.requiredField") : undefined}
              {...createForm.register("end_date")}
            />
          </div>
          <Input
            label={t("studyPlans.dailyMinutes")}
            type="number"
            error={
              createForm.formState.errors.daily_study_minutes
                ? t("common.requiredField")
                : undefined
            }
            {...createForm.register("daily_study_minutes", { valueAsNumber: true })}
          />
        </form>
      </Modal>

      <Modal
        open={generateOpen}
        onOpenChange={(open) => {
          setGenerateOpen(open);
          if (!open) generateForm.reset();
        }}
        title={t("studyPlans.generateWithKhota")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setGenerateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={onGenerate} loading={createAIJob.isPending}>
              {t("common.confirm")}
            </Button>
          </>
        }
      >
        <form onSubmit={onGenerate} noValidate>
          <Input
            label={t("library.title")}
            type="number"
            error={generateForm.formState.errors.source ? t("common.requiredField") : undefined}
            {...generateForm.register("source", { valueAsNumber: true })}
          />
        </form>
      </Modal>
    </div>
  );
}
