"use client";

import { use } from "react";
import { RecommendationDetailPage } from "./RecommendationDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <RecommendationDetailPage id={use(params).id} />;
}
