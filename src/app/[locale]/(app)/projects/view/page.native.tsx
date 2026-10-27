"use client";

import { NativeDetailRoute } from "@/lib/routing/NativeDetailRoute";
import { ProjectDetailPage } from "../[id]/ProjectDetailPage";

/** The app's `/projects/view?id=…` (see lib/routing/detail-href). */
export default function Page() {
  return <NativeDetailRoute render={(id) => <ProjectDetailPage id={id} />} />;
}
