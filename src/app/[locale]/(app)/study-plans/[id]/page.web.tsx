"use client";

import { use } from "react";
import { StudyPlanDetailPage } from "./StudyPlanDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <StudyPlanDetailPage id={use(params).id} />;
}
