import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { LoansSubnav } from "@/components/loans/subnav";
import { LoanApplicationStatusBadge } from "@/components/loans/status-badge";
import { LoanApplicationForm } from "@/components/loans/application-form";
import { LoanDecisionForm } from "@/components/loans/decision-form";
import { LoanDisburseForm } from "@/components/loans/disburse-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadApplicationDetail, loadLoansCatalog } from "@/lib/loans/query";
import { cancelLoanApplicationAction, submitLoanApplicationAction } from "@/actions/loans";
import { LOAN_APPROVAL_STEP_LABELS, LOAN_CATEGORY_LABELS, LOAN_INTEREST_METHOD_LABELS, type LoanApprovalStep } from "@/lib/constants";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Loan application" };

export default async function LoanApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionOrRedirect("loans.view");
  const { id } = await params;
  const [detail, catalog] = await Promise.all([
    loadApplicationDetail(user.organization.id, id),
    loadLoansCatalog(user.organization.id),
  ]);
  if (!detail.row) notFound();
  const { row, approvals, account } = detail;
  const application = row.application;
  const canApprove = hasPermission(user, "loans.approve");
  const canDisburse = hasPermission(user, "loans.disburse");
  const canEdit = hasPermission(user, "loans.edit") || hasPermission(user, "loans.create");
  const actionable = application.status === "SUBMITTED" || application.status === "PENDING_APPROVAL";
  const type = catalog.types.find((item) => item.id === application.loan_type_id) ?? null;
  const policy = catalog.policies.find((item) => item.id === application.policy_id) ?? null;

  return (
    <div>
      <PageHeader
        title={application.reference_number ?? "Application"}
        description={`${row.loanTypeName} · ${row.employeeName} (${row.employeeCode})`}
        actions={
          <Link href="/loans/applications">
            <Button variant="outline">Back to applications</Button>
          </Link>
        }
      />
      <LoansSubnav />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Details</CardTitle>
              <div className="flex items-center gap-2">
                <LoanApplicationStatusBadge status={application.status} />
                {application.current_step ? (
                  <Badge variant="default">{LOAN_APPROVAL_STEP_LABELS[application.current_step as LoanApprovalStep]}</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Requested date" value={formatDateOnly(application.requested_date)} />
                <Detail label="Category" value={LOAN_CATEGORY_LABELS[row.category] ?? row.category} />
                <Detail label="Purpose" value={application.purpose ?? "—"} />
                <Detail label="Interest" value={`${LOAN_INTEREST_METHOD_LABELS[application.interest_method]}${application.interest_rate != null ? ` · ${application.interest_rate}%` : ""}`} />
                <Detail label="Requested" value={formatCurrency(application.requested_amount)} />
                <Detail label="Approved" value={application.approved_amount != null ? formatCurrency(application.approved_amount) : "—"} />
                <Detail label="Tenure" value={`${application.tenure_months} months`} />
                <Detail label="EMI" value={formatCurrency(application.emi_amount)} />
                <Detail label="Total repayment" value={formatCurrency(application.total_repayment)} />
                <Detail label="Auto payroll deduct" value={application.auto_deduct_payroll ? "Yes" : "No"} />
              </dl>
              {application.notes ? <p className="mt-4 text-sm text-slate-600">{application.notes}</p> : null}
            </CardContent>
          </Card>

          {canEdit && application.status === "DRAFT" ? (
            <LoanApplicationForm
              row={application}
              types={catalog.types.filter((item) => item.status === "ACTIVE")}
              employees={catalog.employees}
            />
          ) : null}

          {actionable ? (
            <Card>
              <CardHeader>
                <CardTitle>Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <LoanDecisionForm
                  applicationId={application.id}
                  amount={application.requested_amount}
                  tenure={application.tenure_months}
                  canApprove={canApprove}
                />
              </CardContent>
            </Card>
          ) : null}

          {application.status === "APPROVED" ? (
            <Card>
              <CardHeader>
                <CardTitle>Disburse</CardTitle>
              </CardHeader>
              <CardContent>
                <LoanDisburseForm applicationId={application.id} startDate={application.requested_date} canDisburse={canDisburse} />
              </CardContent>
            </Card>
          ) : null}

          {account ? (
            <Card>
              <CardHeader>
                <CardTitle>Loan account</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  Outstanding {formatCurrency(account.outstanding_principal + account.outstanding_interest)} · EMI {formatCurrency(account.emi_amount)}
                </p>
                <Link href={`/loans/accounts/${account.id}`} className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline">
                  Open account
                </Link>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>{policy?.name ?? "No matching policy"}</p>
              {type ? (
                <p className="text-xs text-slate-500">
                  Type: {type.name} · {type.workflow_mode === "TWO_STEP" ? "Manager then finance" : "Single approver"}
                </p>
              ) : null}
              {policy?.max_amount != null ? <p className="text-xs text-slate-500">Maximum {formatCurrency(policy.max_amount)}</p> : null}
              {policy?.max_tenure_months != null ? <p className="text-xs text-slate-500">Max tenure {policy.max_tenure_months} months</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {approvals.length === 0 ? (
                <p className="text-sm text-slate-500">No decisions yet.</p>
              ) : (
                <div className="space-y-3">
                  {approvals.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-medium">
                        {LOAN_APPROVAL_STEP_LABELS[item.step]} · {item.decision}
                      </p>
                      {item.amount != null ? <p className="text-xs text-slate-500">{formatCurrency(item.amount)}</p> : null}
                      {item.reason ? <p className="text-xs text-slate-500">{item.reason}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {application.status === "DRAFT" ? (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <form action={submitLoanApplicationAction}>
                  <input type="hidden" name="id" value={application.id} />
                  <Button type="submit">Submit for approval</Button>
                </form>
                <form action={cancelLoanApplicationAction}>
                  <input type="hidden" name="id" value={application.id} />
                  <Button type="submit" variant="outline">
                    Cancel
                  </Button>
                </form>
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
