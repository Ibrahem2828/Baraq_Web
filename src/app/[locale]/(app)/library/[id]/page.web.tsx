"use client";

import { use } from "react";
import { SourceDetailPage } from "./SourceDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SourceDetailPage id={use(params).id} />;
}
