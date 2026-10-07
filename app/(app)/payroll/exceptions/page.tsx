import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { PayrollAcknowledgeForm } from "@/components/payroll/acknowledge-form";
import { PayrollSubnav } from "@/components/payroll/subnav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PAYROLL_EXCEPTION_CODE_LABELS, PAYROLL_EXCEPTION_STATUS_LABELS } from "@/lib/constants";
import { resolvePayrollExceptionAction } from "@/actions/payroll";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadPayrollExceptions, loadPayrollOverview } from "@/lib/payroll/query";
import { periodLabel } from "@/lib/payroll/engine";

export const metadata = { title: "Payroll exceptions" };

export default async function PayrollExceptionsPage({
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
  const rows = await loadPayrollExceptions(user.organization.id, runId);
  const canProcess = hasPermission(user, "payroll.process");
  const run = overview.runs.find((item) => item.id === runId) ?? overview.latest;

  return (
    <div>
      <PageHeader
        title="Exceptions"
        description={run ? `Open errors block review. Warnings must be acknowledged before approval. ${periodLabel(run.period)}` : "Open errors block review. Warnings must be acknowledged before approval."}
        actions={
          run ? (
            <Link href={`/payroll/review?runId=${run.id}`}>
              <Button variant="outline">Review</Button>
            </Link>
          ) : null
        }
      />
      <PayrollSubnav />
      {rows.length === 0 ? (
        <EmptyState title="No exceptions" description="Calculate a payroll run to scan for exceptions." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.exception.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    {row.exception.employee_id && row.run ? (
                      <Link href={`/payroll/review/${row.run.id}/${row.exception.employee_id}`} className="font-medium text-brand-700 hover:underline">
                        {row.employeeName}
                      </Link>
                    ) : (
                      <span className="font-medium">{row.employeeName}</span>
                    )}
                    <p className="text-xs text-slate-500">{row.employeeCode}</p>
                  </td>
                  <td className="px-4 py-3">{PAYROLL_EXCEPTION_CODE_LABELS[row.exception.code]}</td>
                  <td className="px-4 py-3">
                    <Badge variant={row.exception.severity === "ERROR" ? "danger" : "warning"}>{row.exception.severity}</Badge>
                  </td>
                  <td className="px-4 py-3">{PAYROLL_EXCEPTION_STATUS_LABELS[row.exception.status]}</td>
                  <td className="px-4 py-3 text-slate-600">{row.exception.message}</td>
                  <td className="px-4 py-3">
                    {row.exception.severity === "WARNING" && row.exception.status === "OPEN" ? (
                      <PayrollAcknowledgeForm exceptionId={row.exception.id} />
                    ) : null}
                    {canProcess && row.exception.status !== "RESOLVED" ? (
                      <form action={resolvePayrollExceptionAction} className="mt-2">
                        <input type="hidden" name="exceptionId" value={row.exception.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          Mark resolved
                        </Button>
                      </form>
                    ) : null}
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
