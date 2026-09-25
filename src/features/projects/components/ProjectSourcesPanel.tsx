"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Upload, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useSources, useDeleteSource } from "@/features/sources/hooks/useSources";
import { UploadSourceDialog } from "@/features/sources/components/UploadSourceDialog";
import { useApiErrorMessage } from "@/lib/api/useApiErrorMessage";
import { useToast } from "@/components/feedback/Toast";
import type { SourceStatus } from "@/types/domain";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
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

export function ProjectSourcesPanel({ projectId }: { projectId: string }) {
  const t = useTranslations();
  const sources = useSources({ project: projectId });
  const errorMessage = useApiErrorMessage();
  const { toast } = useToast();
  const deleteSource = useDeleteSource();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);

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

      <UploadSourceDialog open={uploadOpen} onOpenChange={setUploadOpen} projectId={projectId} />


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
          deleteSource.mutate(deleteTarget.id, {
            onError: (error) => toast({ title: errorMessage(error), variant: "error" }),
            onSettled: () => setDeleteTarget(null),
          });
        }}
      />
    </div>
  );
}
