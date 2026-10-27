"use client";

import { NativeDetailRoute } from "@/lib/routing/NativeDetailRoute";
import { QuizDetailPage } from "../[id]/QuizDetailPage";

/** The app's `/quizzes/view?id=…` (see lib/routing/detail-href). */
export default function Page() {
  return <NativeDetailRoute render={(id) => <QuizDetailPage id={id} />} />;
}
