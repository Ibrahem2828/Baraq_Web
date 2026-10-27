"use client";

import { NativeDetailRoute } from "@/lib/routing/NativeDetailRoute";
import { QuizAttemptPage } from "../[id]/QuizAttemptPage";

/** The app's `/quizzes/attempts/view?id=…` (see lib/routing/detail-href). */
export default function Page() {
  return <NativeDetailRoute render={(id) => <QuizAttemptPage id={id} />} />;
}
