/**
 * Regression coverage for the login page's post-login redirect.
 *
 * The historical bug: the fallback case (no `?next=`, i.e. a direct visit
 * to /login rather than a bounce-back from a protected route) used the
 * plain, non-locale-aware router to navigate to bare "/". next-intl's
 * middleware then resolved that locale-free path to the app's *default*
 * locale (Arabic) regardless of which locale the user was actually using --
 * an English visitor logging in at /en/login could be silently dropped
 * into /ar. The already-locale-prefixed `?next=` case was and remains
 * correct: it must use the plain router precisely because the value is
 * already resolved (the locale-aware router would double-prefix it into
 * e.g. /en/en/projects).
 */

import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/[locale]/(auth)/login/page";

const { mutate, nativeReplace, localeReplace, searchParamsValue } = vi.hoisted(() => ({
  mutate: vi.fn((_input: unknown, handlers?: { onSuccess?: () => void }) => {
    handlers?.onSuccess?.();
  }),
  nativeReplace: vi.fn(),
  localeReplace: vi.fn(),
  searchParamsValue: { current: new URLSearchParams() },
}));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nativeReplace }),
  useSearchParams: () => searchParamsValue.current,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ replace: localeReplace }),
}));
vi.mock("@/lib/auth/client", () => ({
  useLogin: () => ({ mutate, isPending: false }),
}));
vi.mock("@/components/feedback/Toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/motion/FadeIn", () => ({
  FadeIn: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/feedback/LoadingState", () => ({ LoadingState: () => <div>loading</div> }));

function submit(container: HTMLElement) {
  const form = container.querySelector("form")!;
  const email = container.querySelector<HTMLInputElement>('input[name="email"]')!;
  const password = container.querySelector<HTMLInputElement>('input[name="password"]')!;
  fireEvent.change(email, { target: { value: "student@example.com" } });
  fireEvent.change(password, { target: { value: "A-Strong-Pass-123" } });
  fireEvent.submit(form);
}

describe("login page — post-login redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsValue.current = new URLSearchParams();
  });

  it("with no ?next=, uses the locale-aware router so the current locale is preserved", async () => {
    // No `next` param at all -- a direct visit to /login, not a bounce-back.
    const { container } = render(<LoginPage />);
    submit(container);

    await waitFor(() => expect(localeReplace).toHaveBeenCalledOnce());
    expect(localeReplace).toHaveBeenCalledWith("/");
    // The historical bug: this must NOT be the path taken, because the
    // plain router resolves a bare "/" through next-intl's middleware to
    // the app's *default* locale, not the one the user was actually on.
    expect(nativeReplace).not.toHaveBeenCalled();
  });

  it("with a locale-prefixed ?next=, uses the plain router with the value as-is", async () => {
    searchParamsValue.current = new URLSearchParams({ next: "/en/projects" });
    const { container } = render(<LoginPage />);
    submit(container);

    await waitFor(() => expect(nativeReplace).toHaveBeenCalledOnce());
    // Must be the exact value, unmodified -- routing it through the
    // locale-aware router instead would double-prefix it into /en/en/projects.
    expect(nativeReplace).toHaveBeenCalledWith("/en/projects");
    expect(localeReplace).not.toHaveBeenCalled();
  });

  it("with an unsafe ?next= (open-redirect attempt), falls back to the locale-aware home", async () => {
    searchParamsValue.current = new URLSearchParams({ next: "https://evil.example/phish" });
    const { container } = render(<LoginPage />);
    submit(container);

    await waitFor(() => expect(localeReplace).toHaveBeenCalledOnce());
    expect(localeReplace).toHaveBeenCalledWith("/");
    expect(nativeReplace).not.toHaveBeenCalled();
  });

  it("with a protocol-relative ?next= (open-redirect attempt), falls back to the locale-aware home", async () => {
    searchParamsValue.current = new URLSearchParams({ next: "//evil.example/phish" });
    const { container } = render(<LoginPage />);
    submit(container);

    await waitFor(() => expect(localeReplace).toHaveBeenCalledOnce());
    expect(localeReplace).toHaveBeenCalledWith("/");
    expect(nativeReplace).not.toHaveBeenCalled();
  });
});
