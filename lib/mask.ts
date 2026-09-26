export function maskAccountNumber(value: string | null | undefined) {
  if (!value) return "—";
  const digits = value.replace(/\s+/g, "");
  if (digits.length <= 4) return "****";
  return `****${digits.slice(-4)}`;
}

export function maskAadhaarLast4(value: string | null | undefined) {
  if (!value) return "—";
  return `XXXX XXXX ${value}`;
}

export function employeeFullName(input: {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  display_name?: string | null;
}) {
  if (input.display_name?.trim()) return input.display_name.trim();
  return [input.first_name, input.middle_name, input.last_name].filter(Boolean).join(" ");
}
