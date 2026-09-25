"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FolderPlus, Upload } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  useSources,
  useCollections,
  useCreateCollection,
} from "@/features/sources/hooks/useSources";
import { UploadSourceDialog } from "@/features/sources/components/UploadSourceDialog";
import { useApiErrorMessage } from "@/lib/api/useApiErrorMessage";
import type { SourceStatus } from "@/types/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

const STATUS_VARIANT: Record<SourceStatus, "neutral" | "info" | "success" | "destructive"> = {
  uploaded: "neutral",
  processing: "info",
  ready: "success",
  failed: "destructive",
};

const collectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});
type CollectionFormValues = z.infer<typeof collectionSchema>;

export default function LibraryPage() {
  const t = useTranslations();
  const sources = useSources();
  const collections = useCollections();
  const createCollection = useCreateCollection();
  const errorMessage = useApiErrorMessage();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const collectionForm = useForm<CollectionFormValues>({ resolver: zodResolver(collectionSchema) });

  const onCreateCollection = collectionForm.handleSubmit((values) => {
    createCollection.mutate(
      { name: values.name, description: values.description || null },
      {
        onSuccess: () => {
          setCollectionOpen(false);
          collectionForm.reset();
        },
      },
    );
  });

  const sourcesContent = sources.isPending ? (
    <LoadingState label={t("common.loading")} />
  ) : sources.isError ? (
    <ErrorState
      title={t("errors.UNKNOWN")}
      retryLabel={t("common.retry")}
      onRetry={() => sources.refetch()}
    />
  ) : sources.data.items.length === 0 ? (
    <EmptyState
      title={t("emptyStates.generic.title")}
      description={t("emptyStates.generic.description")}
    />
  ) : (
    <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sources.data.items.map((source) => (
        <StaggerItem key={source.id}>
          <Link href={`/library/${source.id}`}>
            <Card className="flex h-full flex-col gap-2 transition-shadow duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)]">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-1 text-base font-bold text-[color:var(--color-ink)]">
                  {source.title}
                </h3>
                <Badge variant={STATUS_VARIANT[source.status]}>
                  {t(`library.status.${source.status}`)}
                </Badge>
              </div>
              <p className="text-xs font-medium tracking-wide text-[color:var(--color-ink-faint)] uppercase">
                {source.source_type}
              </p>
              {source.description ? (
                <p className="line-clamp-2 text-sm text-[color:var(--color-ink-soft)]">
                  {source.description}
                </p>
              ) : null}
            </Card>
          </Link>
        </StaggerItem>
      ))}
    </StaggerIn>
  );

  const collectionsContent = collections.isPending ? (
    <LoadingState label={t("common.loading")} />
  ) : collections.isError ? (
    <ErrorState
      title={t("errors.UNKNOWN")}
      retryLabel={t("common.retry")}
      onRetry={() => collections.refetch()}
    />
  ) : collections.data.items.length === 0 ? (
    <EmptyState
      title={t("emptyStates.generic.title")}
      description={t("emptyStates.generic.description")}
    />
  ) : (
    <StaggerIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {collections.data.items.map((collection) => (
        <StaggerItem key={collection.id}>
          <Link href={`/library/collections/${collection.id}`}>
            <Card className="flex h-full flex-col gap-2 transition-shadow duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)]">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-1 text-base font-bold text-[color:var(--color-ink)]">
                  {collection.name}
                </h3>
                <Badge variant={collection.status === "active" ? "success" : "neutral"}>
                  {collection.status === "active"
                    ? t("projects.status.active")
                    : t("projects.status.archived")}
                </Badge>
              </div>
              {collection.description ? (
                <p className="line-clamp-2 text-sm text-[color:var(--color-ink-soft)]">
                  {collection.description}
                </p>
              ) : null}
            </Card>
          </Link>
        </StaggerItem>
      ))}
    </StaggerIn>
  );

  return (
    <div>
      <PageHeader
        title={t("library.title")}
        description={t("library.subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={() => setCollectionOpen(true)}>
              <FolderPlus className="size-4" aria-hidden="true" />
              {t("library.newCollection")}
            </Button>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="size-4" aria-hidden="true" />
              {t("library.uploadAction")}
            </Button>
          </>
        }
      />

      <Tabs
        items={[
          { value: "sources", label: t("library.tabs.sources"), content: sourcesContent },
          {
            value: "collections",
            label: t("library.tabs.collections"),
            content: collectionsContent,
          },
        ]}
      />

      <UploadSourceDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      <Modal
        open={collectionOpen}
        onOpenChange={(open) => {
          setCollectionOpen(open);
          if (!open) collectionForm.reset();
        }}
        title={t("library.collection.createTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCollectionOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={onCreateCollection} loading={createCollection.isPending}>
              {t("common.confirm")}
            </Button>
          </>
        }
      >
        <form onSubmit={onCreateCollection} noValidate className="flex flex-col gap-4">
          <Input
            label={t("library.collection.nameField")}
            error={collectionForm.formState.errors.name ? t("common.requiredField") : undefined}
            {...collectionForm.register("name")}
          />
          <Textarea
            label={t("library.upload.description")}
            {...collectionForm.register("description")}
          />
          {createCollection.isError ? (
            <p role="alert" className="text-xs text-[color:var(--color-destructive)]">
              {errorMessage(createCollection.error)}
            </p>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
