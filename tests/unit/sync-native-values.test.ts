import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncNativeTextValues } from "@/lib/forms/sync-native-values";

function buildForm(html: string): HTMLFormElement {
  document.body.innerHTML = `<form id="f">${html}</form>`;
  return document.querySelector("form")!;
}

describe("syncNativeTextValues", () => {
  const setValue = vi.fn();
  beforeEach(() => {
    setValue.mockClear();
    document.body.innerHTML = "";
  });

  it("lifts values the browser filled in without dispatching any event", () => {
    const form = buildForm(
      `<input name="email" /><input name="password" type="password" />`,
    );
    form.querySelector<HTMLInputElement>('[name="email"]')!.value = "saved@example.com";
    form.querySelector<HTMLInputElement>('[name="password"]')!.value = "SavedByManager123!";

    syncNativeTextValues(form, ["email", "password"], setValue);

    expect(setValue).toHaveBeenCalledWith(
      "email",
      "saved@example.com",
      expect.objectContaining({ shouldDirty: true, shouldTouch: true }),
    );
    expect(setValue).toHaveBeenCalledWith(
      "password",
      "SavedByManager123!",
      expect.anything(),
    );
  });

  it("still reads a control that is disabled at submit time", () => {
    // FormData omits disabled controls entirely — but the person still sees a
    // filled field, so dropping it means validation rejects a value that is
    // plainly on screen.
    const form = buildForm(`<input name="email" disabled />`);
    form.querySelector<HTMLInputElement>('[name="email"]')!.value = "saved@example.com";

    syncNativeTextValues(form, ["email"], setValue);

    expect(setValue).toHaveBeenCalledWith("email", "saved@example.com", expect.anything());
  });

  it("reads a control associated by the form attribute from outside the form", () => {
    document.body.innerHTML = `<form id="f"></form><input name="code" form="f" />`;
    const form = document.querySelector("form")!;
    document.querySelector<HTMLInputElement>('[name="code"]')!.value = "123456";

    syncNativeTextValues(form, ["code"], setValue);

    expect(setValue).toHaveBeenCalledWith("code", "123456", expect.anything());
  });

  it("reads a textarea as well as an input", () => {
    const form = buildForm(`<textarea name="message"></textarea>`);
    form.querySelector<HTMLTextAreaElement>('[name="message"]')!.value = "مرحبا";

    syncNativeTextValues(form, ["message"], setValue);

    expect(setValue).toHaveBeenCalledWith("message", "مرحبا", expect.anything());
  });

  it("leaves genuinely absent fields alone rather than writing an empty string", () => {
    const form = buildForm(`<input name="email" />`);

    syncNativeTextValues(form, ["email", "password"], setValue);

    expect(setValue).toHaveBeenCalledTimes(1);
    expect(setValue).toHaveBeenCalledWith("email", "", expect.anything());
  });

  it("never touches a field that was not asked for", () => {
    const form = buildForm(`<input name="email" /><input name="otp" />`);
    form.querySelector<HTMLInputElement>('[name="otp"]')!.value = "999999";

    syncNativeTextValues(form, ["email"], setValue);

    expect(setValue).toHaveBeenCalledTimes(1);
    expect(setValue.mock.calls[0]?.[0]).toBe("email");
  });

  it("does nothing when there is no form element to read", () => {
    expect(() => syncNativeTextValues(null, ["email"], setValue)).not.toThrow();
    expect(setValue).not.toHaveBeenCalled();
  });
});
