"use client";

import { NativeDetailRoute } from "@/lib/routing/NativeDetailRoute";
import { SupportTicketDetailPage } from "../[id]/SupportTicketDetailPage";

/** The app's `/support/view?id=…` (see lib/routing/detail-href). */
export default function Page() {
  return <NativeDetailRoute render={(id) => <SupportTicketDetailPage id={id} />} />;
}
