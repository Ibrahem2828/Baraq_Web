"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useCollection } from "@/features/sources/hooks/useSources";
import { listCollectionSources } from "@/features/sources/api/sourcesApi";
import { Link } from "@/i18n/navigation";
import type { SourceStatus } from "@/types/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";

const STATUS_VARIANT: Record<SourceStatus, "neutral" | "info" | "success" | "destructive"> = {
  uploaded: "neutral",
  processing: "info",
  ready: "success",
  failed: "destructive",
};

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const collection = useCollection(id);
  const sources = useQuery({
    queryKey: ["sourceCollections", "sources", id] as const,
    queryFn: () => listCollectionSources(id),
    enabled: Boolean(id),
  });
  const sourceItems = sources.data ?? [];

  if (collection.isPending) return <LoadingState label={t("common.loading")} />;
  if (collection.isError || !collection.data) {
    return (
      <ErrorState
        title={t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => collection.refetch()}
      />
    );
  }

  const data = collection.data;

  return (
    <div>
      <PageHeader
        title={data.name}
        description={data.description ?? undefined}
        actions={
          <Badge variant={data.status === "active" ? "success" : "neutral"}>
            {data.status === "active" ? t("projects.status.active") : t("projects.status.archived")}
          </Badge>
        }
      />

      <Card className="p-0">
        <div className="border-b border-[color:var(--color-border)] p-5">
          <h2 className="text-sm font-bold text-[color:var(--color-ink)]">
            {t("library.collection.sourcesCount", { count: sourceItems.length })}
          </h2>
        </div>

        {sources.isPending ? (
          <LoadingState label={t("common.loading")} />
        ) : sources.isError ? (
          <ErrorState
            title={t("errors.UNKNOWN")}
            retryLabel={t("common.retry")}
            onRetry={() => sources.refetch()}
            className="m-5"
          />
        ) : sourceItems.length === 0 ? (
          <EmptyState
            title={t("emptyStates.generic.title")}
            description={t("emptyStates.generic.description")}
            className="m-5"
          />
        ) : (
          <ul>
            {sourceItems.map((source) => (
              <li
                key={source.id}
                className="border-b border-[color:var(--color-border)] last:border-0"
              >
                <Link
                  href={`/library/${source.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-[color:var(--color-bg-soft)]"
                >
                  <span className="text-sm font-medium text-[color:var(--color-ink)]">
                    {source.title}
                  </span>
                  <Badge variant={STATUS_VARIANT[source.status]}>
                    {t(`library.status.${source.status}`)}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
