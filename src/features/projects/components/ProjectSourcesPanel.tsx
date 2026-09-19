"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useSources, useUploadSource, useDeleteSource } from "@/features/sources/hooks/useSources";
import { validateSourceFile, effectiveUploadLimitBytes } from "@/features/sources/validation";
import { useMySubscription } from "@/features/subscriptions/hooks/useSubscriptions";
import { SOURCE_UPLOAD } from "@/config/constants";
import type { SourceStatus } from "@/types/domain";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

const STATUS_VARIANT: Record<SourceStatus, "neutral" | "info" | "success" | "destructive"> = {
  uploaded: "neutral",
  processing: "info",
  ready: "success",
  failed: "destructive",
};

const uploadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});
type UploadFormValues = z.infer<typeof uploadSchema>;

export function ProjectSourcesPanel({ projectId }: { projectId: string }) {
  const t = useTranslations();
  const sources = useSources({ project: projectId });
  const uploadSource = useUploadSource();
  // The limit this user actually has: min(plan, platform), computed
  // server-side. Showing the platform ceiling told a Free user they
  // could upload far more than their plan allows.
  const subscription = useMySubscription();
  const uploadLimitBytes = effectiveUploadLimitBytes(
    subscription.data?.effective_limits?.max_file_size_mb,
  );
  const deleteSource = useDeleteSource();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);

  const uploadForm = useForm<UploadFormValues>({ resolver: zodResolver(uploadSchema) });

  const onUpload = uploadForm.handleSubmit((values) => {
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
    formData.set("project", projectId);
    formData.set("file", file);

    uploadSource.mutate(formData, {
      onSuccess: () => {
        setUploadOpen(false);
        uploadForm.reset();
        setFile(null);
      },
    });
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" aria-hidden="true" />
          {t("library.uploadAction")}
        </Button>
      </div>

      {sources.isPending ? (
        <LoadingState label={t("common.loading")} />
      ) : sources.isError ? (
        <ErrorState
          title={t("errors.UNKNOWN")}
          retryLabel={t("common.retry")}
          onRetry={() => sources.refetch()}
        />
      ) : sources.data.items.length === 0 ? (
        <EmptyState
          title={t("workspace.sources.emptyTitle")}
          description={t("workspace.sources.emptyDescription")}
        />
      ) : (
        <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.data.items.map((source) => (
            <StaggerItem key={source.id}>
              <Card className="flex h-full flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/library/${source.id}`} className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-base font-bold text-[color:var(--color-ink)]">
                      {source.title}
                    </h3>
                  </Link>
                  <IconButton
                    aria-label={t("common.delete")}
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget({ id: source.id, title: source.title })}
                  >
                    <Trash2
                      className="size-4 text-[color:var(--color-destructive)]"
                      aria-hidden="true"
                    />
                  </IconButton>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[source.status]}>
                    {t(`library.status.${source.status}`)}
                  </Badge>
                  <span className="text-xs font-medium tracking-wide text-[color:var(--color-ink-faint)] uppercase">
                    {source.source_type}
                  </span>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerIn>
      )}

      <Modal
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) {
            uploadForm.reset();
            setFile(null);
            setFileError(null);
          }
        }}
        title={t("library.upload.title")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setUploadOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={onUpload} loading={uploadSource.isPending}>
              {t("library.upload.submit")}
            </Button>
          </>
        }
      >
        <form onSubmit={onUpload} noValidate className="flex flex-col gap-4">
          <Input
            label={t("library.upload.titleField")}
            error={uploadForm.formState.errors.title ? t("common.requiredField") : undefined}
            {...uploadForm.register("title")}
          />
          <Textarea
            label={t("library.upload.description")}
            {...uploadForm.register("description")}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[color:var(--color-ink)]">
              {t("library.upload.file")}
            </label>
            <input
              type="file"
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
            {fileError ? (
              <p role="alert" className="text-xs text-[color:var(--color-destructive)]">
                {fileError}
              </p>
            ) : null}
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("workspace.sources.deleteTitle")}
        description={deleteTarget?.title}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        destructive
        loading={deleteSource.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteSource.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
