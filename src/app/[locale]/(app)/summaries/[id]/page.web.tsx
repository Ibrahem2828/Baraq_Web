"use client";

import { use } from "react";
import { SummaryDetailPage } from "./SummaryDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SummaryDetailPage id={use(params).id} />;
}
