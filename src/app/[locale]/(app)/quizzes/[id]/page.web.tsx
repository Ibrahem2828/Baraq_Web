"use client";

import { use } from "react";
import { QuizDetailPage } from "./QuizDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <QuizDetailPage id={use(params).id} />;
}
