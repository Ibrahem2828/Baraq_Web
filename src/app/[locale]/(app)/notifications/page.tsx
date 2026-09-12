"use client";

import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/features/notifications/hooks/useNotifications";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";
import { cn } from "@/lib/utils/cn";

export default function NotificationsPage() {
  const t = useTranslations();
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const hasUnread = notifications.data?.items.some((item) => !item.is_read) ?? false;

  return (
    <div>
      <PageHeader
        title={t("notifications.title")}
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={!hasUnread}
            loading={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            {t("notifications.markAllRead")}
          </Button>
        }
      />

      {notifications.isPending ? (
        <LoadingState label={t("common.loading")} />
      ) : notifications.isError ? (
        <ErrorState
          title={t("errors.UNKNOWN")}
          retryLabel={t("common.retry")}
          onRetry={() => notifications.refetch()}
        />
      ) : notifications.data.items.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-6" aria-hidden="true" />}
          title={t("emptyStates.notifications.title")}
          description={t("emptyStates.notifications.description")}
        />
      ) : (
        <StaggerIn className="flex flex-col gap-3">
          {notifications.data.items.map((notification) => (
            <StaggerItem key={notification.id}>
              <Card
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!notification.is_read) markRead.mutate(notification.id);
                }}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && !notification.is_read) {
                    markRead.mutate(notification.id);
                  }
                }}
                className={cn(
                  "flex cursor-pointer items-start gap-3 transition-colors hover:border-[color:var(--color-border-strong)]",
                  !notification.is_read && "bg-[color:var(--color-accent-solid)]/5",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    notification.is_read
                      ? "bg-transparent"
                      : "bg-[color:var(--color-accent-solid)]",
                  )}
                  aria-hidden="true"
                />
                <div className="flex-1">
                  <p
                    className={cn(
                      "text-sm text-[color:var(--color-ink)]",
                      !notification.is_read && "font-bold",
                    )}
                  >
                    {notification.title}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
                    {notification.body}
                  </p>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerIn>
      )}
    </div>
  );
}
