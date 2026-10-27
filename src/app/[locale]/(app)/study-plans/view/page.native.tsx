"use client";

import { NativeDetailRoute } from "@/lib/routing/NativeDetailRoute";
import { StudyPlanDetailPage } from "../[id]/StudyPlanDetailPage";

/** The app's `/study-plans/view?id=…` (see lib/routing/detail-href). */
export default function Page() {
  return <NativeDetailRoute render={(id) => <StudyPlanDetailPage id={id} />} />;
}
