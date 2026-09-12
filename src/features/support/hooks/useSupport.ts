"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { SupportTicket } from "@/types/domain";
import {
  listTickets,
  getTicket,
  createTicket,
  replyToTicket,
  closeTicket,
  type SupportTicketFilters,
} from "../api/supportApi";

export function useTickets(filters: SupportTicketFilters = {}) {
  return useQuery({
    queryKey: queryKeys.support.tickets(filters),
    queryFn: () => listTickets(filters),
  });
}

export function useTicket(id: string | number) {
  return useQuery({
    queryKey: queryKeys.support.ticket(id),
    queryFn: () => getTicket(id),
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTicket,
    onSuccess: (ticket) => {
      queryClient.setQueryData(queryKeys.support.ticket(ticket.id), ticket);
      queryClient.invalidateQueries({ queryKey: ["supportTickets", "list"] });
    },
  });
}

export function useReplyToTicket(id: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: string }) => replyToTicket(id, input),
    onSuccess: (message) => {
      queryClient.setQueryData(queryKeys.support.ticket(id), (current?: SupportTicket) =>
        current
          ? {
              ...current,
              messages: [...(current.messages ?? []), message],
              message_count: current.message_count + 1,
            }
          : current,
      );
      queryClient.invalidateQueries({ queryKey: ["supportTickets", "list"] });
    },
  });
}

export function useCloseTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closeTicket,
    onSuccess: (ticket) => {
      queryClient.setQueryData(queryKeys.support.ticket(ticket.id), ticket);
      queryClient.invalidateQueries({ queryKey: ["supportTickets", "list"] });
    },
  });
}
