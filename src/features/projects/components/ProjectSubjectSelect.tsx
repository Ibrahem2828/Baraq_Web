"use client";

import { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { Select, type SelectProps } from "@/components/ui/Select";
import { useSubjectsList } from "@/features/subjects/hooks/useSubjects";

type ProjectSubjectSelectProps = Omit<SelectProps, "options" | "label" | "placeholder">;

/**
 * Picks a project's subject from the active subject catalog.
 *
 * Khota saves a study plan and Fahes a quiz, and both records require a
 * subject; a project's sources fall back to the project's subject. Without
 * one, the backend reports both characters as unavailable with a message
 * pointing here. "No subject" stays selectable: the other characters work
 * without it.
 */
export const ProjectSubjectSelect = forwardRef<HTMLSelectElement, ProjectSubjectSelectProps>(
  ({ disabled, ...props }, ref) => {
    const t = useTranslations();
    const subjects = useSubjectsList({ is_active: true });
    const options = [
      { value: "", label: t("projects.subjectNone") },
      ...(subjects.data?.items ?? []).map((subject) => ({
        value: String(subject.id),
        label: subject.education_stage_name
          ? `${subject.name} — ${subject.education_stage_name}`
          : subject.name,
      })),
    ];

    return (
      <div className="flex flex-col gap-1">
        <Select
          ref={ref}
          label={t("projects.subject")}
          options={options}
          disabled={disabled || subjects.isPending}
          {...props}
        />
        <p className="text-xs text-[color:var(--color-ink-soft)]">{t("projects.subjectHint")}</p>
      </div>
    );
  },
);
ProjectSubjectSelect.displayName = "ProjectSubjectSelect";

/** Form value ("" = no subject) to the API's nullable subject id. */
export function subjectIdFromValue(value: string | undefined): number | null {
  return value ? Number(value) : null;
}
