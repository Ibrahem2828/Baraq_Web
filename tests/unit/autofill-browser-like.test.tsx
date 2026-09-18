import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/[locale]/(auth)/login/page";
import RegisterPage from "@/app/[locale]/(auth)/register/page";

const { loginMutate, registerMutate, toast } = vi.hoisted(() => ({
  loginMutate: vi.fn(),
  registerMutate: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/auth/client", () => ({
  useLogin: () => ({ mutate: loginMutate, isPending: false }),
}));
vi.mock("@/features/auth/hooks/useAuthMutations", () => ({
  useRegister: () => ({ mutate: registerMutate, isPending: false }),
}));
vi.mock("@/components/feedback/Toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/components/motion/FadeIn", () => ({
  FadeIn: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/feedback/LoadingState", () => ({ LoadingState: () => <div>loading</div> }));

/**
 * Fill a control the way a browser's autofill / a password manager does: assign
 * `.value` and dispatch nothing at all. No `input`, no `change`, no `blur`.
 *
 * This deliberately goes through whatever `value` setter is installed on the
 * element (React installs its own on the instance), which is what an extension
 * writing to the DOM actually hits — rather than reaching past it to
 * `HTMLInputElement.prototype`. React's state never learns the value changed,
 * so anything reading React state sees an empty field while the user plainly
 * sees a filled one.
 */
function autofill(input: HTMLInputElement, value: string) {
  input.value = value;
}

function field(container: HTMLElement, name: string) {
  return container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
}

describe("browser-like autofill: .value written with no events dispatched", () => {
  beforeEach(() => vi.clearAllMocks());

  it("login submits the visible values instead of failing 'required'", async () => {
    const { container } = render(<LoginPage />);
    autofill(field(container, "email"), "saved.student@example.com");
    autofill(field(container, "password"), "SavedByManager123!");

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(loginMutate).toHaveBeenCalledOnce());
    expect(loginMutate.mock.calls[0]?.[0]).toEqual({
      email: "saved.student@example.com",
      password: "SavedByManager123!",
    });
    // The reported production symptom: a visibly-filled field rejected as
    // empty by client-side validation.
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("login submits when the user presses the submit button rather than the form", async () => {
    const { container } = render(<LoginPage />);
    autofill(field(container, "email"), "saved.student@example.com");
    autofill(field(container, "password"), "SavedByManager123!");

    fireEvent.click(container.querySelector('button[type="submit"]')!);

    await waitFor(() => expect(loginMutate).toHaveBeenCalledOnce());
    expect(loginMutate.mock.calls[0]?.[0]).toMatchObject({
      email: "saved.student@example.com",
    });
  });

  it("register submits every autofilled field", async () => {
    const { container } = render(<RegisterPage />);
    autofill(field(container, "full_name"), "Saved Student");
    autofill(field(container, "email"), "saved.student@example.com");
    autofill(field(container, "phone_number"), "0500000000");
    autofill(field(container, "password"), "SavedByManager123!");
    autofill(field(container, "password_confirm"), "SavedByManager123!");

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(registerMutate).toHaveBeenCalledOnce());
    expect(registerMutate.mock.calls[0]?.[0]).toMatchObject({
      full_name: "Saved Student",
      email: "saved.student@example.com",
      password: "SavedByManager123!",
      password_confirm: "SavedByManager123!",
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("a partially autofilled form still reports the genuinely empty field", async () => {
    const { container } = render(<LoginPage />);
    autofill(field(container, "email"), "saved.student@example.com");
    // password left untouched — this one really is empty.

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(container.querySelector('[role="alert"]')).not.toBeNull());
    expect(loginMutate).not.toHaveBeenCalled();
  });
});
