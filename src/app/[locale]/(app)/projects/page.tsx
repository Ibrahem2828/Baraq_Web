"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { CreateProjectDialog } from "@/features/projects/components/CreateProjectDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

export default function ProjectsPage() {
  const t = useTranslations();
  const projects = useProjects();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title={t("projects.title")}
        description={t("projects.subtitle")}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            {t("projects.newProject")}
          </Button>
        }
      />

      {projects.isPending ? (
        <LoadingState label={t("common.loading")} />
      ) : projects.isError ? (
        <ErrorState
          title={t("errors.UNKNOWN")}
          retryLabel={t("common.retry")}
          onRetry={() => projects.refetch()}
        />
      ) : projects.data.items.length === 0 ? (
        <EmptyState
          title={t("projects.emptyTitle")}
          description={t("projects.emptyDescription")}
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              {t("projects.newProject")}
            </Button>
          }
        />
      ) : (
        <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.data.items.map((project) => (
            <StaggerItem key={project.public_id}>
              <Link href={`/projects/${project.public_id}`}>
                <Card className="flex h-full flex-col gap-2 transition-shadow duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)]">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-base font-bold text-[color:var(--color-ink)]">
                      {project.title}
                    </h3>
                    <Badge variant={project.status === "active" ? "success" : "neutral"}>
                      {t(`projects.status.${project.status}`)}
                    </Badge>
                  </div>
                  {project.goal ? (
                    <p className="line-clamp-2 text-sm text-[color:var(--color-ink-soft)]">
                      {project.goal}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-center gap-2 pt-2">
                    <Badge variant="neutral">{project.source_count}</Badge>
                    <Badge variant="neutral">{project.ai_job_count}</Badge>
                  </div>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </StaggerIn>
      )}

      <CreateProjectDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
