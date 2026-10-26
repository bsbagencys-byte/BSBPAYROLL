import { loadOrgCatalog } from "@/lib/org-data";
import { listEmployment } from "@/lib/leave/repository";
import { lookupName } from "@/lib/utils";
import type { Employee, EmployeeEmployment, SessionUser } from "@/types";

export interface SelfIdentity {
  employee: Employee;
  employment: EmployeeEmployment | null;
  departmentName: string | null;
  designationName: string | null;
  branchName: string | null;
  managerName: string | null;
}

/**
 * Resolves the signed-in user to their employee record on the server.
 * The employee is derived from the authenticated session only; a browser-supplied
 * employee id is never trusted for authorisation.
 */
export async function resolveSelfEmployee(user: SessionUser): Promise<SelfIdentity | null> {
  const organizationId = user.organization.id;
  const [catalog, employment] = await Promise.all([
    loadOrgCatalog(organizationId),
    listEmployment(organizationId),
  ]);

  const employee = catalog.employees.find(
    (item) => item.user_id === user.id && item.organization_id === organizationId
  );
  if (!employee) return null;

  const job = employment.find((item) => item.employee_id === employee.id) ?? null;
  return {
    employee,
    employment: job,
    departmentName: lookupName(catalog.departments, job?.department_id),
    designationName: lookupName(catalog.designations, job?.designation_id),
    branchName: lookupName(catalog.branches, job?.branch_id),
    managerName: lookupName(catalog.employees, job?.reporting_manager_id),
  };
}

export async function employeeIdForUser(organizationId: string, userId: string): Promise<string | null> {
  const catalog = await loadOrgCatalog(organizationId);
  return catalog.employees.find((item) => item.user_id === userId && item.organization_id === organizationId)?.id ?? null;
}

export async function employeeUserIds(organizationId: string, employeeIds: string[]): Promise<Map<string, string>> {
  const catalog = await loadOrgCatalog(organizationId);
  const map = new Map<string, string>();
  for (const employee of catalog.employees) {
    if (employee.user_id && employee.organization_id === organizationId && employeeIds.includes(employee.id)) {
      map.set(employee.id, employee.user_id);
    }
  }
  return map;
}
