import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().min(3),
  category: z.enum(["technical", "account", "billing", "content", "ai_result", "other"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  message: z.string().min(5),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const replyToTicketSchema = z.object({
  body: z.string().min(1),
});
export type ReplyToTicketInput = z.infer<typeof replyToTicketSchema>;
