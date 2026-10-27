"use client";

import { use } from "react";
import { ProjectDetailPage } from "./ProjectDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProjectDetailPage id={use(params).id} />;
}
