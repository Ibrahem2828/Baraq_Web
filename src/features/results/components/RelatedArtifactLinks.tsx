"use client";

import { useTranslations } from "next-intl";
import { FileText, FolderKanban } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useSource } from "@/features/sources/hooks/useSources";
import { Badge } from "@/components/ui/Badge";

/**
 * "Open the original source" — 04_WEB_APP.md §6/§11: a character's result
 * must be able to open its original source(s). Silently renders nothing when
 * `sourceId` is absent or the source can't be resolved (a deleted source, or
 * an older backend that doesn't expose this field yet) — a missing link is
 * never shown broken.
 */
export function OpenSourceLink({ sourceId }: { sourceId: number | null | undefined }) {
  const t = useTranslations();
  const source = useSource(sourceId ?? "");

  if (!sourceId || !source.data) return null;

  return (
    <Link href={`/library/${sourceId}`}>
      <Badge variant="neutral" className="inline-flex items-center gap-1.5">
        <FileText className="size-3.5" aria-hidden="true" />
        {t("relatedArtifacts.openSource")}
      </Badge>
    </Link>
  );
}

/** "Open the project" this result belongs to. Renders nothing when `projectId` is absent (older backend, or a result predating the project-scoping fix). */
export function OpenProjectLink({ projectId }: { projectId: string | null | undefined }) {
  const t = useTranslations();
  if (!projectId) return null;

  return (
    <Link href={`/projects/${projectId}`}>
      <Badge variant="accent" className="inline-flex items-center gap-1.5">
        <FolderKanban className="size-3.5" aria-hidden="true" />
        {t("relatedArtifacts.openProject")}
      </Badge>
    </Link>
  );
}
