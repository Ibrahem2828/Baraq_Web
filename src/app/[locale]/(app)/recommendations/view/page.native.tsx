"use client";

import { NativeDetailRoute } from "@/lib/routing/NativeDetailRoute";
import { RecommendationDetailPage } from "../[id]/RecommendationDetailPage";

/** The app's `/recommendations/view?id=…` (see lib/routing/detail-href). */
export default function Page() {
  return <NativeDetailRoute render={(id) => <RecommendationDetailPage id={id} />} />;
}
