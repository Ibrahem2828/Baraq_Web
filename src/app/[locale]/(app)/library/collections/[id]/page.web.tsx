"use client";

import { use } from "react";
import { CollectionDetailPage } from "./CollectionDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <CollectionDetailPage id={use(params).id} />;
}
