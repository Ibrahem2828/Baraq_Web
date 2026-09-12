"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Sparkles, FileQuestion } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useQuizzes, useCreateQuiz } from "@/features/quizzes/hooks/useQuizzes";
import { useCreateAIJob } from "@/features/ai-jobs/hooks/useAIJob";
import { isApiError } from "@/lib/api/errors";
import type { DifficultyLevel, QuizStatus, QuizType } from "@/types/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

const STATUS_BADGE_VARIANT: Record<QuizStatus, "neutral" | "success" | "warning"> = {
  draft: "neutral",
  published: "success",
  archived: "warning",
};

// Fahes-generation and difficulty/quiz-type copy has no entry in the shared
// `quizzes.*` message namespace yet (see final report) — kept as a small local
// bilingual lookup rather than inventing new top-level message keys.
function localText(locale: string, en: string, ar: string): string {
  return locale === "ar" ? ar : en;
}

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; en: string; ar: string }[] = [
  { value: "easy", en: "Easy", ar: "سهل" },
  { value: "medium", en: "Medium", ar: "متوسط" },
  { value: "hard", en: "Hard", ar: "صعب" },
];

const QUIZ_TYPE_OPTIONS: { value: QuizType; en: string; ar: string }[] = [
  { value: "practice", en: "Practice", ar: "تدريب" },
  { value: "quick", en: "Quick", ar: "سريع" },
  { value: "exam", en: "Exam", ar: "اختبار" },
];

