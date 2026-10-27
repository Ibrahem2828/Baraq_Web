"use client";

import { NativeDetailRoute } from "@/lib/routing/NativeDetailRoute";
import { AIJobProgressPage } from "../[id]/AIJobProgressPage";

/** The app's `/ai-jobs/view?id=…` (see lib/routing/detail-href). */
export default function Page() {
  return <NativeDetailRoute render={(id) => <AIJobProgressPage id={id} />} />;
}
