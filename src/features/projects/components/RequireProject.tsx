"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useActiveProject } from "../ActiveProjectContext";
import { useProjects } from "../hooks/useProjects";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

/**
 * Gates any AI-feature route behind a Project. Per 04_WEB_APP.md §4/§11: no
 * AI feature may render without a Project in context — a visitor with zero
 * projects sees the same "create project" flow as `/projects`, and a visitor
 * with projects but none selected sees a picker instead of an empty tools page.
 */
export function RequireProject({ children }: { children: ReactNode }) {
  const { projectId, project, isLoading, isError } = useActiveProject();

  if (projectId && isLoading) {
    return <LoadingState />;
  }
  if (projectId && !isError && project) {
    return <>{children}</>;
  }
  return <ProjectGate invalidSelection={Boolean(projectId && isError)} />;
}

function ProjectGate({ invalidSelection }: { invalidSelection: boolean }) {
  const t = useTranslations();
  const pathname = usePathname();
  const projects = useProjects({ status: "active" });
  const [createOpen, setCreateOpen] = useState(false);

  if (projects.isPending) return <LoadingState label={t("common.loading")} />;
  if (projects.isError) {
    return (
      <ErrorState
        title={t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => projects.refetch()}
      />
    );
  }

  if (projects.data.items.length === 0) {
    return (
      <div>
        <EmptyState
          title={t("projects.emptyTitle")}
          description={t("projects.emptyDescription")}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              {t("projects.newProject")}
            </Button>
          }
        />
        <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("projects.pickTitle")}
        description={invalidSelection ? t("projects.pickInvalidDescription") : t("projects.pickDescription")}
      />
      <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.data.items.map((item) => (
          <StaggerItem key={item.public_id}>
            <Link href={{ pathname, query: { project: item.public_id } }}>
              <Card className="flex h-full flex-col gap-2 transition-shadow duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)]">
                <h3 className="line-clamp-1 text-base font-bold text-[color:var(--color-ink)]">
                  {item.title}
                </h3>
                {item.goal ? (
                  <p className="line-clamp-2 text-sm text-[color:var(--color-ink-soft)]">{item.goal}</p>
                ) : null}
              </Card>
            </Link>
          </StaggerItem>
        ))}
      </StaggerIn>
    </div>
  );
}
