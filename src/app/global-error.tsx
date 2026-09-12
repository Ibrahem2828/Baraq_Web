"use client";

/**
 * Catches errors thrown by the root layout itself (e.g. `[locale]/layout.tsx`
 * failing before `NextIntlClientProvider` mounts) — must render its own
 * `<html>`/`<body>` and cannot rely on global styles/theme or `next-intl`,
 * per the Next.js App Router contract for `global-error.tsx`.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" dir="ltr">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Something went wrong</h1>
        <p style={{ color: "#666", marginTop: "0.5rem" }}>
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "1.5rem",
            padding: "0.6rem 1.4rem",
            borderRadius: "999px",
            border: "none",
            background: "#E8A025",
            color: "#14172B",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
