"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUploadSource } from "@/features/sources/hooks/useSources";
import { validateSourceFile, effectiveUploadLimitBytes } from "@/features/sources/validation";
import { useMySubscription } from "@/features/subscriptions/hooks/useSubscriptions";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { useApiErrorMessage } from "@/lib/api/useApiErrorMessage";
import { isUploadCanceled } from "@/lib/api/upload";
import { SOURCE_UPLOAD } from "@/config/constants";
import type { StudentSource } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Progress } from "@/components/ui/Progress";

const uploadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  project: z.string().optional(),
});
type UploadFormValues = z.infer<typeof uploadSchema>;

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/**
 * The one upload dialog (library and project Sources tab used to carry two
 * copies of it).
 *
 * Every AI character works on a project's sources -- the AI service refuses a
 * job without one -- so a source must belong to a project. Opened from a
 * project, it uses that project; opened from the library, the learner picks
 * one here instead of producing a source no character can use.
 */
export function UploadSourceDialog({
  open,
  onOpenChange,
  projectId,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  onUploaded?: (source: StudentSource) => void;
}) {
  const t = useTranslations();
  const uploadSource = useUploadSource();
  const errorMessage = useApiErrorMessage();
  // The limit this user actually has: min(plan, platform), computed server-side.
  const subscription = useMySubscription();
  const uploadLimitBytes = effectiveUploadLimitBytes(
    subscription.data?.effective_limits?.max_file_size_mb,
  );
  const projects = useProjects({ status: "active" });
  const needsProjectChoice = !projectId;
  const projectItems = useMemo(() => projects.data?.items ?? [], [projects.data]);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState(false);
  const form = useForm<UploadFormValues>({ resolver: zodResolver(uploadSchema) });

  // A single project needs no choice: preselect it.
  useEffect(() => {
    if (needsProjectChoice && projectItems.length === 1 && !form.getValues("project")) {
      form.setValue("project", projectItems[0]!.public_id);
    }
  }, [needsProjectChoice, projectItems, form]);

  function reset() {
    form.reset();
    setFile(null);
    setFileError(null);
    setProjectError(false);
  }

  function close() {
    if (uploadSource.isPending) uploadSource.cancel();
    onOpenChange(false);
    reset();
  }

  const onSubmit = form.handleSubmit((values) => {
    const targetProject = projectId ?? values.project;
    if (!targetProject) {
      setProjectError(true);
      return;
    }
    if (!file) {
      setFileError(t("common.requiredField"));
      return;
    }
    const errorKey = validateSourceFile(file, uploadLimitBytes);
    if (errorKey) {
      setFileError(t(errorKey));
      return;
    }
    setFileError(null);

    const formData = new FormData();
    formData.set("title", values.title);
    if (values.description) formData.set("description", values.description);
    formData.set("project", targetProject);
    formData.set("file", file);

    uploadSource.mutate(formData, {
      // A plan/limit rejection is actionable and must be shown; a cancel is
      // the learner's own choice and needs no message.
      onError: (error) => {
        if (!isUploadCanceled(error)) setFileError(errorMessage(error));
      },
      onSuccess: (source) => {
        onOpenChange(false);
        reset();
        onUploaded?.(source);
      },
    });
  });

  const uploading = uploadSource.isPending;
  const percent = Math.round((uploadSource.progress ?? 0) * 100);
  const noProjects = needsProjectChoice && projects.isSuccess && projectItems.length === 0;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={t("library.upload.title")}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {uploading ? t("library.upload.cancelUpload") : t("common.cancel")}
          </Button>
          <Button onClick={onSubmit} loading={uploading} disabled={noProjects}>
            {t("library.upload.submit")}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label={t("library.upload.titleField")}
          disabled={uploading}
          error={form.formState.errors.title ? t("common.requiredField") : undefined}
          {...form.register("title")}
        />
        <Textarea
          label={t("library.upload.description")}
          disabled={uploading}
          {...form.register("description")}
        />
        {needsProjectChoice ? (
          noProjects ? (
            <p role="alert" className="text-sm text-[color:var(--color-destructive)]">
              {t("library.upload.noProjects")}
            </p>
          ) : (
            <Select
              label={t("library.upload.project")}
              placeholder={t("library.upload.chooseProject")}
              defaultValue=""
              disabled={uploading || projects.isPending}
              error={projectError ? t("library.upload.projectRequired") : undefined}
              options={projectItems.map((project) => ({
                value: project.public_id,
                label: project.title,
              }))}
              {...form.register("project", { onChange: () => setProjectError(false) })}
            />
          )
        ) : null}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[color:var(--color-ink)]">
            {t("library.upload.file")}
          </label>
          <input
            type="file"
            disabled={uploading}
            accept={SOURCE_UPLOAD.acceptedExtensions.map((ext) => `.${ext}`).join(",")}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setFileError(null);
            }}
            className="text-sm text-[color:var(--color-ink)] file:me-3 file:rounded-[var(--radius-full)] file:border-0 file:bg-[color:var(--color-bg-soft)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[color:var(--color-ink)]"
          />
          <p className="text-xs text-[color:var(--color-ink-faint)]">
            {t("library.upload.maxSize", {
              megabytes: Math.floor(uploadLimitBytes / (1024 * 1024)),
            })}
          </p>
          {uploading ? (
            <Progress
              value={percent}
              label={
                percent >= 100
                  ? t("library.upload.processing")
                  : t("library.upload.uploading", {
                      sent: formatMegabytes(((file?.size ?? 0) * percent) / 100),
                      total: formatMegabytes(file?.size ?? 0),
                    })
              }
              indeterminate={percent >= 100}
            />
          ) : null}
          {fileError ? (
            <p role="alert" className="text-xs text-[color:var(--color-destructive)]">
              {fileError}
            </p>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
