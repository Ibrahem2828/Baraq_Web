import { apiClient, requestPaginated } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { MySubscription, SubscriptionPlan } from "@/types/domain";

/**
 * Read-only: subscription checkout/upgrade has no backend implementation yet
 * (see `src/config/feature-flags.ts`, `subscriptionsCheckout: false`) — only
 * fetch functions belong here, never a checkout/upgrade call.
 */

export function getMySubscription() {
  return apiClient.get<MySubscription>(endpoints.subscriptions.me);
}

export function listPlans() {
  return requestPaginated<SubscriptionPlan>(endpoints.subscriptions.plans);
}
