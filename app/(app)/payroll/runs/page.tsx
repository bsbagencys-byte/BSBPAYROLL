import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { PayrollSubnav } from "@/components/payroll/subnav";
import { PayrollRunForm } from "@/components/payroll/run-form";
import { PayrollRunBadge } from "@/components/payroll/status-badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listPayrollRuns } from "@/lib/payroll/repository";
import { currentPeriod, periodLabel } from "@/lib/payroll/engine";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Payroll runs" };

export default async function PayrollRunsPage() {
  const user = await requirePermissionOrRedirect("payroll.view");
  const runs = await listPayrollRuns(user.organization.id);
  const canProcess = hasPermission(user, "payroll.process");
  const period = currentPeriod(user.organization.timezone);

  return (
    <div>
      <PageHeader title="Runs" description="One payroll run per calendar month. Recalculate until locked." />
      <PayrollSubnav />
      {canProcess && !runs.some((item) => item.period === period) ? (
        <div className="mb-6">
          <PayrollRunForm period={period} />
        </div>
      ) : null}
      {runs.length === 0 ? (
        <EmptyState title="No payroll runs" description="Create a run for the current month to calculate net pay." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Pay date</th>
                <th className="px-4 py-3">Employees</th>
                <th className="px-4 py-3">Net</th>
                <th className="px-4 py-3">Statutory</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/payroll/runs/${item.id}`} className="font-medium text-brand-700 hover:underline">
                      {periodLabel(item.period)}
                    </Link>
                    <p className="text-xs text-slate-500">{item.period}</p>
                  </td>
                  <td className="px-4 py-3">{formatDateOnly(item.pay_date)}</td>
                  <td className="px-4 py-3">
                    {item.included_count}/{item.employee_count}
                  </td>
                  <td className="px-4 py-3">{formatCurrency(item.total_net)}</td>
                  <td className="px-4 py-3">{formatCurrency(item.total_statutory)}</td>
                  <td className="px-4 py-3">
                    <PayrollRunBadge status={item.status} />
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
