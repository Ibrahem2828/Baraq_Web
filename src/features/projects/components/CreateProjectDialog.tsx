"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useCreateProject } from "@/features/projects/hooks/useProjects";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import type { Project } from "@/types/domain";

const createProjectSchema = z.object({
  title: z.string().min(1),
  goal: z.string().optional(),
});
type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

/**
 * The one place a Project gets created — shared by the projects list page
 * and `RequireProject`'s empty state, so both stay in sync with the same
 * fields/validation instead of drifting into two forms.
 */
export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (project: Project) => void;
}) {
  const t = useTranslations();
  const createProject = useCreateProject();
  const form = useForm<CreateProjectFormValues>({ resolver: zodResolver(createProjectSchema) });

  const onSubmit = form.handleSubmit((values) => {
    createProject.mutate(
      { title: values.title, goal: values.goal || null },
      {
        onSuccess: (project) => {
          onOpenChange(false);
          form.reset();
          onCreated?.(project);
        },
      },
    );
  });

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) form.reset();
      }}
      title={t("projects.createTitle")}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onSubmit} loading={createProject.isPending}>
            {t("common.confirm")}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label={t("projects.titleField")}
          error={form.formState.errors.title ? t("common.requiredField") : undefined}
          {...form.register("title")}
        />
        <Textarea label={t("projects.goal")} {...form.register("goal")} />
      </form>
    </Modal>
  );
}
