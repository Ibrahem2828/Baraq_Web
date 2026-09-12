"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query/keys";
import type { User } from "@/types/domain";

export interface UpdateUserInput {
  full_name?: string;
  phone_number?: string | null;
}

function updateUser(patch: UpdateUserInput) {
  return apiClient.patch<User>(endpoints.users.me, patch);
}

/** PATCHes the current user's profile (`endpoints.users.me`) and refreshes `useCurrentUser`'s cache. */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUser,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.me(), data);
    },
  });
}
