import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { PaymentsSubnav } from "@/components/payments/subnav";
import { PaymentBatchBadge, PaymentItemBadge } from "@/components/payments/status-badge";
import { PaymentExcludeForm } from "@/components/payments/exclude-form";
import { PaymentCancelForm } from "@/components/payments/cancel-form";
import { BankExportForm } from "@/components/payments/export-form";
import { PaymentOutcomeForm } from "@/components/payments/outcome-form";
import { ReconciliationForm } from "@/components/payments/reconcile-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { approvePaymentBatchAction, confirmReconciliationAction, includePaymentItemAction, validatePaymentBatchAction } from "@/actions/payments";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadPaymentBatchDetail } from "@/lib/payments/query";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { periodLabel } from "@/lib/payroll/engine";
import { formatCurrency, formatDateOnly, formatDateTime } from "@/lib/utils";
import type { ReconciliationPreviewRow } from "@/lib/payments/service";

export const metadata = { title: "Payment batch" };

export default async function PaymentBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionOrRedirect("payments.view");
  const { id } = await params;
  const detail = await loadPaymentBatchDetail(user.organization.id, id);
  if (!detail) notFound();
  const batch = detail.batch;
  const canCreate = hasPermission(user, "payments.create");
  const canApprove = hasPermission(user, "payments.approve");
  const canExport = hasPermission(user, "payments.export");
  const canReconcile = hasPermission(user, "payments.reconcile");
  const editable = ["DRAFT", "VALIDATING", "READY"].includes(batch.status);
  const preview = detail.reconciliations.find((row) => row.status === "PREVIEW") ?? null;
  let previewRows: ReconciliationPreviewRow[] = [];
  if (preview?.summary_json) {
    try {
      previewRows = (JSON.parse(preview.summary_json).rows ?? []) as ReconciliationPreviewRow[];
    } catch {
      previewRows = [];
    }
  }

  return (
    <div>
      <PageHeader
        title={`Salary ${periodLabel(batch.period)}`}
        description={`${formatDateOnly(batch.payment_date)} · ${PAYMENT_METHOD_LABELS[batch.payment_method]}. Bank details are masked. Exporting does not mean paid.`}
        actions={
          <div className="flex flex-wrap gap-2">
            {canExport && ["APPROVED", "EXPORTED", "PARTIALLY_PAID", "PAID"].includes(batch.status) ? (
              <a href={`/api/payments/${batch.id}/csv`}>
                <Button variant="outline">Download CSV</Button>
              </a>
            ) : null}
            <Link href="/payments">
              <Button variant="outline">All batches</Button>
            </Link>
          </div>
        }
      />
      <PaymentsSubnav />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PaymentBatchBadge status={batch.status} />
        {canCreate && editable ? (
          <form action={validatePaymentBatchAction}>
            <input type="hidden" name="batchId" value={batch.id} />
            <Button type="submit" variant="outline">
              Revalidate
            </Button>
          </form>
        ) : null}
        {canApprove && batch.status === "READY" ? (
          <form action={approvePaymentBatchAction}>
            <input type="hidden" name="batchId" value={batch.id} />
            <Button type="submit">Approve</Button>
          </form>
        ) : null}
        {canExport && ["APPROVED", "EXPORTED", "PARTIALLY_PAID", "PAID"].includes(batch.status) ? (
          <BankExportForm batchId={batch.id} alreadyExported={batch.export_count > 0} />
        ) : null}
        {canCreate && batch.status !== "PAID" && batch.status !== "CANCELLED" ? <PaymentCancelForm batchId={batch.id} /> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{batch.total_employees}</p>
            <p className="text-xs text-slate-500">{detail.items.filter((row) => row.status === "EXCLUDED").length} excluded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(batch.total_amount)}</p>
            <p className="text-xs text-slate-500">Exports {batch.export_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Source run</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{detail.run ? periodLabel(detail.run.period) : "—"}</p>
            <p className="text-xs text-slate-500">{detail.run?.status ?? batch.run_id}</p>
          </CardContent>
        </Card>
      </div>
      {detail.issues.length ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Employee-level validation</p>
          <ul className="mt-2 list-disc pl-5">
            {detail.issues.map((issue, index) => (
              <li key={`${issue.employeeId}-${index}`}>
                {issue.employeeCode} · {issue.employeeName}: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">IFSC</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {detail.items.map((item) => (
              <tr key={item.id} className="border-b last:border-0 align-top">
                <td className="px-4 py-3">
                  <p className="font-medium">{item.employee_name}</p>
                  <p className="text-xs text-slate-500">{item.employee_code}</p>
                  {item.error_message ? <p className="mt-1 text-xs text-red-700">{item.error_message}</p> : null}
                  {item.exclusion_reason ? <p className="mt-1 text-xs text-slate-500">Excluded: {item.exclusion_reason}</p> : null}
                </td>
                <td className="px-4 py-3">{item.account_number_last4 ? `****${item.account_number_last4}` : "—"}</td>
                <td className="px-4 py-3">{item.ifsc ?? "—"}</td>
                <td className="px-4 py-3">{formatCurrency(item.amount)}</td>
                <td className="px-4 py-3">
                  <PaymentItemBadge status={item.status} />
                </td>
                <td className="px-4 py-3">
                  {canCreate && editable && item.status !== "EXCLUDED" ? <PaymentExcludeForm batchId={batch.id} itemId={item.id} /> : null}
                  {canCreate && editable && item.status === "EXCLUDED" ? (
                    <form action={includePaymentItemAction}>
                      <input type="hidden" name="batchId" value={batch.id} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Restore
                      </Button>
                    </form>
                  ) : null}
                  {canReconcile && item.status !== "EXCLUDED" && !editable ? (
                    <PaymentOutcomeForm batchId={batch.id} itemId={item.id} paymentDate={batch.payment_date} />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canReconcile ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">Bank-result import</h2>
          <p className="mb-3 text-xs text-slate-500">Preview first. Confirm posts MATCHED rows only. Account numbers are never stored from the file.</p>
          <ReconciliationForm batchId={batch.id} />
          {preview ? (
            <div className="mt-4">
              <p className="text-sm text-slate-600">
                Preview {preview.matched_count} matched · {preview.unmatched_count} unmatched · {preview.duplicate_count} duplicate · {preview.mismatch_count} amount mismatch
              </p>
              {previewRows.length ? (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Match</th>
                        <th className="px-3 py-2">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr key={`${row.employeeCode}-${index}`} className="border-b last:border-0">
                          <td className="px-3 py-2">{row.employeeCode || "—"}</td>
                          <td className="px-3 py-2">{formatCurrency(row.amount)}</td>
                          <td className="px-3 py-2">{row.match}</td>
                          <td className="px-3 py-2">{row.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <form action={confirmReconciliationAction} className="mt-3">
                <input type="hidden" name="reconciliationId" value={preview.id} />
                <input type="hidden" name="batchId" value={batch.id} />
                <Button type="submit" size="sm">
                  Confirm matched rows
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
      {detail.transactions.length ? (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Outcome history</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {detail.transactions.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{formatDateTime(row.created_at)}</td>
                    <td className="px-4 py-3">{formatDateOnly(row.payment_date)}</td>
                    <td className="px-4 py-3">{formatCurrency(row.amount)}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">{row.bank_reference ?? row.reference ?? "—"}</td>
                    <td className="px-4 py-3">{row.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
