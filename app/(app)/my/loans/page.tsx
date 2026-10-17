import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { EssStatusBadge } from "@/components/ess/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import { loadSelfLoans } from "@/lib/ess/query";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "My loans" };

export default async function MyLoansPage() {
  const user = await requirePermissionOrRedirect("self.view");
  const identity = await resolveSelfEmployee(user);
  if (!identity) return null;

  const data = await loadSelfLoans(user.organization.id, identity.employee.id, user.organization.timezone);
  const canCreate = hasPermission(user, "loans.create");

  return (
    <div>
      <PageHeader
        title="My loans & advances"
        description="Loan applications and active repayment accounts. Repayments are deducted through payroll using the existing loan service."
        actions={
          canCreate ? (
            <Link href="/loans/applications">
              <Button>Apply for loan</Button>
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {data.accounts.length === 0 ? (
              <p className="text-sm text-slate-500">No loan accounts.</p>
            ) : (
              <div className="space-y-3">
                {data.accounts.map((row) => (
                  <div key={row.account.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{row.loanTypeName}</p>
                      <EssStatusBadge status={row.account.status} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <span>EMI: {formatCurrency(row.account.emi_amount)}</span>
                      <span>Outstanding: {formatCurrency(row.account.outstanding_principal + row.account.outstanding_interest)}</span>
                      <span>Paid: {row.account.paid_installments}/{row.account.tenure_months}</span>
                      <span>Next due: {row.account.next_due_date ? formatDateOnly(row.account.next_due_date) : "—"}</span>
                    </div>
                    {row.account.auto_deduct_payroll ? (
                      <Badge variant="muted" className="mt-2">
                        Auto-deduct payroll
                      </Badge>
                    ) : null}
                    {row.overdueCount > 0 ? (
                      <p className="mt-2 text-xs text-red-600">{row.overdueCount} overdue installment(s)</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
          </CardHeader>
          <CardContent>
            {data.applications.length === 0 ? (
              <p className="text-sm text-slate-500">No loan applications.</p>
            ) : (
              <div className="space-y-3">
                {data.applications.map((row) => (
                  <div key={row.application.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="text-sm font-medium">{row.loanTypeName}</p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(row.application.requested_amount)} · {row.application.tenure_months} months
                      </p>
                    </div>
                    <EssStatusBadge status={row.application.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
