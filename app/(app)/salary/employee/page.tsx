import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { SalarySubnav } from "@/components/salary/subnav";
import { SalaryAssignmentForm } from "@/components/salary/assignment-form";
import { Badge } from "@/components/ui/badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadEmployeeSnapshots } from "@/lib/salary/query";
import { listSalaryStructures } from "@/lib/salary/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Employee salary" };

export default async function EmployeeSalaryPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string }>;
}) {
  const user = await requirePermissionOrRedirect("salary.view");
  const { employeeId } = await searchParams;
  const [rows, catalog, structures] = await Promise.all([
    loadEmployeeSnapshots(user.organization.id, user.organization.timezone),
    loadOrgCatalog(user.organization.id),
    listSalaryStructures(user.organization.id),
  ]);
  const canManage = hasPermission(user, "salary.manage");

  return (
    <div>
      <PageHeader title="Employee salary" description="Assign a structure with an effective date. Previous assignments are closed, never overwritten." />
      <SalarySubnav />
      {canManage ? (
        <div className="mb-6">
          <SalaryAssignmentForm employees={catalog.employees} structures={structures} defaultEmployeeId={employeeId} />
        </div>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState title="No employees" description="Add employees before assigning salary." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Structure</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3">CTC</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.employeeId} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    {item.employeeName}
                    <div className="text-xs text-slate-500">{item.employeeCode}</div>
                  </td>
                  <td className="px-4 py-3">{item.snapshot?.structureName ?? "—"}</td>
                  <td className="px-4 py-3">{item.snapshot ? formatDateOnly(item.snapshot.effectiveFrom) : "—"}</td>
                  <td className="px-4 py-3">{item.snapshot ? formatCurrency(item.snapshot.ctc) : "—"}</td>
                  <td className="px-4 py-3">{item.snapshot ? formatCurrency(item.snapshot.gross) : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={item.snapshot ? "success" : "muted"}>{item.snapshot ? "Assigned" : "Missing"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
