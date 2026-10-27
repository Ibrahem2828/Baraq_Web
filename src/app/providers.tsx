"use client";

import { lazy, Suspense, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/query-client";
import { ToastProvider } from "@/components/feedback/Toast";
import { LoadingState } from "@/components/feedback/LoadingState";

/** The app's route guard (stands in for proxy.ts); absent from the web bundle. */
// The condition is written out (not `IS_NATIVE`) so the bundler drops the
// import edge itself in the web build, not just the code that uses it.
const NativeAuthGate =
  process.env.NEXT_PUBLIC_BUILD_TARGET === "native"
    ? lazy(() => import("@/lib/auth/NativeAuthGate").then((m) => ({ default: m.NativeAuthGate })))
    : null;

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {NativeAuthGate ? (
          <Suspense fallback={<LoadingState />}>
            <NativeAuthGate>{children}</NativeAuthGate>
          </Suspense>
        ) : (
          children
        )}
      </ToastProvider>
    </QueryClientProvider>
  );
}
