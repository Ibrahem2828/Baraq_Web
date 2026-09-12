"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  listSources,
  getSource,
  uploadSource,
  deleteSource,
  processSource,
  getSourceCapabilities,
  listCollections,
  getCollection,
  createCollection,
  type SourceFilters,
  type CollectionFilters,
} from "../api/sourcesApi";

export function useSources(filters: SourceFilters = {}) {
  return useQuery({
    queryKey: queryKeys.sources.list(filters),
    queryFn: () => listSources(filters),
  });
}

export function useSource(id: number | string) {
  return useQuery({
    queryKey: queryKeys.sources.detail(id),
    queryFn: () => getSource(id),
    enabled: Boolean(id),
  });
}

export function useUploadSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sources.all });
    },
  });
}

export function useDeleteSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sources.all });
    },
  });
}

export function useProcessSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: processSource,
    onSuccess: (source) => {
      queryClient.setQueryData(queryKeys.sources.detail(source.id), source);
      queryClient.invalidateQueries({ queryKey: queryKeys.sources.all });
    },
  });
}

export function useSourceCapabilities(id: number | string) {
  return useQuery({
    queryKey: queryKeys.sources.capabilities(id),
    queryFn: () => getSourceCapabilities(id),
    enabled: Boolean(id),
  });
}

export function useCollections(filters: CollectionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.sources.collections(filters),
    queryFn: () => listCollections(filters),
  });
}

export function useCollection(id: number | string) {
  return useQuery({
    queryKey: queryKeys.sources.collection(id),
    queryFn: () => getCollection(id),
    enabled: Boolean(id),
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sources.collections() });
    },
  });
}
