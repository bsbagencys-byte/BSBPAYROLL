import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { LoansSubnav } from "@/components/loans/subnav";
import { LoanAccountStatusBadge, LoanInstallmentStatusBadge } from "@/components/loans/status-badge";
import { LoanRepaymentForm } from "@/components/loans/repayment-form";
import { LoanAdjustmentForm } from "@/components/loans/adjustment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadAccountDetail } from "@/lib/loans/query";
import { LOAN_ADJUSTMENT_KIND_LABELS, LOAN_LEDGER_TYPE_LABELS, LOAN_PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Loan account" };

export default async function LoanAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionOrRedirect("loans.view");
  const { id } = await params;
  const detail = await loadAccountDetail(user.organization.id, id, user.organization.timezone);
  if (!detail.row) notFound();
  const { row, schedule, repayments, ledger, adjustments, application } = detail;
  const account = row.account;
  const canRepay = hasPermission(user, "loans.repayment.manage");
  const canAdjust = hasPermission(user, "loans.adjust");

  return (
    <div>
      <PageHeader
        title={`${row.employeeName} · ${row.loanTypeName}`}
        description={`${row.employeeCode} · disbursed ${formatDateOnly(account.start_date)}`}
        actions={
          <Link href="/loans/active">
            <Button variant="outline">Back to active</Button>
          </Link>
        }
      />
      <LoansSubnav />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Account</CardTitle>
              <LoanAccountStatusBadge status={account.status} />
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Disbursed" value={formatCurrency(account.disbursed_amount)} />
                <Detail label="Outstanding" value={formatCurrency(account.outstanding_principal + account.outstanding_interest)} />
                <Detail label="Principal due" value={formatCurrency(account.outstanding_principal)} />
                <Detail label="Interest due" value={formatCurrency(account.outstanding_interest)} />
                <Detail label="EMI" value={formatCurrency(account.emi_amount)} />
                <Detail label="Remaining" value={`${account.remaining_installments} of ${account.tenure_months}`} />
                <Detail label="Next due" value={account.next_due_date ? formatDateOnly(account.next_due_date) : "—"} />
                <Detail label="Payroll deduct" value={account.auto_deduct_payroll ? "Yes" : "No"} />
              </dl>
              {application ? (
                <Link href={`/loans/applications/${application.id}`} className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
                  Open application {application.reference_number}
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {schedule.length === 0 ? (
                <p className="text-sm text-slate-500">No installments.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b text-xs uppercase text-slate-500">
                      <tr>
                        <th className="py-2 pr-3">#</th>
                        <th className="py-2 pr-3">Due</th>
                        <th className="py-2 pr-3">Principal</th>
                        <th className="py-2 pr-3">Interest</th>
                        <th className="py-2 pr-3">EMI</th>
                        <th className="py-2 pr-3">Paid</th>
                        <th className="py-2 pr-3">Outstanding</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((item) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-2 pr-3">{item.installment_number}</td>
                          <td className="py-2 pr-3">{formatDateOnly(item.due_date)}</td>
                          <td className="py-2 pr-3">{formatCurrency(item.principal_amount)}</td>
                          <td className="py-2 pr-3">{formatCurrency(item.interest_amount)}</td>
                          <td className="py-2 pr-3">{formatCurrency(item.emi_amount)}</td>
                          <td className="py-2 pr-3">{formatCurrency(item.paid_amount)}</td>
                          <td className="py-2 pr-3">{formatCurrency(item.outstanding_amount)}</td>
                          <td className="py-2">
                            <LoanInstallmentStatusBadge status={item.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              {ledger.length === 0 ? (
                <p className="text-sm text-slate-500">No ledger entries.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {ledger.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{LOAN_LEDGER_TYPE_LABELS[item.entry_type]}</p>
                        <p className="text-xs text-slate-500">{item.notes ?? item.source}</p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.amount)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {canRepay && (account.status === "ACTIVE" || account.status === "PAUSED") ? (
            <LoanRepaymentForm accounts={[row]} lockedAccountId={account.id} />
          ) : null}
          {canAdjust && (account.status === "ACTIVE" || account.status === "PAUSED") ? (
            <LoanAdjustmentForm accountId={account.id} schedule={schedule} />
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Repayments</CardTitle>
            </CardHeader>
            <CardContent>
              {repayments.length === 0 ? (
                <p className="text-sm text-slate-500">No repayments recorded.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {repayments.map((item) => (
                    <li key={item.id} className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
                      <div>
                        <p>{formatDateOnly(item.payment_date)}</p>
                        <p className="text-xs text-slate-500">{LOAN_PAYMENT_METHOD_LABELS[item.payment_method]}</p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.amount)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          {adjustments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Adjustments</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {adjustments.map((item) => (
                    <li key={item.id} className="border-b border-slate-100 pb-2 last:border-0">
                      <p className="font-medium">{LOAN_ADJUSTMENT_KIND_LABELS[item.kind]}</p>
                      <p className="text-xs text-slate-500">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}
