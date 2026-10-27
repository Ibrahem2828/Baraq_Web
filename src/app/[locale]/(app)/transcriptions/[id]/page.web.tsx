"use client";

import { use } from "react";
import { TranscriptionDetailPage } from "./TranscriptionDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <TranscriptionDetailPage id={use(params).id} />;
}
