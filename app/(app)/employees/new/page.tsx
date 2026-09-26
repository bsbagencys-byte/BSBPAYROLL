import { PageHeader } from "@/components/layout/app-shell";
import { EmployeeForm } from "@/components/employees/employee-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadOrgCatalog } from "@/lib/org-data";

export const metadata = { title: "Add employee" };

export default async function NewEmployeePage() {
  const user = await requirePermissionOrRedirect("employee.create");
  const catalog = await loadOrgCatalog(user.organization.id);

  return (
    <div>
      <PageHeader title="Add employee" description="Create an employee record. Payroll fields are not collected in this phase." />
      <EmployeeForm canEdit values={{ status: "ACTIVE" }} catalog={catalog} />
    </div>
  );
}
