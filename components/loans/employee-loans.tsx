import Link from "next/link";
import { LoanAccountStatusBadge, LoanApplicationStatusBadge } from "@/components/loans/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import type { LoanAccountListItem, LoanListItem, LoanRepayment } from "@/types";

export function EmployeeLoansPanel({
  accounts,
  applications,
  repayments,
}: {
  accounts: LoanAccountListItem[];
  applications: LoanListItem[];
  repayments: LoanRepayment[];
}) {
  const active = accounts.filter((item) => item.account.status === "ACTIVE" || item.account.status === "PAUSED");
  const outstanding = active.reduce((sum, item) => sum + item.account.outstanding_principal + item.account.outstanding_interest, 0);
  const monthlyEmi = active.reduce((sum, item) => sum + item.account.emi_amount, 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Active loans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(outstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Monthly EMI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(monthlyEmi)}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Loans & advances</CardTitle>
          <Link href="/loans/active">
            <Button size="sm" variant="outline">
              View all
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 && applications.length === 0 ? (
            <p className="text-sm text-slate-500">No loans for this employee.</p>
          ) : (
            <div className="space-y-3">
              {accounts.slice(0, 6).map((item) => (
                <Link key={item.account.id} href={`/loans/accounts/${item.account.id}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                  <div>
                    <p className="font-medium">{item.loanTypeName}</p>
                    <p className="text-xs text-slate-500">{formatDateOnly(item.account.start_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(item.account.outstanding_principal + item.account.outstanding_interest)}</p>
                    <LoanAccountStatusBadge status={item.account.status} />
                  </div>
                </Link>
              ))}
              {applications
                .filter((item) => item.application.status !== "DISBURSED")
                .slice(0, 4)
                .map((item) => (
                  <Link key={item.application.id} href={`/loans/applications/${item.application.id}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                    <div>
                      <p className="font-medium">{item.loanTypeName}</p>
                      <p className="text-xs text-slate-500">{item.application.reference_number}</p>
                    </div>
                    <LoanApplicationStatusBadge status={item.application.status} />
                  </Link>
                ))}
              {repayments.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="font-medium">Repayment</p>
                    <p className="text-xs text-slate-500">{formatDateOnly(item.payment_date)}</p>
                  </div>
                  <p className="text-sm font-medium">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
