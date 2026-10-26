export function assertSameOrganization(expected: string, actual: string | null | undefined) {
  if (!expected || !actual || expected !== actual) {
    throw new Error("Cross-organization access is not allowed.");
  }
}

export function belongsToOrganization<T extends { organization_id: string }>(
  organizationId: string,
  rows: T[]
): T[] {
  return rows.filter((item) => item.organization_id === organizationId);
}

export function scopedRecord<T extends { organization_id: string }>(
  organizationId: string,
  row: T | null | undefined
): T | null {
  if (!row || row.organization_id !== organizationId) return null;
  return row;
}
