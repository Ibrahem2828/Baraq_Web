import type { FieldValues, Path, UseFormSetValue } from "react-hook-form";

/**
 * Reads what the control actually shows right now.
 *
 * `FormData` is the primary source because it applies the browser's own
 * successful-control rules. But it deliberately omits controls the browser
 * considers unsuccessful — a disabled field most of all — and it only sees
 * controls the form owns. A field that is disabled at submit time, or
 * rendered through a portal, is still visibly filled to the person looking at
 * it, so falling through to the live control is the difference between
 * submitting what they see and rejecting it as "this field is required".
 */
function readNativeValue(
  form: HTMLFormElement,
  formData: FormData,
  name: string,
): string | null {
  const fromFormData = formData.get(name);
  if (typeof fromFormData === "string") return fromFormData;

  // `form.elements` also includes controls associated by the `form=`
  // attribute, which live outside the form's subtree.
  const control = form.elements.namedItem(name);
  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
    return control.value;
  }
  return null;
}

/**
 * Synchronize text-like controls from the browser's live DOM into React Hook
 * Form state, so validation judges what the person can see.
 *
 * Call this from the form's own `onSubmit`, BEFORE handing the event to
 * `handleSubmit` — never from inside the valid-submit callback, which only
 * runs after validation has already read (and rejected) the stale state.
 *
 * Some autofill and password-manager paths assign `.value` and dispatch no
 * `input`/`change` event at all, so React never learns the field changed.
 * Field names stay type-checked; this is intentionally limited to string
 * controls and must not be used for files, checkboxes, or multi-selects.
 */
export function syncNativeTextValues<T extends FieldValues>(
  form: HTMLFormElement | null | undefined,
  fieldNames: readonly Path<T>[],
  setValue: UseFormSetValue<T>,
): void {
  if (!form) return;

  const formData = new FormData(form);
  for (const fieldName of fieldNames) {
    const value = readNativeValue(form, formData, fieldName);
    if (value !== null) {
      setValue(fieldName, value as never, { shouldDirty: true, shouldTouch: true });
    }
  }
}
