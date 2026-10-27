"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/feedback/LoadingState";
import { JoinFlow } from "./JoinFlow";

function JoinFromQuery() {
  const token = useSearchParams().get("token");
  return <JoinFlow initialToken={token} />;
}

/**
 * The app has no server to read `?token=` before rendering (the web's
 * page.web.tsx does); the static page reads it on the client instead.
 */
export default function JoinPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <JoinFromQuery />
    </Suspense>
  );
}
