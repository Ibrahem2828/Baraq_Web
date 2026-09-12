"use client";

import { useTranslations } from "next-intl";
import { useMySubscription, usePlans } from "@/features/subscriptions/hooks/useSubscriptions";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

function humanizeKey(key: string): string {
  return key.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase());
}

export default function SubscriptionPage() {
  const t = useTranslations();
  const subscription = useMySubscription();
  const plans = usePlans();

  if (subscription.isPending) return <LoadingState label={t("common.loading")} />;
  if (subscription.isError || !subscription.data) {
    return (
      <ErrorState
        title={t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => subscription.refetch()}
      />
    );
  }

  const data = subscription.data;
  const usageKeys = Object.keys(data.limits);

  return (
    <div>
      <PageHeader title={t("subscription.title")} description={t("subscription.subtitle")} />

      <div className="flex flex-col gap-8">
        <section>
          <SectionHeader title={t("subscription.currentPlan")} />
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-[color:var(--color-ink)]">{data.plan.name}</h3>
              <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
                {data.plan.description}
              </p>
            </div>
            <div className="text-end">
              <p className="text-2xl font-bold text-[color:var(--color-ink)]">
                {data.plan.price} {data.plan.currency}
              </p>
              {data.subscription ? (
                <Badge
                  variant={data.subscription.status === "active" ? "success" : "warning"}
                  className="mt-1"
                >
                  {data.subscription.status}
                </Badge>
              ) : null}
            </div>
          </Card>
        </section>

        {usageKeys.length > 0 ? (
          <section>
            <SectionHeader title={t("subscription.usage")} />
            <Card className="flex flex-col gap-5">
              {usageKeys.map((key) => {
                // `usage` (SubscriptionUsage) and `limits`/`remaining` use
                // unrelated key names (e.g. `khota_requests` vs
                // `max_khota_requests_per_month`) — verified against a live
                // backend instance in Phase 2. `limits`/`remaining` share the
                // same `max_*` keys, so derive `used` from those two instead
                // of indexing into `usage` (which Phase 1 did — always
                // producing 0, since the key never matched).
                const limit = data.limits[key] ?? 0;
                const remaining = data.remaining[key] ?? limit;
                const used = Math.max(limit - remaining, 0);
                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <Progress
                      value={used}
                      max={Math.max(limit, 1)}
                      label={`${humanizeKey(key)} · ${t("subscription.remaining", { count: remaining })}`}
                    />
                  </div>
                );
              })}
            </Card>
          </section>
        ) : null}

        <section>
          <SectionHeader title={t("subscription.limits")} />
          {plans.isPending ? (
            <LoadingState label={t("common.loading")} />
          ) : plans.isError ? (
            <ErrorState
              title={t("errors.UNKNOWN")}
              retryLabel={t("common.retry")}
              onRetry={() => plans.refetch()}
            />
          ) : (
            <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.data.items.map((plan) => (
                <StaggerItem key={plan.id}>
                  <Card
                    className={
                      plan.id === data.plan.id
                        ? "flex h-full flex-col gap-4 border-[color:var(--color-accent-solid)]"
                        : "flex h-full flex-col gap-4"
                    }
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-bold text-[color:var(--color-ink)]">
                          {plan.name}
                        </h3>
                        {plan.id === data.plan.id ? (
                          <Badge variant="accent">{t("subscription.currentPlan")}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
                        {plan.description}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-[color:var(--color-ink)]">
                      {plan.price} {plan.currency}
                    </p>
                    <ul className="flex flex-col gap-1.5 text-sm text-[color:var(--color-ink-soft)]">
                      {Object.entries(plan.limits).map(([key, value]) => (
                        <li key={key}>
                          {humanizeKey(key)}: {value}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex flex-col gap-1.5">
                      <Button variant="outline" size="sm" disabled className="w-full">
                        {t("subscription.upgrade")}
                      </Button>
                      <p className="text-center text-xs text-[color:var(--color-ink-faint)]">
                        {t("subscription.upgradeUnavailable")}
                      </p>
                    </div>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerIn>
          )}
        </section>
      </div>
    </div>
  );
}
