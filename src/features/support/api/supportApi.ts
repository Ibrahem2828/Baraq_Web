import { apiClient, requestPaginated } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  SupportMessage,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketPriority,
} from "@/types/domain";

export interface SupportTicketFilters {
  status?: string;
  category?: string;
  [key: string]: string | number | boolean | undefined;
}

export function listTickets(filters: SupportTicketFilters = {}) {
  return requestPaginated<SupportTicket>(endpoints.support.tickets, { params: filters });
}

export function getTicket(id: string | number) {
  return apiClient.get<SupportTicket>(endpoints.support.ticket(id));
}

export interface CreateTicketInput {
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  message: string;
}

export function createTicket(input: CreateTicketInput) {
  return apiClient.post<SupportTicket>(endpoints.support.tickets, input);
}

export function replyToTicket(id: string | number, input: { body: string }) {
  return apiClient.post<SupportMessage>(endpoints.support.ticketMessages(id), input);
}

export function closeTicket(id: string | number) {
  return apiClient.post<SupportTicket>(endpoints.support.ticketClose(id));
}
