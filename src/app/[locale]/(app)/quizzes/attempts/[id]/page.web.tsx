"use client";

import { use } from "react";
import { QuizAttemptPage } from "./QuizAttemptPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <QuizAttemptPage id={use(params).id} />;
}
