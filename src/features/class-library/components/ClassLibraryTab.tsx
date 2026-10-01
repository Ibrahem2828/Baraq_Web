"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, School } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useApiErrorMessage } from "@/lib/api/useApiErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";
import { libraryDownloadHref, type ClassLibraryItem, type LibraryCategory } from "../api/classLibraryApi";
import { useClassLibrary, useSendLibraryItem } from "../hooks/useClassLibrary";

const CATEGORIES: LibraryCategory[] = ["handout", "worksheet", "past_exam", "recording", "other"];

/**
 * The Classroom Shared Library: what the learner's school and classes
 * shared. A learner outside every organization sees how to join one -- their
 * own uploads stay in the other tabs, unrestricted.
 */
export function ClassLibraryTab() {
  const t = useTranslations();
  const [category, setCategory] = useState<LibraryCategory | "">("");
  const library = useClassLibrary(category ? { category } : {});
  const send = useSendLibraryItem();
  const errorMessage = useApiErrorMessage();

  const groups = useMemo(() => {
    const byPlace = new Map<string, ClassLibraryItem[]>();
    for (const item of library.data?.items ?? []) {
      const place = item.classroom_name
        ? `${item.organization_name} — ${item.classroom_name}`
        : `${item.organization_name} — ${t("classLibrary.wholeOrganization")}`;
      byPlace.set(place, [...(byPlace.get(place) ?? []), item]);
    }
    return [...byPlace.entries()];
  }, [library.data, t]);

  if (library.isPending) return <LoadingState label={t("common.loading")} />;
  if (library.isError) {
    return (
      <ErrorState title={t("errors.UNKNOWN")} retryLabel={t("common.retry")} onRetry={() => library.refetch()} />
    );
  }

  const filters = (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("classLibrary.categoryFilter")}>
      {(["", ...CATEGORIES] as const).map((value) => (
        <Button
          key={value || "all"}
          size="sm"
          variant={category === value ? "primary" : "outline"}
          aria-pressed={category === value}
          onClick={() => setCategory(value)}
        >
          {value ? t(`classLibrary.category.${value}`) : t("classLibrary.allCategories")}
        </Button>
      ))}
    </div>
  );

  if (library.data.items.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {category ? filters : null}
        <EmptyState
          title={category ? t("classLibrary.emptyFilteredTitle") : t("classLibrary.emptyTitle")}
          description={category ? t("classLibrary.emptyFilteredDescription") : t("classLibrary.emptyDescription")}
        />
        {category ? null : (
          <div className="flex justify-center">
            <Link href="/join">
              <Button variant="outline">
                <School className="size-4" aria-hidden="true" />
                {t("classLibrary.joinAction")}
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-[color:var(--color-ink-soft)]">{t("classLibrary.intro")}</p>
      {filters}
      {send.isError ? (
        <p role="alert" className="text-sm text-[color:var(--color-destructive)]">
          {errorMessage(send.error)}
        </p>
      ) : null}
      {groups.map(([place, items]) => (
        <section key={place} className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[color:var(--color-ink-soft)]">{place}</h2>
          <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <StaggerItem key={item.public_id}>
                <Card className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-base font-bold text-[color:var(--color-ink)]">{item.title}</h3>
                    <Badge variant="accent">{t(`classLibrary.category.${item.category}`)}</Badge>
                  </div>
                  <p className="text-xs text-[color:var(--color-ink-faint)]">
                    {[item.subject_name, item.original_filename, formatSize(item.file_size, t("classLibrary.mb"), t("classLibrary.kb"))]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {item.description ? (
                    <p className="line-clamp-3 text-sm text-[color:var(--color-ink-soft)]">{item.description}</p>
                  ) : null}
                  <div className="mt-auto flex flex-col gap-2">
                    {item.characters.length ? (
                      <>
                        <span className="text-xs font-semibold text-[color:var(--color-ink-faint)]">
                          {t("classLibrary.sendTo")}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {item.characters.map((character) => (
                            <Button
                              key={character}
                              size="sm"
                              variant="secondary"
                              loading={send.isPending && send.variables?.id === item.public_id && send.variables.character === character}
                              disabled={send.isPending}
                              onClick={() => send.mutate({ id: item.public_id, character })}
                            >
                              {t(`characters.${character}.name`)}
                            </Button>
                          ))}
                        </div>
                      </>
                    ) : null}
                    <a
                      href={libraryDownloadHref(item.public_id)}
                      download
                      className="inline-flex items-center gap-1 self-start text-sm font-semibold text-[color:var(--color-accent)] hover:underline"
                    >
                      <Download className="size-4" aria-hidden="true" />
                      {t("classLibrary.download")}
                    </a>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </StaggerIn>
        </section>
      ))}
    </div>
  );
}

function formatSize(bytes: number, mb: string, kb: string) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} ${kb}`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ${mb}`;
}
