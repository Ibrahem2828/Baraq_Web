"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { LifeBuoy } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTickets, useCreateTicket } from "@/features/support/hooks/useSupport";
import { createTicketSchema, type CreateTicketInput } from "@/lib/validation/support";
import type {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/types/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";
import { useToast } from "@/components/feedback/Toast";

const CATEGORY_VALUES: SupportTicketCategory[] = [
  "technical",
  "account",
  "billing",
  "content",
  "ai_result",
  "other",
];

const PRIORITY_VALUES: SupportTicketPriority[] = ["low", "medium", "high", "urgent"];

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

export default function SupportPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const tickets = useTickets();
  const createTicket = useCreateTicket();
  const [modalOpen, setModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { category: "technical", priority: "medium" },
  });

  const onSubmit = handleSubmit((values) => {
    createTicket.mutate(values, {
      onSuccess: () => {
        setModalOpen(false);
        reset({ subject: "", category: "technical", priority: "medium", message: "" });
      },
      onError: () => {
        toast({ title: t("errors.UNKNOWN"), variant: "error" });
      },
    });
  });

  return (
    <div>
      <PageHeader
        title={t("support.title")}
        description={t("support.subtitle")}
        actions={<Button onClick={() => setModalOpen(true)}>{t("support.newTicket")}</Button>}
      />

      {tickets.isPending ? (
        <LoadingState label={t("common.loading")} />
      ) : tickets.isError ? (
        <ErrorState
          title={t("errors.UNKNOWN")}
          retryLabel={t("common.retry")}
          onRetry={() => tickets.refetch()}
        />
      ) : tickets.data.items.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy className="size-6" aria-hidden="true" />}
          title={t("emptyStates.generic.title")}
          description={t("emptyStates.generic.description")}
        />
      ) : (
        <StaggerIn className="flex flex-col gap-3">
          {tickets.data.items.map((ticket) => (
            <StaggerItem key={ticket.id}>
              <Link href={`/support/${ticket.id}`} className="block">
                <Card className="flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-[color:var(--color-border-strong)]">
                  <div>
                    <p className="text-sm font-bold text-[color:var(--color-ink)]">
                      {ticket.subject}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-ink-soft)]">
                      {t(`support.categories.${ticket.category}`)} · {ticket.message_count}
                    </p>
                  </div>
                  <Badge variant={STATUS_BADGE[ticket.status]}>
                    {t(`support.status.${ticket.status}`)}
                  </Badge>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </StaggerIn>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={t("support.newTicket")}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={onSubmit} loading={createTicket.isPending}>
              {t("support.send")}
            </Button>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label={t("support.subjectField")}
            error={errors.subject ? t("common.requiredField") : undefined}
            {...register("subject")}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label={t("support.category")}
              options={CATEGORY_VALUES.map((value) => ({
                value,
                label: t(`support.categories.${value}`),
              }))}
              error={errors.category ? t("common.requiredField") : undefined}
              {...register("category")}
            />
            <Select
              label={t("support.priority")}
              options={PRIORITY_VALUES.map((value) => ({ value, label: humanize(value) }))}
              error={errors.priority ? t("common.requiredField") : undefined}
              {...register("priority")}
            />
          </div>
          <Textarea
            label={t("support.message")}
            rows={5}
            error={errors.message ? t("common.requiredField") : undefined}
            {...register("message")}
          />
        </form>
      </Modal>
    </div>
  );
}
