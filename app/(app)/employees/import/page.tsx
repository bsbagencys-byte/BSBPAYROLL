import { PageHeader } from "@/components/layout/app-shell";
import { EmployeeImport } from "@/components/employees/employee-import";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";

export const metadata = { title: "Import employees" };

export default async function ImportEmployeesPage() {
  await requirePermissionOrRedirect("employee.import");
  return (
    <div>
      <PageHeader title="Import employees" description="CSV only. Excel files are not accepted in this phase." />
      <EmployeeImport />
    </div>
  );
}
