"use client";

import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
import { useTicket, useReplyToTicket, useCloseTicket } from "@/features/support/hooks/useSupport";
import { useCurrentUser } from "@/lib/auth/client";
import { replyToTicketSchema, type ReplyToTicketInput } from "@/lib/validation/support";
import type { SupportTicketStatus } from "@/types/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { useToast } from "@/components/feedback/Toast";
import { cn } from "@/lib/utils/cn";

const STATUS_BADGE: Record<
  SupportTicketStatus,
  "info" | "accent" | "warning" | "success" | "neutral"
> = {
  open: "info",
  in_progress: "accent",
  waiting_user: "warning",
  resolved: "success",
  closed: "neutral",
};

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase());
}

export default function SupportTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const { toast } = useToast();
  const ticket = useTicket(id);
  const reply = useReplyToTicket(id);
  const closeTicket = useCloseTicket();
  const currentUser = useCurrentUser();
  const [confirmingClose, setConfirmingClose] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReplyToTicketInput>({ resolver: zodResolver(replyToTicketSchema) });

  if (ticket.isPending) return <LoadingState label={t("common.loading")} />;
  if (ticket.isError || !ticket.data) {
    return (
      <ErrorState
        title={t("errors.UNKNOWN")}
        retryLabel={t("common.retry")}
        onRetry={() => ticket.refetch()}
      />
    );
  }

  const data = ticket.data;
  const isClosed = data.status === "closed";

  const onSubmit = handleSubmit((values) => {
    reply.mutate(values, {
      onSuccess: () => reset({ body: "" }),
      onError: () => toast({ title: t("errors.UNKNOWN"), variant: "error" }),
    });
  });

  return (
    <div>
      <PageHeader
        title={data.subject}
        actions={
          !isClosed ? (
            <Button
              variant="outline"
              size="sm"
              loading={closeTicket.isPending}
              onClick={() => {
                if (!confirmingClose) {
                  setConfirmingClose(true);
                  return;
                }
                closeTicket.mutate(data.id, {
                  onError: () => toast({ title: t("errors.UNKNOWN"), variant: "error" }),
                  onSettled: () => setConfirmingClose(false),
                });
              }}
            >
              {t("support.close")}
            </Button>
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_BADGE[data.status]}>{t(`support.status.${data.status}`)}</Badge>
        <Badge variant="neutral">{t(`support.categories.${data.category}`)}</Badge>
        <Badge variant="neutral">{humanize(data.priority)}</Badge>
      </div>

      <div className="flex flex-col gap-3">
        {(data.messages ?? []).map((message) => {
          const isOwnMessage = message.sender === currentUser.data?.id;
          return (
            <Card
              key={message.id}
              className={cn(
                "max-w-2xl",
                isOwnMessage
                  ? "ms-auto bg-[color:var(--color-bg-soft)]"
                  : "border-[color:var(--color-accent-solid)]/30",
              )}
            >
              <p className="text-xs font-medium text-[color:var(--color-ink-soft)]">
                {message.sender_name}
              </p>
              <p className="text-sm whitespace-pre-line text-[color:var(--color-ink)]">
                {message.body}
              </p>
              <p className="mt-2 text-xs text-[color:var(--color-ink-faint)]">
                {new Date(message.created_at).toLocaleString(locale)}
              </p>
            </Card>
          );
        })}
      </div>

      {!isClosed ? (
        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-3">
          <Textarea
            label={t("support.reply")}
            rows={4}
            error={errors.body ? t("common.requiredField") : undefined}
            {...register("body")}
          />
          <Button type="submit" size="sm" loading={reply.isPending} className="self-end">
            {t("support.send")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
