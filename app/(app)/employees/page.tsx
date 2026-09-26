import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { EmployeeFilters } from "@/components/employees/employee-filters";
import { EmployeeTable } from "@/components/employees/employee-table";
import { Button } from "@/components/ui/button";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { queryEmployees } from "@/lib/employee-query";
import { loadOrgCatalog } from "@/lib/org-data";

export const metadata = { title: "Employees" };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermissionOrRedirect("employee.view");
  const params = await searchParams;
  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const filters = {
    q: first("q"),
    branchId: first("branchId"),
    departmentId: first("departmentId"),
    designationId: first("designationId"),
    employmentTypeId: first("employmentTypeId"),
    status: first("status"),
    managerId: first("managerId"),
    joiningFrom: first("joiningFrom"),
    joiningTo: first("joiningTo"),
    sort: first("sort") || "name",
    page: Number(first("page") || 1) || 1,
  };
  const [result, catalog] = await Promise.all([
    queryEmployees(user.organization.id, filters),
    loadOrgCatalog(user.organization.id),
  ]);
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && key !== "page") query.set(key, String(value));
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Employees"
        description="Organisation directory. Salary and attendance modules are not enabled yet."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/employees/hierarchy">
              <Button variant="outline">Hierarchy</Button>
            </Link>
            {hasPermission(user, "employee.import") ? (
              <Link href="/employees/import">
                <Button variant="outline">Import CSV</Button>
              </Link>
            ) : null}
            {hasPermission(user, "employee.create") ? (
              <Link href="/employees/new">
                <Button>Add employee</Button>
              </Link>
            ) : null}
          </div>
        }
      />
      <EmployeeFilters
        filters={{
          q: filters.q ?? "",
          branchId: filters.branchId ?? "",
          departmentId: filters.departmentId ?? "",
          designationId: filters.designationId ?? "",
          employmentTypeId: filters.employmentTypeId ?? "",
          status: filters.status ?? "",
          managerId: filters.managerId ?? "",
          joiningFrom: filters.joiningFrom ?? "",
          joiningTo: filters.joiningTo ?? "",
          sort: filters.sort ?? "name",
        }}
        branches={catalog.branches}
        departments={catalog.departments}
        designations={catalog.designations}
        employmentTypes={catalog.employmentTypes}
        employees={catalog.employees}
      />
      <EmployeeTable items={result.items} page={result.page} pageCount={result.pageCount} total={result.total} query={query.toString()} />
    </div>
  );
}
