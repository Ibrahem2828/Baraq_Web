"use client";

import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";

/** What a learner can ask of a character beyond picking the sources. */
export interface AIRequestInput {
  instructions?: string;
  question_count?: number;
  difficulty?: "easy" | "medium" | "hard";
  summary_length?: "short" | "medium" | "detailed";
}

export interface AIRequestFieldsConfig {
  /** Which example the request box shows (aiRequest.hint.<character>). */
  character: "fahes" | "kholasa" | "khota" | "rasheed";
  /** Backend limits: 1000 for Fahes/Kholasa/Khota, 500 for Rasheed's goal. */
  maxLength?: number;
  /** Fahes: number of questions and level. */
  quizOptions?: boolean;
  /** Kholasa: summary length. */
  summaryLength?: boolean;
}

export const DEFAULT_QUESTION_COUNT = 10;

/** The fields as a learner fills them; `toAIRequestInput` turns them into the job input. */
export interface AIRequestDraft {
  instructions: string;
  questionCount: number;
  difficulty: "" | "easy" | "medium" | "hard";
  summaryLength: "short" | "medium" | "detailed";
}

export const EMPTY_AI_REQUEST: AIRequestDraft = {
  instructions: "",
  questionCount: DEFAULT_QUESTION_COUNT,
  difficulty: "",
  summaryLength: "medium",
};

export function toAIRequestInput(draft: AIRequestDraft, config: AIRequestFieldsConfig): AIRequestInput {
  const input: AIRequestInput = {};
  const instructions = draft.instructions.trim();
  if (instructions) input.instructions = instructions;
  if (config.quizOptions) {
    input.question_count = draft.questionCount;
    if (draft.difficulty) input.difficulty = draft.difficulty;
  }
  if (config.summaryLength) input.summary_length = draft.summaryLength;
  return input;
}

/**
 * The request a learner adds to a character run: free text ("focus on unit
 * two") and, where the character supports them, the options the backend has
 * always accepted but the UI never offered.
 */
export function AIRequestFields({
  config,
  value,
  onChange,
  disabled,
}: {
  config: AIRequestFieldsConfig;
  value: AIRequestDraft;
  onChange: (next: AIRequestDraft) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("aiRequest");
  const max = config.maxLength ?? 1000;

  return (
    <div className="flex flex-col gap-3">
      {config.quizOptions ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label={t("questionCount")}
            value={String(value.questionCount)}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, questionCount: Number(event.target.value) })}
            options={[5, 10, 15, 20].map((count) => ({ value: String(count), label: String(count) }))}
          />
          <Select
            label={t("difficulty")}
            value={value.difficulty}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...value, difficulty: event.target.value as AIRequestDraft["difficulty"] })
            }
            options={[
              { value: "", label: t("difficultyAuto") },
              { value: "easy", label: t("easy") },
              { value: "medium", label: t("medium") },
              { value: "hard", label: t("hard") },
            ]}
          />
        </div>
      ) : null}
      {config.summaryLength ? (
        <Select
          label={t("summaryLength")}
          value={value.summaryLength}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, summaryLength: event.target.value as AIRequestDraft["summaryLength"] })
          }
          options={[
            { value: "short", label: t("short") },
            { value: "medium", label: t("medium") },
            { value: "detailed", label: t("detailed") },
          ]}
        />
      ) : null}
      <Textarea
        label={t("label")}
        rows={3}
        maxLength={max}
        disabled={disabled}
        placeholder={t(`hint.${config.character}`)}
        description={`${t("help")} ${t("counter", { count: value.instructions.length, max })}`}
        value={value.instructions}
        onChange={(event) => onChange({ ...value, instructions: event.target.value })}
      />
    </div>
  );
}
