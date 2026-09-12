import { apiClient, requestPaginated } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { AppNotification } from "@/types/domain";

export interface NotificationFilters {
  unread?: boolean;
  category?: string;
  [key: string]: string | number | boolean | undefined;
}

export function listNotifications(filters: NotificationFilters = {}) {
  return requestPaginated<AppNotification>(endpoints.notifications.list, {
    params: { unread: filters.unread, category: filters.category },
  });
}

export function getUnreadCount() {
  return apiClient.get<{ count: number }>(endpoints.notifications.unreadCount);
}

export function markNotificationRead(id: number) {
  return apiClient.post<AppNotification>(endpoints.notifications.markRead(id));
}

export function markAllNotificationsRead() {
  return apiClient.post<{ updated: number }>(endpoints.notifications.markAllRead);
}
