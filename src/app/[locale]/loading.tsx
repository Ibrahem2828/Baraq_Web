import { Logo } from "@/components/brand/Logo";

/** Branded route-transition fallback for public and authenticated surfaces. */
export default function LocaleLoading() {
  return (
    <main
      role="status"
      className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[color:var(--color-bg)] px-6 text-center"
    >
      <div className="relative flex size-28 items-center justify-center">
        <span className="baraq-loader-orbit absolute inset-0 rounded-full border-2 border-[color:var(--color-accent-solid)]/20" />
        <span className="baraq-loader-orbit-reverse absolute inset-2 rounded-full border-2 border-transparent border-t-[color:var(--color-accent-solid)]" />
        <Logo className="relative h-11" />
      </div>
      <div className="space-y-1.5">
        <p className="font-semibold text-[color:var(--color-ink)]">جارٍ تجهيز برّاق</p>
        <p className="text-sm text-[color:var(--color-ink-soft)]">نرتّب كل ما تحتاجه لتبدأ</p>
      </div>
      <span className="sr-only">جارٍ التحميل</span>
    </main>
  );
}
