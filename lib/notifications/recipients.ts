import { loadOrgCatalog } from "@/lib/org-data";
import { listEmployment } from "@/lib/leave/repository";

export async function emailForUser(organizationId: string, userId: string): Promise<string | null> {
  const [catalog, employment] = await Promise.all([loadOrgCatalog(organizationId), listEmployment(organizationId)]);
  const employee = catalog.employees.find((item) => item.user_id === userId);
  if (!employee) return null;
  return employment.find((item) => item.employee_id === employee.id)?.official_email ?? null;
}
