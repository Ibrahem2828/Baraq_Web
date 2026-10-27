"use client";

import { NativeDetailRoute } from "@/lib/routing/NativeDetailRoute";
import { SourceDetailPage } from "../[id]/SourceDetailPage";

/** The app's `/library/view?id=…` (see lib/routing/detail-href). */
export default function Page() {
  return <NativeDetailRoute render={(id) => <SourceDetailPage id={id} />} />;
}
