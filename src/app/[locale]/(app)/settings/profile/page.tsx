"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useCurrentUser } from "@/lib/auth/client";
import { useUpdateUser } from "@/features/profile/hooks/useUpdateUser";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { useToast } from "@/components/feedback/Toast";
import { FadeIn } from "@/components/motion/FadeIn";

const profileSchema = z.object({
  full_name: z.string().min(2),
  phone_number: z.string().optional().or(z.literal("")),
});
type ProfileFormInput = z.infer<typeof profileSchema>;

export default function ProfileSettingsPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const user = useCurrentUser();
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormInput>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (user.data) {
      reset({ full_name: user.data.full_name, phone_number: user.data.phone_number ?? "" });
    }
  }, [user.data, reset]);

  const onSubmit = handleSubmit((data) => {
    updateUser.mutate(data, {
      onSuccess: () => toast({ title: t("common.save"), variant: "success" }),
      onError: () => toast({ title: t("errors.UNKNOWN"), variant: "error" }),
    });
  });

  return (
    <FadeIn>
      <PageHeader title={t("settings.profile.title")} />

      {user.isPending ? (
        <LoadingState />
      ) : user.isError ? (
        <ErrorState
          title={t("errors.UNKNOWN")}
          retryLabel={t("common.retry")}
          onRetry={() => user.refetch()}
        />
      ) : (
        <Card className="max-w-lg">
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label={t("settings.profile.fullName")}
              autoComplete="name"
              error={errors.full_name ? t("common.requiredField") : undefined}
              {...register("full_name")}
            />
            <Input
              label={t("settings.profile.phoneNumber")}
              type="tel"
              autoComplete="tel"
              {...register("phone_number")}
            />
            <Input label={t("settings.profile.email")} value={user.data.email} disabled readOnly />
            <Button type="submit" loading={updateUser.isPending} className="mt-2 self-start">
              {t("common.save")}
            </Button>
          </form>
        </Card>
      )}
    </FadeIn>
  );
}
