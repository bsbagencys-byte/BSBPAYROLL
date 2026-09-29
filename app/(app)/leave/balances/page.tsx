import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { LeaveSubnav } from "@/components/leave/subnav";
import { BalanceAdjustForm } from "@/components/leave/balance-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { ensureBalanceViews, loadLeaveCatalog } from "@/lib/leave/query";

export const metadata = { title: "Leave balances" };

export default async function LeaveBalancesPage() {
  const user = await requirePermissionOrRedirect("leave.view");
  const [rows, catalog] = await Promise.all([
    ensureBalanceViews(user.organization.id, user.organization.timezone),
    loadLeaveCatalog(user.organization.id),
  ]);
  const canAdjust = hasPermission(user, "leave.balance.manage");
  const locked = user.roleCode === "EMPLOYEE" ? catalog.employees.find((item) => item.user_id === user.id)?.id : null;
  const visible = locked ? rows.filter((item) => item.employeeId === locked) : rows;

  return (
    <div>
      <PageHeader title="Balances" description="Opening, allocated, accrued, used, pending and available. Changes go through the ledger." />
      <LeaveSubnav />
      {canAdjust ? <div className="mb-6"><BalanceAdjustForm employees={catalog.employees} types={catalog.types} /></div> : null}
      {visible.length === 0 ? (
        <EmptyState title="No balances" description="Balances appear after policies allocate leave to employees." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Allocated</th>
                <th className="px-4 py-3">Used</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Available</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={`${row.employeeId}-${row.leaveTypeId}-${row.year}`} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    {row.employeeName}
                    <div className="text-xs text-slate-500">{row.employeeCode}</div>
                  </td>
                  <td className="px-4 py-3">{row.leaveTypeName}</td>
                  <td className="px-4 py-3">{row.year}</td>
                  <td className="px-4 py-3">{row.allocated}</td>
                  <td className="px-4 py-3">{row.used}</td>
                  <td className="px-4 py-3">{row.pending}</td>
                  <td className="px-4 py-3 font-medium">{row.available}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
