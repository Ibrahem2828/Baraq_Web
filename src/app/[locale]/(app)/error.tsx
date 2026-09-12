"use client";

import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/feedback/ErrorState";

export default function AppSectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <ErrorState
        title={t("errors.UNKNOWN")}
        description={error.digest ? `Ref: ${error.digest}` : undefined}
        retryLabel={t("common.retry")}
        onRetry={reset}
      />
    </div>
  );
}
