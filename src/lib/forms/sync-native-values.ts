import type { FieldValues, Path, UseFormSetValue } from "react-hook-form";

/**
 * Synchronize text-like controls from the browser's native FormData before
 * React Hook Form validates. Some browser/password-manager autofill paths set
 * the visible DOM value without emitting the input/change event RHF observes.
 * Field names remain type-checked; this helper is intentionally limited to
 * string controls and must not be used for files, checkboxes, or multi-selects.
 */
export function syncNativeTextValues<T extends FieldValues>(
  form: HTMLFormElement,
  fieldNames: readonly Path<T>[],
  setValue: UseFormSetValue<T>,
): void {
  const formData = new FormData(form);
  for (const fieldName of fieldNames) {
    const value = formData.get(fieldName);
    if (typeof value === "string") {
      setValue(fieldName, value as never, { shouldDirty: true, shouldTouch: true });
    }
  }
}
