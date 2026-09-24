"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import {
  useSource,
  useProcessSource,
  useSourceCapabilities,
} from "@/features/sources/hooks/useSources";
import {
  useSourceWithCharacter as postUseWithCharacter,
  type UseWithCharacterInput,
} from "@/features/sources/api/sourcesApi";
import { CHARACTER_LIST, type CharacterKey } from "@/config/characters";
import { useApiErrorMessage } from "@/lib/api/useApiErrorMessage";
import type { SourceStatus } from "@/types/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";

const STATUS_VARIANT: Record<SourceStatus, "neutral" | "info" | "success" | "destructive"> = {
  uploaded: "neutral",
  processing: "info",
  ready: "success",
  failed: "destructive",
};

export default function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const router = useRouter();
  const source = useSource(id);
  const capabilities = useSourceCapabilities(id);
  const processSource = useProcessSource();
  const errorMessage = useApiErrorMessage();
  const [pendingCharacter, setPendingCharacter] = useState<CharacterKey | null>(null);

  const useWithCharacter = useMutation({
    mutationFn: (input: UseWithCharacterInput) => postUseWithCharacter(id, input),
    onSuccess: (response) => {
      if (response.ai_job?.public_id) {
        router.push(`/ai-jobs/${response.ai_job.public_id}`);
      }
    },
  });

  if (source.isPending) return <LoadingState label={t("common.loading")} />;
  if (source.isError || !source.data) {
    return (
      <ErrorState
        title={t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => source.refetch()}
      />
    );
  }

  const data = source.data;
  // `status === "ready"` is NOT the readiness signal. `uploaded` is the
  // terminal success state for every non-text source — Django's
  // process_source() leaves PDFs/DOCX/PPTX there on purpose, because
  // extraction belongs to the AI service — so gating on `ready` blocked those
  // formats forever behind a "process" button that only ever re-wrote
  // `uploaded`. The authoritative signal is the capabilities contract, which
  // the backend now evaluates from source state, type and subscription
  // together (apps/sources/capabilities.py).
  const hasFailed = data.status === "failed";
  // Only a failed source has anything to gain from re-running processing; for
  // `uploaded`/`ready` it is a no-op that just re-stamps sha256/processed_at.
  const canRetryProcessing = hasFailed;

  return (
    <div>
      <PageHeader
        title={data.title}
        description={data.source_type}
        actions={
          <Badge variant={STATUS_VARIANT[data.status]}>{t(`library.status.${data.status}`)}</Badge>
        }
      />

      <Card className="mb-6 flex flex-col items-start gap-3">
        <h2 className="text-sm font-bold text-[color:var(--color-ink)]">
          {t("library.detail.extractedText")}
        </h2>
        <p className="text-sm whitespace-pre-line text-[color:var(--color-ink-soft)]">
          {data.extracted_text_preview ||
            t(
              data.source_type === "text"
                ? "library.detail.noExtractedText"
                : "library.detail.extractedByAi",
            )}
        </p>
        {canRetryProcessing ? (
          <Button
            variant="outline"
            onClick={() => processSource.mutate(data.id)}
            loading={processSource.isPending}
          >
            {t("library.detail.retryProcessing")}
          </Button>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[color:var(--color-ink)]">
          {t("library.detail.useWithCharacter")}
        </h2>
        {hasFailed ? (
          <EmptyState
            title={t("library.detail.processingFailedTitle")}
            description={t("library.detail.processingFailedDescription")}
          />
        ) : capabilities.isPending ? (
          <LoadingState label={t("common.loading")} />
        ) : capabilities.isError || !capabilities.data ? (
          <ErrorState
            title={t("errors.UNKNOWN")}
            retryLabel={t("common.retry")}
            onRetry={() => capabilities.refetch()}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {useWithCharacter.isError ? (
              <p role="alert" className="text-sm text-[color:var(--color-destructive)]">
                {errorMessage(useWithCharacter.error)}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              {CHARACTER_LIST.map((character) => {
                const capability = capabilities.data[character.key];
                // A character's availability comes from the backend's
                // capability/entitlement contract. The Arabic message explains
                // a real source or plan restriction without exposing a
                // browser-only toggle as a fake product limitation.
                if (!character.isLive) {
                  return (
                    <div
                      key={character.key}
                      className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border)] px-4 py-3 text-sm"
                    >
                      <span className="font-semibold text-[color:var(--color-ink-faint)]">
                        {t(`characters.${character.key}.name`)}
                      </span>
                      <span className="text-xs text-[color:var(--color-ink-faint)]">
                        {t("common.comingSoon")}
                      </span>
                    </div>
                  );
                }
                if (!capability?.available) {
                  return (
                    <div
                      key={character.key}
                      className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[color:var(--color-border)] px-4 py-3 text-sm"
                    >
                      <span className="font-semibold text-[color:var(--color-ink-faint)]">
                        {t(`characters.${character.key}.name`)}
                      </span>
                      {capability?.message ? (
                        <span className="text-xs text-[color:var(--color-ink-faint)]">
                          {capability.message}
                        </span>
                      ) : null}
                    </div>
                  );
                }
                return (
                  <Button
                    key={character.key}
                    variant="secondary"
                    title={capability.message}
                    loading={useWithCharacter.isPending && pendingCharacter === character.key}
                    disabled={useWithCharacter.isPending && pendingCharacter !== character.key}
                    onClick={() => {
                      setPendingCharacter(character.key);
                      useWithCharacter.mutate({ character: character.key });
                    }}
                  >
                    {t(`characters.${character.key}.name`)}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
