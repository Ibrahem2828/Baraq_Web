import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/[locale]/(auth)/login/page";

const { mutate, nativeReplace, localeReplace, toast } = vi.hoisted(() => ({
  mutate: vi.fn(),
  nativeReplace: vi.fn(),
  localeReplace: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nativeReplace }),
  useSearchParams: () => new URLSearchParams(),
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
vi.mock("@/components/feedback/Toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/components/motion/FadeIn", () => ({
  FadeIn: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/feedback/LoadingState", () => ({ LoadingState: () => <div>loading</div> }));

function setDomValueWithoutInputEvent(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
}

function controls(container: HTMLElement) {
  return {
    form: container.querySelector("form")!,
    email: container.querySelector<HTMLInputElement>('input[name="email"]')!,
    password: container.querySelector<HTMLInputElement>('input[name="password"]')!,
  };
}

describe("login native/autofill value synchronization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits visible password-manager values when React state is still empty", async () => {
    const { container } = render(<LoginPage />);
    const { form, email, password } = controls(container);
    setDomValueWithoutInputEvent(email, "autofilled@example.com");
    setDomValueWithoutInputEvent(password, "Autofilled Password 123!");

    fireEvent.submit(form);

    await waitFor(() => expect(mutate).toHaveBeenCalledOnce());
    expect(mutate.mock.calls[0]?.[0]).toEqual({
      email: "autofilled@example.com",
      password: "Autofilled Password 123!",
    });
  });

  it("preserves normal typed-input behavior", async () => {
    const { container } = render(<LoginPage />);
    const { form, email, password } = controls(container);
    fireEvent.change(email, { target: { value: "typed@example.com" } });
    fireEvent.change(password, { target: { value: "Typed Password 123!" } });

    fireEvent.submit(form);

    await waitFor(() => expect(mutate).toHaveBeenCalledOnce());
    expect(mutate.mock.calls[0]?.[0]).toEqual({
      email: "typed@example.com",
      password: "Typed Password 123!",
    });
  });

  it("still blocks invalid values populated silently by autofill", async () => {
    const { container } = render(<LoginPage />);
    const { form, email, password } = controls(container);
    setDomValueWithoutInputEvent(email, "invalid-email");
    setDomValueWithoutInputEvent(password, "present");

    fireEvent.submit(form);

    await waitFor(() => {
      expect(container.querySelector('[role="alert"]')).not.toBeNull();
    });
    expect(mutate).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });
});
