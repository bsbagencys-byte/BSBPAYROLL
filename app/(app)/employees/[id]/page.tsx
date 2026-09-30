import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { EmployeeProfile } from "@/components/employees/employee-profile";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { getEmployeeRecord } from "@/lib/employee-query";
import { recordToFormValues } from "@/lib/employee-form";
import { loadOrgCatalog } from "@/lib/org-data";
import { loadEmployeeLeave } from "@/lib/leave/query";
import { loadEmployeeCompensation } from "@/lib/salary/query";

export const metadata = { title: "Employee profile" };

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermissionOrRedirect("employee.view");
  const { id } = await params;
  const canViewSalary = hasPermission(user, "salary.view");
  const [record, catalog, leave, salary] = await Promise.all([
    getEmployeeRecord(user.organization.id, id),
    loadOrgCatalog(user.organization.id),
    loadEmployeeLeave(user.organization.id, id, user.organization.timezone),
    canViewSalary ? loadEmployeeCompensation(user.organization.id, id, user.organization.timezone) : Promise.resolve(null),
  ]);
  if (!record) notFound();

  return (
    <div>
      <PageHeader title="Employee profile" description="Master data, documents, leave and salary. Attendance calculation and payroll stay in later phases." />
      <EmployeeProfile
        record={record}
        values={recordToFormValues(record)}
        catalog={catalog}
        canEdit={hasPermission(user, "employee.edit")}
        canDisable={hasPermission(user, "employee.disable")}
        canDocuments={hasPermission(user, "employee.documents")}
        timezone={user.organization.timezone}
        leaveBalances={leave.balances}
        leaveRequests={leave.requests}
        salarySnapshot={salary?.snapshot ?? null}
        salaryHistory={salary?.history ?? []}
        salaryRevisions={salary?.revisions ?? []}
        canViewSalary={canViewSalary}
        canManageSalary={hasPermission(user, "salary.manage")}
        canReviseSalary={hasPermission(user, "salary.revision.create")}
      />
    </div>
  );
}
