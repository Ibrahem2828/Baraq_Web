"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import {
  useProject,
  useArchiveProject,
  useRestoreProject,
  useProjectActivity,
} from "@/features/projects/hooks/useProjects";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const project = useProject(id);
  const archiveProject = useArchiveProject();
  const restoreProject = useRestoreProject();
  const activity = useProjectActivity(id);

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
              <Button
                variant="outline"
                onClick={() => archiveProject.mutate(data.public_id)}
                loading={archiveProject.isPending}
              >
                {t("projects.archive")}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => restoreProject.mutate(data.public_id)}
                loading={restoreProject.isPending}
              >
                {t("projects.restore")}
              </Button>
            )}
          </>
        }
      />

      <Card>
        <h2 className="mb-4 text-sm font-bold text-[color:var(--color-ink)]">
          {t("projects.activity")}
        </h2>

        {activity.isPending ? (
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
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(entry.created_at))}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
