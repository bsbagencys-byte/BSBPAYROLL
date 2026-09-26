export function flattenErrors(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}) {
  const fieldErrors = error.flatten().fieldErrors;
  const errors: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(fieldErrors)) {
    if (value?.length) errors[key] = value;
  }
  return errors;
}

export function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : "";
}
