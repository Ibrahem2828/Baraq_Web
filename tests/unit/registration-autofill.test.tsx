import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "@/app/[locale]/(auth)/register/page";

const { mutate, replace, toast } = vi.hoisted(() => ({
  mutate: vi.fn(),
  replace: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ replace }),
}));
vi.mock("@/features/auth/hooks/useAuthMutations", () => ({
  useRegister: () => ({ mutate, isPending: false }),
}));
vi.mock("@/components/feedback/Toast", () => ({
  useToast: () => ({ toast }),
}));
vi.mock("@/components/motion/FadeIn", () => ({
  FadeIn: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function setDomValueWithoutInputEvent(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
}

describe("registration browser autofill contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits the exact values visibly present in DOM even when autofill emitted no input event", async () => {
    const { container } = render(<RegisterPage />);
    const values = {
      full_name: "Autofill Student",
      email: "autofill.student@example.com",
      phone_number: "+963991234567",
      password: "Autofill-Password-123!",
      password_confirm: "Autofill-Password-123!",
    };

    for (const [name, value] of Object.entries(values)) {
      const input = container.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      expect(input).not.toBeNull();
      setDomValueWithoutInputEvent(input!, value);
      expect(input).toHaveValue(value);
    }

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(mutate).toHaveBeenCalledOnce());
    expect(mutate.mock.calls[0]?.[0]).toEqual(values);
    expect(screen.queryByText("common.requiredField")).not.toBeInTheDocument();
  });

  it("continues only to verification using the backend's pending-registration response", async () => {
    mutate.mockImplementation((_input, callbacks) => {
      callbacks.onSuccess({
        verification_required: true,
        email: "normalized.student@example.com",
        expires_in: 600,
        resend_after_seconds: 60,
      });
    });
    const { container } = render(<RegisterPage />);
    const values = {
      full_name: "Pending Student",
      email: "Normalized.Student@Example.COM",
      phone_number: "",
      password: "Autofill-Password-123!",
      password_confirm: "Autofill-Password-123!",
    };

    for (const [name, value] of Object.entries(values)) {
      setDomValueWithoutInputEvent(
        container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!,
        value,
      );
    }
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(replace).toHaveBeenCalledOnce());
    expect(replace).toHaveBeenCalledWith(
      "/verify-email?email=normalized.student%40example.com&expires_in=600&resend_after=60",
    );
  });
});
