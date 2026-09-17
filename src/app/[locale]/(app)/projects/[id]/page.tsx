"use client";

import { use, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  useProject,
  useArchiveProject,
  useRestoreProject,
  useProjectActivity,
} from "@/features/projects/hooks/useProjects";
import { ProjectSourcesPanel } from "@/features/projects/components/ProjectSourcesPanel";
import { ProjectCharactersPanel } from "@/features/projects/components/ProjectCharactersPanel";
import { ProjectArtifactsPanel } from "@/features/projects/components/ProjectArtifactsPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const project = useProject(id);
  const archiveProject = useArchiveProject();
  const restoreProject = useRestoreProject();
  const activity = useProjectActivity(id);

  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);

  if (project.isPending) return <LoadingState label={t("common.loading")} />;
  if (project.isError || !project.data) {
    return (
      <ErrorState
        title={t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => project.refetch()}
      />
    );
  }

  const data = project.data;
  const isActive = data.status === "active";

  const timelineContent =
    activity.isPending ? (
      <LoadingState label={t("common.loading")} />
    ) : activity.isError ? (
      <ErrorState
        title={t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => activity.refetch()}
      />
    ) : activity.data.items.length === 0 ? (
      <EmptyState
        title={t("emptyStates.generic.title")}
        description={t("emptyStates.generic.description")}
      />
    ) : (
      <ol className="flex flex-col gap-4 border-s-2 border-[color:var(--color-border)] ps-4">
        {activity.data.items.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[color:var(--color-ink)]">
              {(() => {
                // Message keys can't contain literal dots (next-intl
                // treats "a.b" in a key as nested path segments, not a
                // flat key) — the backend's real `event_type` values are
                // dotted (e.g. "project.created"), so translate through
                // an underscore form instead.
                const key = `projects.activityEvents.${entry.event_type.replaceAll(".", "_")}`;
                return t.has(key) ? t(key) : entry.event_type;
              })()}
              {entry.actor_name ? ` · ${entry.actor_name}` : ""}
            </span>
            <span className="text-xs text-[color:var(--color-ink-faint)]">
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(entry.created_at))}
            </span>
          </li>
        ))}
      </ol>
    );

  return (
    <div>
      <PageHeader
        title={data.title}
        description={data.goal ?? undefined}
        actions={
          <>
            <Badge variant={isActive ? "success" : "neutral"}>
              {t(`projects.status.${data.status}`)}
            </Badge>
            {isActive ? (
              <Button variant="outline" onClick={() => setArchiveConfirmOpen(true)}>
                {t("projects.archive")}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setRestoreConfirmOpen(true)}>
                {t("projects.restore")}
              </Button>
            )}
          </>
        }
      />

      <Tabs
        items={[
          {
            value: "sources",
            label: t("workspace.tabs.sources"),
            content: <ProjectSourcesPanel projectId={data.public_id} />,
          },
          {
            value: "characters",
            label: t("workspace.tabs.characters"),
            content: <ProjectCharactersPanel projectId={data.public_id} />,
          },
          {
            value: "artifacts",
            label: t("workspace.tabs.artifacts"),
            content: <ProjectArtifactsPanel projectId={data.public_id} />,
          },
          {
            value: "timeline",
            label: t("workspace.tabs.timeline"),
            content: <Card>{timelineContent}</Card>,
          },
        ]}
      />

      <ConfirmationDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title={t("projects.archiveConfirmTitle")}
        description={t("projects.archiveConfirmDescription")}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        destructive
        loading={archiveProject.isPending}
        onConfirm={() =>
          archiveProject.mutate(data.public_id, { onSettled: () => setArchiveConfirmOpen(false) })
        }
      />
      <ConfirmationDialog
        open={restoreConfirmOpen}
        onOpenChange={setRestoreConfirmOpen}
        title={t("projects.restoreConfirmTitle")}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        loading={restoreProject.isPending}
        onConfirm={() =>
          restoreProject.mutate(data.public_id, { onSettled: () => setRestoreConfirmOpen(false) })
        }
      />
    </div>
  );
}