export default function QuizzesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const quizzes = useQuizzes();
  const createQuiz = useCreateQuiz();
  const createAIJob = useCreateAIJob();

  const [manualOpen, setManualOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [quizType, setQuizType] = useState<QuizType>("practice");
  const [timeLimit, setTimeLimit] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [sourceId, setSourceId] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);

  function resetManualForm() {
    setTitle("");
    setSubject("");
    setDescription("");
    setDifficulty("medium");
    setQuizType("practice");
    setTimeLimit("");
    setFormError(null);
  }

  function handleCreateManual() {
    const subjectId = Number(subject);
    if (!title.trim() || !subject.trim() || !Number.isFinite(subjectId)) {
      setFormError(t("common.requiredField"));
      return;
    }
    createQuiz.mutate(
      {
        title: title.trim(),
        subject: subjectId,
        description: description.trim() || undefined,
        difficulty_level: difficulty,
        quiz_type: quizType,
        time_limit_minutes: timeLimit ? Number(timeLimit) : undefined,
      },
      {
        onSuccess: (quiz) => {
          setManualOpen(false);
          resetManualForm();
          router.push(`/quizzes/${quiz.id}`);
        },
        onError: (error) => {
          setFormError(isApiError(error) ? t(`errors.${error.code}`) : t("errors.UNKNOWN"));
        },
      },
    );
  }

  function handleGenerate() {
    const sourceIdNum = Number(sourceId);
    if (!sourceId.trim() || !Number.isFinite(sourceIdNum)) {
      setGenerateError(t("common.requiredField"));
      return;
    }
    createAIJob.mutate(
      { task_type: "fahes_generate_quiz", source: sourceIdNum },
      {
        onSuccess: (job) => {
          setGenerateOpen(false);
          setSourceId("");
          setGenerateError(null);
          router.push(`/ai-jobs/${job.public_id}`);
        },
        onError: (error) => {
          setGenerateError(isApiError(error) ? t(`errors.${error.code}`) : t("errors.UNKNOWN"));
        },
      },
    );
  }

  return (
    <div>
      <PageHeader
        title={t("quizzes.title")}
        description={t("quizzes.subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={() => setGenerateOpen(true)}>
              <Sparkles className="size-4" aria-hidden="true" />
              {localText(locale, "Generate with Fahes", "توليد بواسطة فاحص")}
            </Button>
            <Button onClick={() => setManualOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              {t("quizzes.newQuiz")}
            </Button>
          </>
        }
      />

      {quizzes.isPending ? (
        <LoadingState label={t("common.loading")} />
      ) : quizzes.isError ? (
        <ErrorState
          title={
            isApiError(quizzes.error) ? t(`errors.${quizzes.error.code}`) : t("errors.UNKNOWN")
          }
          retryLabel={t("common.retry")}
          onRetry={() => quizzes.refetch()}
        />
      ) : quizzes.data.items.length === 0 ? (
        <EmptyState
          icon={<FileQuestion className="size-6" aria-hidden="true" />}
          title={t("emptyStates.quizzes.title")}
          description={t("emptyStates.quizzes.description")}
          action={
            <Button onClick={() => setManualOpen(true)}>{t("emptyStates.quizzes.action")}</Button>
          }
        />
      ) : (
        <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.data.items.map((quiz) => {
            const difficultyOption = DIFFICULTY_OPTIONS.find(
              (option) => option.value === quiz.difficulty_level,
            );
            return (
              <StaggerItem key={quiz.id}>
                <Card
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/quizzes/${quiz.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") router.push(`/quizzes/${quiz.id}`);
                  }}
                  className="flex h-full cursor-pointer flex-col justify-between transition-shadow hover:shadow-[var(--shadow-md)]"
                >
                  <CardHeader className="gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
                      <Badge variant={STATUS_BADGE_VARIANT[quiz.status]}>
                        {t(`quizzes.status.${quiz.status}`)}
                      </Badge>
                    </div>
                    {quiz.description ? (
                      <CardDescription className="line-clamp-2">{quiz.description}</CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardFooter className="mt-0 flex flex-wrap gap-2">
                    <Badge variant="neutral">
                      {t("quizzes.questionsCount", { count: quiz.questions_count })}
                    </Badge>
                    {quiz.time_limit_minutes ? (
                      <Badge variant="neutral">
                        {t("quizzes.timeLimit", { minutes: quiz.time_limit_minutes })}
                      </Badge>
                    ) : null}
                    {difficultyOption ? (
                      <Badge variant="accent">
                        {localText(locale, difficultyOption.en, difficultyOption.ar)}
                      </Badge>
                    ) : null}
                  </CardFooter>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerIn>
      )}

      <Modal
        open={manualOpen}
        onOpenChange={(open) => {
          setManualOpen(open);
          if (!open) resetManualForm();
        }}
        title={t("quizzes.newQuiz")}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setManualOpen(false)}
              disabled={createQuiz.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateManual} loading={createQuiz.isPending}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label={localText(locale, "Title", "العنوان")}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <Input
            label={localText(locale, "Subject ID", "معرف المادة")}
            description={localText(
              locale,
              "Numeric subject id — the subject picker isn't built yet",
              "معرف المادة رقميًا، قائمة اختيار المواد غير متوفرة بعد",
            )}
            type="number"
            inputMode="numeric"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
          />
          <Textarea
            label={localText(locale, "Description", "الوصف")}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={localText(locale, "Difficulty", "الصعوبة")}
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as DifficultyLevel)}
              options={DIFFICULTY_OPTIONS.map((option) => ({
                value: option.value,
                label: localText(locale, option.en, option.ar),
              }))}
            />
            <Select
              label={localText(locale, "Quiz type", "نوع الاختبار")}
              value={quizType}
              onChange={(event) => setQuizType(event.target.value as QuizType)}
              options={QUIZ_TYPE_OPTIONS.map((option) => ({
                value: option.value,
                label: localText(locale, option.en, option.ar),
              }))}
            />
          </div>
          <Input
            label={localText(locale, "Time limit (minutes)", "المدة الزمنية (بالدقائق)")}
            type="number"
            inputMode="numeric"
            value={timeLimit}
            onChange={(event) => setTimeLimit(event.target.value)}
          />
          {formError ? (
            <p role="alert" className="text-xs text-[color:var(--color-destructive)]">
              {formError}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={generateOpen}
        onOpenChange={(open) => {
          setGenerateOpen(open);
          if (!open) {
            setSourceId("");
            setGenerateError(null);
          }
        }}
        title={localText(locale, "Generate with Fahes", "توليد بواسطة فاحص")}
        description={localText(
          locale,
          "Fahes will generate a quiz from one of your sources. Source picker isn't built yet, so enter its numeric id.",
          "سيولّد فاحص اختبارًا من أحد مصادرك. قائمة اختيار المصادر غير متوفرة بعد، أدخل معرفه الرقمي.",
        )}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setGenerateOpen(false)}
              disabled={createAIJob.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleGenerate} loading={createAIJob.isPending}>
              {t("common.confirm")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label={localText(locale, "Source ID", "معرف المصدر")}
            type="number"
            inputMode="numeric"
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
            required
          />
          {generateError ? (
            <p role="alert" className="text-xs text-[color:var(--color-destructive)]">
              {generateError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
