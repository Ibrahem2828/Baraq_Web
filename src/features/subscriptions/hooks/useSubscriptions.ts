"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { getMySubscription, listPlans } from "../api/subscriptionsApi";

export function useMySubscription() {
  return useQuery({
    queryKey: queryKeys.subscriptions.me(),
    queryFn: getMySubscription,
  });
}

export function usePlans() {
  return useQuery({
    queryKey: queryKeys.subscriptions.plans(),
    queryFn: listPlans,
    staleTime: 5 * 60_000,
  });
}
