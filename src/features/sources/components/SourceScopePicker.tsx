"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSources } from "@/features/sources/hooks/useSources";
import type { SourceType } from "@/types/domain";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { cn } from "@/lib/utils/cn";
import {
  AIRequestFields,
  EMPTY_AI_REQUEST,
  toAIRequestInput,
  type AIRequestDraft,
  type AIRequestFieldsConfig,
  type AIRequestInput,
} from "@/features/ai-jobs/components/AIRequestFields";

/**
 * How an AI request names the material it should use.
 *
 * `sources` is an ephemeral selection recorded on the job itself. It replaced
 * a workaround that bulk-reassigned the chosen sources into a collection --
 * permanently reorganising the learner's library to describe one request.
 */
export type SourceScope = { source: number } | { collection: number } | { source_ids: number[] };

/**
 * The single place a content-based AI action picks its knowledge scope.
 * Per 04_WEB_APP.md §5: always shows the project + selection count, and the
 * source list query is hard-scoped to `projectId` — there is no control here
 * that could ever list or select a source from a different project.
 *
 * One source is sent as `source`, several as `source_ids` (an ephemeral
 * selection recorded on the job). With `request`, the learner can also say
 * what they want ("focus on unit two", a level, a length).
 */
export function SourceScopePicker({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  sourceType,
  singleSelectOnly = false,
  confirmLabel,
  request,
  initialSelection,
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
  /** The learner's request (focus, level...) sent with the job, when the character takes one. */
  request?: AIRequestFieldsConfig;
  /** Sources selected when the picker first opens (e.g. from a source's page). */
  initialSelection?: number[];
  onConfirm: (scope: SourceScope, input: AIRequestInput) => void;
}) {
  const t = useTranslations();
  const sources = useSources({ project: projectId, source_type: sourceType });
  const [selected, setSelected] = useState<Set<number>>(() => new Set(initialSelection ?? []));
  const [draft, setDraft] = useState<AIRequestDraft>(EMPTY_AI_REQUEST);

  function reset() {
    setSelected(new Set());
    setDraft(EMPTY_AI_REQUEST);
  }

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
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const input = request ? toAIRequestInput(draft, request) : {};
    onOpenChange(false);
    reset();
    // One source still uses the singular form the backend has always
    // accepted; several travel as an explicit selection that changes nothing
    // in the library.
    onConfirm(ids.length === 1 ? { source: ids[0] } : { source_ids: ids }, input);
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

  const confirmDisabled = selected.size === 0;

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
          <Button onClick={handleConfirm} disabled={confirmDisabled}>
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

        {request && total > 0 ? (
          <AIRequestFields config={request} value={draft} onChange={setDraft} />
        ) : null}
      </div>
    </Modal>
  );
}
