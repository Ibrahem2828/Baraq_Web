"use client";

import { use } from "react";
import { SupportTicketDetailPage } from "./SupportTicketDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SupportTicketDetailPage id={use(params).id} />;
}
