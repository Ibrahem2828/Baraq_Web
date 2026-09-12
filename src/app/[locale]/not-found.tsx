import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";

export default async function NotFound() {
  const t = await getTranslations();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-[var(--font-display)] font-extrabold text-[color:var(--color-accent-solid)]">
        404
      </p>
      <h1 className="text-xl font-bold text-[color:var(--color-ink)]">
        {t("emptyStates.search.title")}
      </h1>
      <p className="max-w-sm text-sm text-[color:var(--color-ink-soft)]">
        {t("emptyStates.generic.description")}
      </p>
      <Button asChild className="mt-2">
        <Link href="/">{t("nav.home")}</Link>
      </Button>
    </div>
  );
}
