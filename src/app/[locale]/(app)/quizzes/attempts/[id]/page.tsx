"use client";

import { use, useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  useQuizAttempt,
  useAnswerQuestion,
  useSubmitAttempt,
  useAttemptResult,
} from "@/features/quizzes/hooks/useQuizzes";
import { isApiError } from "@/lib/api/errors";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { FadeIn } from "@/components/motion/FadeIn";
import { cn } from "@/lib/utils/cn";

interface LocalAnswer {
  selectedChoice?: number;
  textAnswer?: string;
}

/** Ticks down to zero from `started_at + limitMinutes`; `null` when the quiz has no time limit. */
function useRemainingSeconds(
  startedAt: string | undefined,
  limitMinutes: number | null | undefined,
) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAt || !limitMinutes) {
      // Initial state is already `null` — nothing to reset here. A given
      // attempt's `started_at`/`time_limit_minutes` don't change after load,
      // so there's no case where this needs to un-set a previous value.
      return;
    }
    const deadline = new Date(startedAt).getTime() + limitMinutes * 60_000;
    function tick() {
      setRemaining(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, limitMinutes]);

  return remaining;
}

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function QuizAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const attempt = useQuizAttempt(id);
  const answerQuestion = useAnswerQuestion(id);
  const submitAttempt = useSubmitAttempt(id);

  const isSubmitted = attempt.data?.status === "submitted";
  const result = useAttemptResult(id, isSubmitted);

  const [answers, setAnswers] = useState<Record<number, LocalAnswer>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const initializedForAttempt = useRef<number | null>(null);
  const autoSubmitted = useRef(false);

  const remainingSeconds = useRemainingSeconds(
    attempt.data?.started_at,
    attempt.data?.quiz.time_limit_minutes,
  );

  // Seed local answer state from the attempt's already-recorded answers, once per attempt.
  useEffect(() => {
    if (!attempt.data || attempt.data.status !== "in_progress") return;
    if (initializedForAttempt.current === attempt.data.id) return;
    initializedForAttempt.current = attempt.data.id;
    const seeded: Record<number, LocalAnswer> = {};
    for (const answer of attempt.data.answers ?? []) {
      seeded[answer.question] = {
        selectedChoice: answer.selected_choice ?? undefined,
        textAnswer: answer.text_answer ?? undefined,
      };
    }
    setAnswers(seeded);
  }, [attempt.data]);

  function handleSubmit() {
    const payload = Object.entries(answers).map(([questionId, value]) => ({
      question: Number(questionId),
      selected_choice: value.selectedChoice,
      text_answer: value.textAnswer,
    }));
    submitAttempt.mutate(payload.length > 0 ? payload : undefined);
  }

  // Auto-submit once the countdown reaches zero.
  useEffect(() => {
    if (
      remainingSeconds === 0 &&
      attempt.data?.status === "in_progress" &&
      !autoSubmitted.current &&
      !submitAttempt.isPending
    ) {
      autoSubmitted.current = true;
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, attempt.data?.status]);

  if (attempt.isPending) return <LoadingState label={t("common.loading")} />;
  if (attempt.isError || !attempt.data) {
    return (
      <ErrorState
        title={isApiError(attempt.error) ? t(`errors.${attempt.error.code}`) : t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => attempt.refetch()}
      />
    );
  }

  const data = attempt.data;

  if (data.status === "abandoned") {
    return (
      <div>
        <PageHeader title={data.quiz.title} />
        <EmptyState
          title={locale === "ar" ? "تم التخلي عن هذه المحاولة" : "This attempt was abandoned"}
          action={
            <Button onClick={() => router.push(`/quizzes/${data.quiz.id}`)}>
              {t("common.back")}
            </Button>
          }
        />
      </div>
    );
  }

  if (data.status === "submitted") {
    return (
      <div>
        <PageHeader title={t("quizzes.result.title")} description={data.quiz.title} />
        {result.isPending ? (
          <LoadingState label={t("common.loading")} />
        ) : result.isError || !result.data ? (
          <ErrorState
            title={
              isApiError(result.error) ? t(`errors.${result.error.code}`) : t("errors.UNKNOWN")
            }
            retryLabel={t("common.retry")}
            onRetry={() => result.refetch()}
          />
        ) : (
          <FadeIn preset="slide-up">
            <Card className="flex flex-col gap-5">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-[color:var(--color-ink)]">
                  {Math.round(Number(result.data.percentage))}%
                </span>
                <span className="text-sm text-[color:var(--color-ink-soft)]">
                  {t("quizzes.result.score")}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">
                  {t("quizzes.result.correct")}: {result.data.correct_answers_count}
                </Badge>
                <Badge variant="destructive">
                  {t("quizzes.result.wrong")}: {result.data.wrong_answers_count}
                </Badge>
                <Badge variant="neutral">
                  {t("quizzes.result.unanswered")}: {result.data.unanswered_count}
                </Badge>
              </div>
              {result.data.recommendations && result.data.recommendations.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">
                    {t("quizzes.result.recommendations")}
                  </h3>
                  <ul className="flex flex-col gap-1.5 ps-4 text-sm text-[color:var(--color-ink-soft)]">
                    {result.data.recommendations.map((recommendation, index) => (
                      <li key={index} className="list-disc">
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Button variant="outline" onClick={() => router.push(`/quizzes/${data.quiz.id}`)}>
                {t("common.back")}
              </Button>
            </Card>
          </FadeIn>
        )}
      </div>
    );
  }

  // in_progress: quiz-taking form.
  const questions = data.quiz.questions;
  const totalQuestions = questions.length;

  if (totalQuestions === 0) {
    return (
      <div>
        <PageHeader title={data.quiz.title} />
        <EmptyState
          title={t("emptyStates.generic.title")}
          description={t("emptyStates.generic.description")}
        />
      </div>
    );
  }

  const question = questions[questionIndex];
  const currentAnswer = answers[question.id] ?? {};
  const isLastQuestion = questionIndex === totalQuestions - 1;

  function setAnswer(questionId: number, value: LocalAnswer) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleChoiceSelect(choiceId: number) {
    setAnswer(question.id, { ...currentAnswer, selectedChoice: choiceId });
    answerQuestion.mutate({ question: question.id, selected_choice: choiceId });
  }

  function handleTextAnswerBlur(value: string) {
    setAnswer(question.id, { ...currentAnswer, textAnswer: value });
    answerQuestion.mutate({ question: question.id, text_answer: value });
  }

  return (
    <div>
      <PageHeader
        title={data.quiz.title}
        actions={
          remainingSeconds !== null ? (
            <Badge variant={remainingSeconds < 60 ? "destructive" : "neutral"}>
              {formatSeconds(remainingSeconds)}
            </Badge>
          ) : undefined
        }
      />

      <Progress
        value={questionIndex + 1}
        max={totalQuestions}
        label={`${questionIndex + 1} / ${totalQuestions}`}
        className="mb-6"
      />

      <FadeIn key={question.id} preset="fade">
        <Card className="flex flex-col gap-5">
          <p className="text-base font-semibold text-[color:var(--color-ink)]">{question.text}</p>

          {question.question_type === "short_answer" ? (
            <Textarea
              defaultValue={currentAnswer.textAnswer ?? ""}
              onBlur={(event) => handleTextAnswerBlur(event.target.value)}
            />
          ) : (
            <div role="radiogroup" className="flex flex-col gap-2" aria-label={question.text}>
              {question.choices.map((choice) => {
                const inputId = `question-${question.id}-choice-${choice.id}`;
                const checked = currentAnswer.selectedChoice === choice.id;
                return (
                  <label
                    key={choice.id}
                    htmlFor={inputId}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-sm transition-colors",
                      checked
                        ? "border-[color:var(--color-accent-solid)] bg-[color:var(--color-accent-solid)]/10 text-[color:var(--color-ink)]"
                        : "border-[color:var(--color-border)] text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-bg-soft)]",
                    )}
                  >
                    <input
                      type="radio"
                      id={inputId}
                      name={`question-${question.id}`}
                      checked={checked}
                      onChange={() => handleChoiceSelect(choice.id)}
                      className="size-4 accent-[color:var(--color-accent-solid)]"
                    />
                    {choice.text}
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
              disabled={questionIndex === 0}
            >
              {t("common.back")}
            </Button>
            {isLastQuestion ? (
              <Button onClick={handleSubmit} loading={submitAttempt.isPending}>
                {t("quizzes.submit")}
              </Button>
            ) : (
              <Button
                onClick={() => setQuestionIndex((index) => Math.min(totalQuestions - 1, index + 1))}
              >
                {t("common.next")}
              </Button>
            )}
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}
