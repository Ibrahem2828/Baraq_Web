"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useProject } from "./hooks/useProjects";
import type { Project } from "@/types/domain";

interface ActiveProjectContextValue {
  /** The active project's public_id, read from `?project=` — the URL is the single source of truth, not local/localStorage state. */
  projectId: string | null;
  project: Project | undefined;
  isLoading: boolean;
  /** True when `projectId` is set but doesn't resolve to a project this user owns (bad/stale link). */
  isError: boolean;
}

const ActiveProjectContext = createContext<ActiveProjectContextValue | null>(null);

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const projectQuery = useProject(projectId ?? "");

  const value = useMemo<ActiveProjectContextValue>(
    () => ({
      projectId,
      project: projectId ? projectQuery.data : undefined,
      isLoading: Boolean(projectId) && projectQuery.isPending,
      isError: Boolean(projectId) && projectQuery.isError,
    }),
    [projectId, projectQuery.data, projectQuery.isPending, projectQuery.isError],
  );

  return <ActiveProjectContext.Provider value={value}>{children}</ActiveProjectContext.Provider>;
}

export function useActiveProject(): ActiveProjectContextValue {
  const context = useContext(ActiveProjectContext);
  if (!context) throw new Error("useActiveProject must be used within an ActiveProjectProvider");
  return context;
}
