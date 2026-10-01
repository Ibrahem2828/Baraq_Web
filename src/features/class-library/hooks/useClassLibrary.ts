"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { queryKeys } from "@/lib/query/keys";
import type { AIJobCharacter } from "@/types/domain";
import { listClassLibrary, sendLibraryItem, type ClassLibraryFilters } from "../api/classLibraryApi";

export function useClassLibrary(filters: ClassLibraryFilters = {}) {
  return useQuery({
    queryKey: queryKeys.classLibrary.list(filters),
    queryFn: () => listClassLibrary(filters),
  });
}

/**
 * One tap: copy the shared file into the learner's project, then open the
 * character with that source already selected -- the same start flow as a
 * learner's own upload.
 */
export function useSendLibraryItem() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, character }: { id: string; character: AIJobCharacter }) => sendLibraryItem(id, character),
    onSuccess: (result, { character }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sources.all });
      const query = new URLSearchParams({ source: String(result.source_id), project: result.project });
      router.push(`/characters/${character}?${query.toString()}`);
    },
  });
}
