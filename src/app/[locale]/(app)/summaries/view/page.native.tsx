"use client";

import { NativeDetailRoute } from "@/lib/routing/NativeDetailRoute";
import { SummaryDetailPage } from "../[id]/SummaryDetailPage";

/** The app's `/summaries/view?id=…` (see lib/routing/detail-href). */
export default function Page() {
  return <NativeDetailRoute render={(id) => <SummaryDetailPage id={id} />} />;
}
