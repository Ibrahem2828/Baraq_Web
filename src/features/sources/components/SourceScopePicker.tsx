"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSources, useCollections } from "@/features/sources/hooks/useSources";
import { updateSource, createCollection } from "@/features/sources/api/sourcesApi";
import { queryKeys } from "@/lib/query/keys";
import type { SourceType } from "@/types/domain";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { cn } from "@/lib/utils/cn";

export type SourceScope = { source: number } | { collection: number };

/**
 * The single place a content-based AI action picks its knowledge scope.
 * Per 04_WEB_APP.md §5: always shows the project + selection count, and the
 * source list query is hard-scoped to `projectId` — there is no control here
 * that could ever list or select a source from a different project.
 *
 * The backend only accepts one `source` OR one `collection` per AI job (never
 * a list of source ids), so selecting more than one source here funnels
 * through the existing collection mechanism: pick an existing collection or
 * create one, then bulk-assign the selected sources into it.
 */
export function SourceScopePicker({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  sourceType,
  singleSelectOnly = false,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  /** Restrict pickable sources to one type (e.g. "audio" for Sada). */
  sourceType?: SourceType;
  /** Sada's backend rejects a collection scope outright — exactly one source only, no multi-select/grouping UI. */
  singleSelectOnly?: boolean;
  confirmLabel: string;
  onConfirm: (scope: SourceScope) => void;
}) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const sources = useSources({ project: projectId, source_type: sourceType });
  const collections = useCollections({ project: projectId });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [groupChoice, setGroupChoice] = useState<string>("new");
  const [newCollectionName, setNewCollectionName] = useState("");

  function reset() {
    setSelected(new Set());
    setGroupChoice("new");
    setNewCollectionName("");
  }

  const groupIntoExisting = useMutation({
    mutationFn: async (collectionId: number) => {
      await Promise.all(
        Array.from(selected).map((sourceId) => updateSource(sourceId, { collection: collectionId })),
      );
      return collectionId;
    },
    onSuccess: (collectionId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sources.all });
      onOpenChange(false);
      reset();
      onConfirm({ collection: collectionId });
    },
  });

  const groupIntoNew = useMutation({
    mutationFn: async (name: string) => {
      const collection = await createCollection({ name, project: projectId });
      await Promise.all(
        Array.from(selected).map((sourceId) => updateSource(sourceId, { collection: collection.id })),
      );
      return collection.id;
    },
    onSuccess: (collectionId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sources.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sources.collections() });
      onOpenChange(false);
      reset();
      onConfirm({ collection: collectionId });
    },
  });

  const isGrouping = groupIntoExisting.isPending || groupIntoNew.isPending;

  function toggle(id: number) {
    if (singleSelectOnly) {
      setSelected((current) => (current.has(id) ? new Set() : new Set([id])));
      return;
    }
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    if (selected.size === 1) {
      const [only] = selected;
      onOpenChange(false);
      reset();
      onConfirm({ source: only });
      return;
    }
    if (selected.size > 1) {
      if (groupChoice === "new") {
        if (!newCollectionName.trim()) return;
        groupIntoNew.mutate(newCollectionName.trim());
      } else {
        groupIntoExisting.mutate(Number(groupChoice));
      }
    }
  }

  // A source outside these states is rejected by the backend for every
  // character (apps/sources/models.py AI_USABLE_STATUSES), so offering it
  // here would only produce a 400 after the user commits to a selection.
  // `uploaded` IS selectable: it is the terminal success state for every
  // non-text source. Purely a UX filter — the backend stays authoritative.
  const selectableSources = useMemo(
    () =>
      (sources.data?.items ?? []).filter(
        (source) => source.status === "uploaded" || source.status === "ready",
      ),
    [sources.data],
  );
  const total = selectableSources.length;
  const collectionOptions = useMemo(
    () => (collections.data?.items ?? []).map((c) => ({ value: String(c.id), label: c.name })),
    [collections.data],
  );

  const confirmDisabled =
    selected.size === 0 || (selected.size > 1 && groupChoice === "new" && !newCollectionName.trim());

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
      title={t("sourceScope.title")}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={confirmDisabled} loading={isGrouping}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-sm">
          <Badge variant="accent">{projectTitle}</Badge>
          <span className="text-[color:var(--color-ink-soft)]">
            {t("sourceScope.selectedCount", { selected: selected.size, total })}
          </span>
        </div>

        {sources.isPending ? (
          <LoadingState label={t("common.loading")} />
        ) : sources.isError ? (
          <ErrorState
            title={t("errors.UNKNOWN")}
            retryLabel={t("common.retry")}
            onRetry={() => sources.refetch()}
          />
        ) : total === 0 ? (
          <EmptyState
            title={t("sourceScope.emptyTitle")}
            description={t("sourceScope.emptyDescription")}
          />
        ) : (
          <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {selectableSources.map((source) => {
              const checked = selected.has(source.id);
              return (
                <li key={source.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-sm transition-colors",
                      checked
                        ? "border-[color:var(--color-accent-solid)] bg-[color:var(--color-accent-solid)]/10"
                        : "border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-soft)]",
                    )}
                  >
                    <input
                      type={singleSelectOnly ? "radio" : "checkbox"}
                      checked={checked}
                      onChange={() => toggle(source.id)}
                      className="size-4 accent-[color:var(--color-accent-solid)]"
                    />
                    <span className="flex-1 truncate text-[color:var(--color-ink)]">
                      {source.title}
                    </span>
                    <Badge variant="neutral">{source.source_type}</Badge>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {selected.size > 1 ? (
          <div className="flex flex-col gap-3 border-t border-[color:var(--color-border)] pt-4">
            <p className="text-sm font-medium text-[color:var(--color-ink)]">
              {t("sourceScope.groupPrompt")}
            </p>
            <Select
              value={groupChoice}
              onChange={(event) => setGroupChoice(event.target.value)}
              options={[
                { value: "new", label: t("sourceScope.newCollection") },
                ...collectionOptions,
              ]}
            />
            {groupChoice === "new" ? (
              <Input
                placeholder={t("sourceScope.newCollectionNamePlaceholder")}
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
