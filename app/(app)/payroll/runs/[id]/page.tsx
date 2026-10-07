import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { PayrollSubnav } from "@/components/payroll/subnav";
import { PayrollItemTable } from "@/components/payroll/item-table";
import { PayrollReasonForm } from "@/components/payroll/reason-form";
import { PayrollRunBadge } from "@/components/payroll/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  approvePayrollRunAction,
  calculatePayrollRunAction,
  finalizePayrollRunAction,
  generatePayslipsAction,
  lockPayrollRunAction,
  markPayrollPaidAction,
  processPayrollRunAction,
  submitPayrollReviewAction,
  unlockPayrollRunAction,
} from "@/actions/payroll";
import { PAYROLL_APPROVAL_ACTION_LABELS } from "@/lib/constants";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadPayrollRunDetail } from "@/lib/payroll/query";
import { periodLabel } from "@/lib/payroll/engine";
import { formatCurrency, formatDateOnly, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Payroll run" };

export default async function PayrollRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionOrRedirect("payroll.view");
  const { id } = await params;
  const detail = await loadPayrollRunDetail(user.organization.id, id);
  if (!detail.run) notFound();
  const run = detail.run;
  const canProcess = hasPermission(user, "payroll.process");
  const canReview = hasPermission(user, "payroll.review");
  const canApprove = hasPermission(user, "payroll.approve");
  const canReject = hasPermission(user, "payroll.reject");
  const canFinalize = hasPermission(user, "payroll.finalize");
  const canLock = hasPermission(user, "payroll.lock");
  const canPayslip = hasPermission(user, "payslip.generate");
  const immutable = run.status === "FINALIZED" || run.status === "LOCKED" || run.status === "PROCESSED" || run.status === "PAID" || run.status === "CANCELLED";
  const locked = immutable;
  const openErrors = detail.exceptions.filter((item) => item.severity === "ERROR" && item.status !== "RESOLVED").length;
  const openWarnings = detail.exceptions.filter((item) => item.severity === "WARNING" && item.status !== "ACKNOWLEDGED" && item.status !== "RESOLVED").length;

  return (
    <div>
      <PageHeader
        title={periodLabel(run.period)}
        description={`${formatDateOnly(run.period_from)} – ${formatDateOnly(run.period_to)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/payroll/review">
              <Button variant="outline">Review</Button>
            </Link>
            <Link href="/payroll/runs">
              <Button variant="outline">All runs</Button>
            </Link>
          </div>
        }
      />
      <PayrollSubnav />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PayrollRunBadge status={run.status} />
        {canProcess && (run.status === "DRAFT" || run.status === "CALCULATED") ? (
          <form action={calculatePayrollRunAction}>
            <input type="hidden" name="runId" value={run.id} />
            <Button type="submit" variant="outline">
              Recalculate
            </Button>
          </form>
        ) : null}
        {canReview && run.status === "CALCULATED" ? (
          <form action={submitPayrollReviewAction}>
            <input type="hidden" name="runId" value={run.id} />
            <Button type="submit">Submit for review</Button>
          </form>
        ) : null}
        {canApprove && (run.status === "UNDER_REVIEW" || run.status === "APPROVAL_PENDING") ? (
          <form action={approvePayrollRunAction}>
            <input type="hidden" name="runId" value={run.id} />
            <Button type="submit">{run.status === "UNDER_REVIEW" ? "Send to approval" : "Approve"}</Button>
          </form>
        ) : null}
        {canReject && (run.status === "UNDER_REVIEW" || run.status === "APPROVAL_PENDING") ? (
          <PayrollReasonForm runId={run.id} action="reject" label="Reject" variant="destructive" />
        ) : null}
        {canProcess && (run.status === "CALCULATED" || run.status === "UNDER_REVIEW" || run.status === "APPROVAL_PENDING" || run.status === "APPROVED") ? (
          <PayrollReasonForm runId={run.id} action="return" label="Return to draft" />
        ) : null}
        {canFinalize && run.status === "APPROVED" ? (
          <form action={finalizePayrollRunAction}>
            <input type="hidden" name="runId" value={run.id} />
            <Button type="submit">Finalize</Button>
          </form>
        ) : null}
        {canLock && (run.status === "CALCULATED" || run.status === "FINALIZED") ? (
          <form action={lockPayrollRunAction}>
            <input type="hidden" name="runId" value={run.id} />
            <Button type="submit">Lock</Button>
          </form>
        ) : null}
        {canLock && run.status === "LOCKED" && !run.finalized_at ? (
          <form action={unlockPayrollRunAction}>
            <input type="hidden" name="runId" value={run.id} />
            <Button type="submit" variant="outline">
              Unlock
            </Button>
          </form>
        ) : null}
        {canProcess && run.status === "LOCKED" ? (
          <form action={processPayrollRunAction}>
            <input type="hidden" name="runId" value={run.id} />
            <Button type="submit">Process</Button>
          </form>
        ) : null}
        {canProcess && run.status === "PROCESSED" ? (
          <form action={markPayrollPaidAction}>
            <input type="hidden" name="runId" value={run.id} />
            <Button type="submit">Mark paid</Button>
          </form>
        ) : null}
        {canPayslip && (run.status === "FINALIZED" || run.status === "LOCKED" || run.status === "PROCESSED" || run.status === "PAID") ? (
          <form action={generatePayslipsAction}>
            <input type="hidden" name="runId" value={run.id} />
            <Button type="submit" variant="outline">
              Generate payslips
            </Button>
          </form>
        ) : null}
        {canProcess && !immutable ? <PayrollReasonForm runId={run.id} action="cancel" label="Cancel" variant="destructive" /> : null}
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Included" value={String(run.included_count)} hint={`${run.hold_count} held · ${run.error_count} excluded`} />
        <Metric title="Net before statutory" value={formatCurrency(detail.summary?.netBeforeStatutory ?? run.total_net)} hint={`${formatCurrency(run.total_earnings)} earnings`} />
        <Metric title="Exceptions" value={`${openErrors} errors`} hint={`${openWarnings} unacked warnings`} />
        <Metric title="Claims / loans" value={formatCurrency(run.total_claims)} hint={`${formatCurrency(run.total_loans)} EMI`} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Approval history</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.history.length === 0 ? (
            <p className="text-sm text-slate-500">No workflow events yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {detail.history.map((item) => (
                <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 py-2 last:border-0">
                  <span>
                    {PAYROLL_APPROVAL_ACTION_LABELS[item.action]} · {item.previous_status} to {item.new_status}
                    {item.reason ? ` · ${item.reason}` : ""}
                  </span>
                  <span className="text-xs text-slate-500">{formatDateTime(item.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PayrollItemTable items={detail.items} canProcess={canProcess} locked={locked} />
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
