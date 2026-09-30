import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { SalarySubnav } from "@/components/salary/subnav";
import { VariableEarningForm } from "@/components/salary/variable-form";
import { CompensationStatusBadge } from "@/components/salary/status-badge";
import { Button } from "@/components/ui/button";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listSalaryComponents, listVariableEarnings } from "@/lib/salary/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { decideCompensationAction } from "@/actions/salary";
import { formatCurrency, formatDateOnly, lookupName } from "@/lib/utils";

export const metadata = { title: "Variable earnings" };

export default async function VariableEarningsPage() {
  const user = await requirePermissionOrRedirect("salary.view");
  const [rows, catalog, components] = await Promise.all([
    listVariableEarnings(user.organization.id),
    loadOrgCatalog(user.organization.id),
    listSalaryComponents(user.organization.id),
  ]);
  const canManage = hasPermission(user, "salary.manage");

  return (
    <div>
      <PageHeader title="Variable earnings" description="Overtime, bonus, incentive and similar inputs for later payroll. Amounts are stored, not processed." />
      <SalarySubnav />
      {canManage ? (
        <div className="mb-6">
          <VariableEarningForm employees={catalog.employees} components={components} />
        </div>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState title="No variable earnings" description="Record overtime, bonus or incentive against a component." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Component</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                {canManage ? <th className="px-4 py-3" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const employee = catalog.employees.find((row) => row.id === item.employee_id);
                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{employee?.display_name ?? "—"}</td>
                    <td className="px-4 py-3">{lookupName(components, item.component_id)}</td>
                    <td className="px-4 py-3">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-3">
                      {formatDateOnly(item.period_from)} – {formatDateOnly(item.period_to)}
                    </td>
                    <td className="px-4 py-3">{item.source}</td>
                    <td className="px-4 py-3">
                      <CompensationStatusBadge status={item.status} />
                    </td>
                    {canManage && item.status === "PENDING" ? (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <form action={decideCompensationAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="kind" value="variable" />
                            <input type="hidden" name="status" value="APPROVED" />
                            <Button type="submit" size="sm">Approve</Button>
                          </form>
                          <form action={decideCompensationAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="kind" value="variable" />
                            <input type="hidden" name="status" value="REJECTED" />
                            <Button type="submit" size="sm" variant="outline">Reject</Button>
                          </form>
                        </div>
                      </td>
                    ) : canManage ? (
                      <td className="px-4 py-3" />
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
