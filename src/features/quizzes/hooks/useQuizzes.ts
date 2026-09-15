"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  listQuizzes,
  getQuiz,
  createQuiz,
  publishQuiz,
  archiveQuiz,
  startQuizAttempt,
  listAttempts,
  getAttempt,
  answerQuestion,
  submitAttempt,
  getAttemptResult,
  abandonAttempt,
  type QuizFilters,
  type QuizAttemptFilters,
  type AnswerQuestionInput,
} from "../api/quizzesApi";

export function useQuizzes(filters: QuizFilters = {}) {
  return useQuery({
    queryKey: queryKeys.quizzes.list(filters),
    queryFn: () => listQuizzes(filters),
  });
}

export function useQuiz(id: number | string) {
  return useQuery({
    queryKey: queryKeys.quizzes.detail(id),
    queryFn: () => getQuiz(id),
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createQuiz,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
    },
  });
}

export function usePublishQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => publishQuiz(id),
    onSuccess: (quiz) => {
      queryClient.setQueryData(queryKeys.quizzes.detail(quiz.id), quiz);
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
    },
  });
}

export function useArchiveQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => archiveQuiz(id),
    onSuccess: (quiz) => {
      queryClient.setQueryData(queryKeys.quizzes.detail(quiz.id), quiz);
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
    },
  });
}

/** Starts a fresh attempt for a published quiz. Does not touch quiz/list caches. */
export function useStartQuizAttempt() {
  return useMutation({
    mutationFn: (id: number | string) => startQuizAttempt(id),
  });
}

export function useQuizAttempts(filters: QuizAttemptFilters = {}) {
  return useQuery({
    queryKey: queryKeys.quizzes.attempts(filters),
    queryFn: () => listAttempts(filters),
  });
}

export function useQuizAttempt(id: number | string) {
  return useQuery({
    queryKey: queryKeys.quizzes.attempt(id),
    queryFn: () => getAttempt(id),
  });
}

export function useAnswerQuestion(attemptId: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AnswerQuestionInput) => answerQuestion(attemptId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.attempt(attemptId) });
    },
  });
}

export function useSubmitAttempt(attemptId: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers?: AnswerQuestionInput[]) => submitAttempt(attemptId, answers),
    onSuccess: (result) => {
      // submit returns the graded QuizResult, not a QuizAttemptDetail — cache it
      // under the same key useAttemptResult reads, and refetch the attempt detail
      // (separately shaped) so its `status` flips to "submitted".
      queryClient.setQueryData([...queryKeys.quizzes.attempt(attemptId), "result"] as const, result);
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.attempt(attemptId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.attempts() });
    },
  });
}

export function useAttemptResult(attemptId: number | string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.quizzes.attempt(attemptId), "result"] as const,
    queryFn: () => getAttemptResult(attemptId),
    enabled,
  });
}

export function useAbandonAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attemptId: number | string) => abandonAttempt(attemptId),
    onSuccess: (_data, attemptId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.attempt(attemptId) });
    },
  });
}
