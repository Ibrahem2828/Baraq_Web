import { Logo } from "@/components/brand/Logo";

export default function AppSectionLoading() {
  return (
    <div
      role="status"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <div className="relative flex size-24 items-center justify-center">
        <span className="baraq-loader-orbit absolute inset-0 rounded-full border-2 border-[color:var(--color-accent-solid)]/20" />
        <span className="baraq-loader-orbit-reverse absolute inset-2 rounded-full border-2 border-transparent border-t-[color:var(--color-accent-solid)]" />
        <Logo className="relative h-10" />
      </div>
      <div className="space-y-1.5">
        <p className="font-semibold text-[color:var(--color-ink)]">جارٍ تجهيز تجربتك</p>
        <p className="text-sm text-[color:var(--color-ink-soft)]">لحظات ونكون جاهزين</p>
      </div>
      <span className="sr-only">جارٍ التحميل</span>
    </div>
  );
}
