"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  AIRequestFields,
  EMPTY_AI_REQUEST,
  toAIRequestInput,
  type AIRequestDraft,
  type AIRequestFieldsConfig,
  type AIRequestInput,
} from "@/features/ai-jobs/components/AIRequestFields";

/** The backend caps Rasheed's goal (learner_goal) at 500 characters. */
const RASHEED_REQUEST: AIRequestFieldsConfig = { character: "rasheed", maxLength: 500 };

/**
 * Rasheed reads quiz results, not sources: asking the learner to pick
 * sources first (which the backend ignores) only got in the way. This asks
 * for the one thing he does use -- the learner's goal.
 */
export function RasheedGoalDialog({
  open,
  onOpenChange,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onConfirm: (input: AIRequestInput) => void;
}) {
  const t = useTranslations("aiRequest");
  const common = useTranslations("common");
  const [draft, setDraft] = useState<AIRequestDraft>(EMPTY_AI_REQUEST);

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) setDraft(EMPTY_AI_REQUEST);
  }

  return (
    <Modal
      open={open}
      onOpenChange={close}
      title={t("rasheedTitle")}
      description={t("rasheedDescription")}
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)}>
            {common("cancel")}
          </Button>
          <Button
            loading={loading}
            onClick={() => {
              onConfirm(toAIRequestInput(draft, RASHEED_REQUEST));
              close(false);
            }}
          >
            {t("start")}
          </Button>
        </>
      }
    >
      <AIRequestFields config={RASHEED_REQUEST} value={draft} onChange={setDraft} />
    </Modal>
  );
}
