import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { PayrollSubnav } from "@/components/payroll/subnav";
import { PayrollAdjustmentForm } from "@/components/payroll/adjustment-form";
import { PayrollItemBadge, PayrollRunBadge } from "@/components/payroll/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYROLL_EXCEPTION_CODE_LABELS, PAYROLL_LINE_KIND_LABELS } from "@/lib/constants";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadEmployeePayrollReview } from "@/lib/payroll/query";
import { periodLabel } from "@/lib/payroll/engine";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Employee payroll review" };

export default async function EmployeePayrollReviewPage({
  params,
}: {
  params: Promise<{ runId: string; employeeId: string }>;
}) {
  const user = await requirePermissionOrRedirect("payroll.review");
  const { runId, employeeId } = await params;
  const review = await loadEmployeePayrollReview(user.organization.id, runId, employeeId);
  if (!review) notFound();
  const canAdjust = hasPermission(user, "payroll.adjust");
  const immutable = review.run.status === "FINALIZED" || review.run.status === "LOCKED" || review.run.status === "PROCESSED" || review.run.status === "PAID" || review.run.status === "CANCELLED";

  return (
    <div>
      <PageHeader
        title={review.row.employeeName}
        description={`${review.row.employeeCode} · ${periodLabel(review.run.period)}`}
        actions={
          <Link href={`/payroll/review?runId=${review.run.id}`}>
            <Button variant="outline">Back to review</Button>
          </Link>
        }
      />
      <PayrollSubnav />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PayrollRunBadge status={review.run.status} />
        <PayrollItemBadge status={review.row.item.status} />
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Gross" value={formatCurrency(review.row.item.earnings + review.row.item.variable_earnings)} hint={`${review.row.item.paid_days} paid days`} />
        <Metric title="Claims / loans" value={formatCurrency(review.row.item.claims)} hint={`${formatCurrency(review.row.item.loan_deductions)} EMI`} />
        <Metric title="Net before statutory" value={formatCurrency(review.netBeforeStatutory)} hint="Statutory reserved for Phase 11" />
        <Metric title="Exceptions" value={String(review.exceptions.length)} hint={`${review.adjustments.length} adjustments`} />
      </div>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payroll lines</CardTitle>
          </CardHeader>
          <CardContent>
            {review.lines.length === 0 ? (
              <p className="text-sm text-slate-500">No lines.</p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Head</th>
                    <th className="py-2 pr-3">Kind</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {review.lines.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{item.name}</td>
                      <td className="py-2 pr-3 text-slate-500">{PAYROLL_LINE_KIND_LABELS[item.kind]}</td>
                      <td className="py-2 text-right">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Source trace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Salary assignment: {review.sources.salary ?? "—"}</p>
            <p>Attendance: {review.sources.attendance}</p>
            <p>Leave: {review.sources.leave}</p>
            <p>Claims: {review.sources.claims.filter(Boolean).length || "none"}</p>
            <p>Loans: {review.sources.loans.filter(Boolean).length || "none"}</p>
          </CardContent>
        </Card>
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Exceptions</CardTitle>
        </CardHeader>
        <CardContent>
          {review.exceptions.length === 0 ? (
            <p className="text-sm text-slate-500">No exceptions for this employee.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {review.exceptions.map((item) => (
                <li key={item.id} className="rounded-md border border-slate-200 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant={item.severity === "ERROR" ? "danger" : "warning"}>{item.severity}</Badge>
                    <span className="font-medium">{PAYROLL_EXCEPTION_CODE_LABELS[item.code]}</span>
                  </div>
                  <p className="text-slate-600">{item.message}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {canAdjust && !immutable ? <PayrollAdjustmentForm runId={review.run.id} itemId={review.row.item.id} /> : null}
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
