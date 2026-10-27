"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";

function DetailFromQuery({ render }: { render: (id: string) => ReactNode }) {
  const t = useTranslations();
  const id = useSearchParams().get("id");
  if (!id) {
    return (
      <EmptyState
        title={t("emptyStates.generic.title")}
        description={t("emptyStates.generic.description")}
      />
    );
  }
  // Keyed by id: the web remounts a detail page when its path segment
  // changes, and so must this one when only the query does.
  return <Suspense key={id}>{render(id)}</Suspense>;
}

/**
 * The app's detail pages (`<route>/view?id=…`, see lib/routing/detail-href):
 * the same component the web renders at `<route>/[id]`, with the id taken
 * from the query string. `useSearchParams` in a static export needs a
 * Suspense boundary; the page shell is prerendered and the id arrives on
 * the client.
 */
export function NativeDetailRoute({ render }: { render: (id: string) => ReactNode }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <DetailFromQuery render={render} />
    </Suspense>
  );
}
