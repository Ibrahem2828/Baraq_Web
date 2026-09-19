"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { School } from "lucide-react";

import {
  useConfirmInvitation,
  useInvitationLinkPreview,
  useMyMemberships,
  usePreviewInvitation,
} from "@/features/organizations/hooks/useJoin";
import type { JoinCredential, JoinPreview } from "@/features/organizations/api/organizationsApi";
import { useApiErrorMessage } from "@/lib/api/useApiErrorMessage";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

/**
 * Joining is three deliberate steps: see, ask, wait.
 *
 * The link and the typed code are the same credential arriving by different
 * routes, so both resolve through the same preview. Preview creates nothing;
 * confirm creates a request, not a membership. A learner never becomes a
 * member by following a link -- a teacher approves, and until then this page
 * says so plainly rather than implying access that does not exist.
 */
// useSearchParams opts a page out of static rendering unless it is isolated
// behind Suspense -- same reasoning as the login and verify-email pages.
export default function JoinPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <JoinFlow />
    </Suspense>
  );
}

function JoinFlow() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const resolveError = useApiErrorMessage();

  const [code, setCode] = useState("");
  const [typedPreview, setTypedPreview] = useState<JoinPreview | null>(null);
  const [typedCredential, setTypedCredential] = useState<JoinCredential | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissedLink, setDismissedLink] = useState(false);

  const previewMutation = usePreviewInvitation();
  const confirmMutation = useConfirmInvitation();
  const memberships = useMyMemberships();

  const linkToken = dismissedLink ? null : searchParams.get("token");
  const linkPreview = useInvitationLinkPreview(linkToken);

  // An invitation link arrives with its token already in hand, so the
  // learner sees the school rather than a form asking for what they just
  // clicked. Typing a code takes over from there.
  const preview = typedPreview ?? linkPreview.data ?? null;
  const credential: JoinCredential | null =
    typedCredential ?? (linkToken && linkPreview.data ? { token: linkToken } : null);
  const linkError = linkPreview.isError ? resolveError(linkPreview.error) : null;
  const shownError = error ?? linkError;
  const busy = previewMutation.isPending || linkPreview.isFetching;

  function check(next: JoinCredential) {
    setError(null);
    previewMutation.mutate(next, {
      onSuccess: (result) => {
        setTypedPreview(result);
        setTypedCredential(next);
      },
      onError: (reason) => {
        setTypedPreview(null);
        setTypedCredential(null);
        setError(resolveError(reason));
      },
    });
  }

  function confirm() {
    if (!credential) return;
    setError(null);
    confirmMutation.mutate(credential, {
      onError: (reason) => setError(resolveError(reason)),
    });
  }

  function reset() {
    setTypedPreview(null);
    setTypedCredential(null);
    setDismissedLink(true);
    setCode("");
    setError(null);
    confirmMutation.reset();
    previewMutation.reset();
  }

  const submitted = confirmMutation.isSuccess;

  return (
    <div>
      <PageHeader title={t("join.title")} description={t("join.subtitle")} />

      <div className="flex flex-col gap-8">
        <section>
          {submitted ? (
            <Card className="flex flex-col gap-3">
              <h3 className="text-lg font-semibold">{t("join.pendingTitle")}</h3>
              <p className="text-sm opacity-80">{t("join.pendingBody")}</p>
              <div>
                <Button variant="secondary" onClick={reset}>
                  {t("join.again")}
                </Button>
              </div>
            </Card>
          ) : preview ? (
            <Card className="flex flex-col gap-4">
              <SectionHeader title={t("join.previewTitle")} />
              <div className="flex items-center gap-3">
                <School aria-hidden="true" />
                <div>
                  <strong className="block">{preview.organization.name}</strong>
                  <small className="opacity-70">
                    {preview.organization.organization_type === "institute"
                      ? t("join.institute")
                      : t("join.school")}
                    {preview.classroom ? ` · ${t("join.classLabel")}: ${preview.classroom.name}` : ""}
                  </small>
                </div>
              </div>
              {shownError ? <p className="text-sm text-red-600">{shownError}</p> : null}
              <div className="flex flex-wrap gap-3">
                <Button onClick={confirm} disabled={confirmMutation.isPending}>
                  {confirmMutation.isPending ? t("join.confirming") : t("join.confirm")}
                </Button>
                <Button variant="secondary" onClick={reset}>
                  {t("join.again")}
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const trimmed = code.trim();
                  if (trimmed) check({ code: trimmed });
                }}
              >
                <Input
                  label={t("join.codeLabel")}
                  placeholder={t("join.codePlaceholder")}
                  value={code}
                  autoComplete="off"
                  // Codes are issued in upper case and read off a board; the
                  // learner should not be failed for typing them in lower.
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                />
                {shownError ? <p className="text-sm text-red-600">{shownError}</p> : null}
                <div>
                  <Button type="submit" disabled={busy || !code.trim()}>
                    {busy ? t("join.checking") : t("join.check")}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </section>

        <section>
          <SectionHeader title={t("join.myMemberships")} />
          {memberships.isPending ? (
            <LoadingState label={t("common.loading")} />
          ) : !memberships.data || memberships.data.length === 0 ? (
            <EmptyState title={t("join.noMemberships")} />
          ) : (
            <StaggerIn className="flex flex-col gap-3">
              {memberships.data.map((membership, index) => (
                <StaggerItem key={`${membership.organization.name}-${index}`}>
                  <Card className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <strong className="block">{membership.organization.name}</strong>
                      <small className="opacity-70">
                        {membership.classroom
                          ? `${t("join.classLabel")}: ${membership.classroom.name}`
                          : membership.organization.organization_type === "institute"
                            ? t("join.institute")
                            : t("join.school")}
                      </small>
                    </div>
                    <Badge variant={membership.status === "active" ? "success" : "warning"}>
                      {membership.status === "active" ? t("join.statusActive") : t("join.statusPending")}
                    </Badge>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerIn>
          )}
        </section>
      </div>
    </div>
  );
}
