"use client";

import { NativeDetailRoute } from "@/lib/routing/NativeDetailRoute";
import { TranscriptionDetailPage } from "../[id]/TranscriptionDetailPage";

/** The app's `/transcriptions/view?id=…` (see lib/routing/detail-href). */
export default function Page() {
  return <NativeDetailRoute render={(id) => <TranscriptionDetailPage id={id} />} />;
}
