import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { PayrollSubnav } from "@/components/payroll/subnav";
import { PayrollReviewFilters } from "@/components/payroll/review-filters";
import { PayrollItemBadge, PayrollRunBadge } from "@/components/payroll/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { filterPayrollReview, loadPayrollOverview, loadPayrollRunDetail } from "@/lib/payroll/query";
import { periodLabel } from "@/lib/payroll/engine";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Payroll review" };

export default async function PayrollReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermissionOrRedirect("payroll.review");
  const params = await searchParams;
  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const overview = await loadPayrollOverview(user.organization.id, user.organization.timezone);
  const runId = first("runId") || overview.latest?.id;
  if (!runId) {
    return (
      <div>
        <PageHeader title="Review" description="Review calculated payroll before approval." />
        <PayrollSubnav />
        <EmptyState title="No payroll run" description="Calculate a run before reviewing." />
      </div>
    );
  }
  const detail = await loadPayrollRunDetail(user.organization.id, runId);
  if (!detail.run) {
    return (
      <div>
        <PageHeader title="Review" description="Review calculated payroll before approval." />
        <PayrollSubnav />
        <EmptyState title="Run not found" description="Select a payroll run to review." />
      </div>
    );
  }
  const filters = {
    employee: first("employee"),
    branch: first("branch"),
    department: first("department"),
    flag: first("flag"),
    minNet: first("minNet"),
    maxNet: first("maxNet"),
  };
  const rows = filterPayrollReview({
    items: detail.items,
    exceptions: detail.exceptions,
    employee: filters.employee,
    branch: filters.branch,
    department: filters.department,
    flag: filters.flag,
    minNet: filters.minNet ? Number(filters.minNet) : undefined,
    maxNet: filters.maxNet ? Number(filters.maxNet) : undefined,
  });
  const branches = [...new Set(detail.items.map((item) => item.branchName).filter((item): item is string => Boolean(item)))];
  const departments = [...new Set(detail.items.map((item) => item.departmentName).filter((item): item is string => Boolean(item)))];
  const canView = hasPermission(user, "payroll.view");

  return (
    <div>
      <PageHeader
        title="Review"
        description={`${periodLabel(detail.run.period)} · ${detail.run.included_count} included`}
        actions={
          <Link href={`/payroll/runs/${detail.run.id}`}>
            <Button variant="outline">Open run</Button>
          </Link>
        }
      />
      <PayrollSubnav />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PayrollRunBadge status={detail.run.status} />
        {canView ? (
          <Link href={`/payroll/exceptions?runId=${detail.run.id}`} className="text-sm text-brand-700 hover:underline">
            Exceptions
          </Link>
        ) : null}
      </div>
      {detail.summary ? (
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric title="Gross earnings" value={formatCurrency(detail.summary.grossEarnings)} hint={`${formatCurrency(detail.summary.reimbursements)} reimbursements`} />
          <Metric title="Deductions" value={formatCurrency(detail.summary.deductions)} hint={`${formatCurrency(detail.summary.adjustments)} adjustments`} />
          <Metric title="Net pay" value={formatCurrency(detail.run.total_net)} hint={`${formatCurrency(detail.run.total_statutory)} statutory deducted`} />
          <Metric title="Flags" value={`${detail.summary.errorEmployees} errors`} hint={`${detail.summary.warningEmployees} warnings`} />
        </div>
      ) : null}
      <PayrollReviewFilters branches={branches} departments={departments} values={filters} />
      {rows.length === 0 ? (
        <EmptyState title="No employees" description="No employees match the current filters." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Paid / LOP</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Net pay</th>
                <th className="px-4 py-3">Flags</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const errors = detail.exceptions.filter((item) => item.employee_id === row.item.employee_id && item.severity === "ERROR" && item.status !== "RESOLVED").length;
                const warnings = detail.exceptions.filter((item) => item.employee_id === row.item.employee_id && item.severity === "WARNING" && item.status !== "RESOLVED").length;
                return (
                  <tr key={row.item.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/payroll/review/${detail.run!.id}/${row.item.employee_id}`} className="font-medium text-brand-700 hover:underline">
                        {row.employeeName}
                      </Link>
                      <p className="text-xs text-slate-500">{row.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3">{row.departmentName ?? "—"}</td>
                    <td className="px-4 py-3">
                      {row.item.paid_days} / {row.item.lop_days}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(row.item.earnings + row.item.variable_earnings)}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(row.item.net_pay)}</td>
                    <td className="px-4 py-3 text-xs">
                      {errors ? <p className="text-red-600">{errors} error</p> : null}
                      {warnings ? <p className="text-amber-700">{warnings} warning</p> : null}
                      {!errors && !warnings ? "—" : null}
                    </td>
                    <td className="px-4 py-3">
                      <PayrollItemBadge status={row.item.status} />
                    </td>
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

function Metric({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  );
}
