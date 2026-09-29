import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { EmployeeProfile } from "@/components/employees/employee-profile";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { getEmployeeRecord } from "@/lib/employee-query";
import { recordToFormValues } from "@/lib/employee-form";
import { loadOrgCatalog } from "@/lib/org-data";
import { loadEmployeeLeave } from "@/lib/leave/query";

export const metadata = { title: "Employee profile" };

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermissionOrRedirect("employee.view");
  const { id } = await params;
  const [record, catalog, leave] = await Promise.all([
    getEmployeeRecord(user.organization.id, id),
    loadOrgCatalog(user.organization.id),
    loadEmployeeLeave(user.organization.id, id, user.organization.timezone),
  ]);
  if (!record) notFound();

  return (
    <div>
      <PageHeader title="Employee profile" description="Master data, documents and leave. Attendance calculation and payroll stay in later phases." />
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
      />
    </div>
  );
}
