"use client";

import { use } from "react";
import { AIJobProgressPage } from "./AIJobProgressPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AIJobProgressPage id={use(params).id} />;
}
