"use client";

import { NativeDetailRoute } from "@/lib/routing/NativeDetailRoute";
import { CollectionDetailPage } from "../[id]/CollectionDetailPage";

/** The app's `/library/collections/view?id=…` (see lib/routing/detail-href). */
export default function Page() {
  return <NativeDetailRoute render={(id) => <CollectionDetailPage id={id} />} />;
}
