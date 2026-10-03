import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { LoansSubnav } from "@/components/loans/subnav";
import { LoanRepaymentForm } from "@/components/loans/repayment-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadAccountListItems, loadLoansCatalog } from "@/lib/loans/query";
import { LOAN_PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Loan repayments" };

export default async function LoanRepaymentsPage() {
  const user = await requirePermissionOrRedirect("loans.view");
  const [accounts, catalog] = await Promise.all([
    loadAccountListItems(user.organization.id, user.organization.timezone),
    loadLoansCatalog(user.organization.id),
  ]);
  const canRepay = hasPermission(user, "loans.repayment.manage");
  const active = accounts.filter((item) => item.account.status === "ACTIVE" || item.account.status === "PAUSED");

  return (
    <div>
      <PageHeader title="Repayments" description="Manual cash/bank recoveries. Payroll EMI deduction is recorded later via getEmployeeLoanDeductions." />
      <LoansSubnav />
      {canRepay ? (
        <div className="mb-6">
          <LoanRepaymentForm accounts={active} />
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {catalog.repayments.length === 0 ? (
            <EmptyState title="No repayments" description="Manual and payroll recoveries will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Employee</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Method</th>
                    <th className="py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.repayments.map((item) => {
                    const account = catalog.accounts.find((row) => row.id === item.account_id);
                    const type = catalog.types.find((row) => row.id === account?.loan_type_id);
                    const employee = catalog.employees.find((row) => row.id === account?.employee_id);
                    return (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{formatDateOnly(item.payment_date)}</td>
                        <td className="py-2 pr-4">{employee?.display_name ?? "—"}</td>
                        <td className="py-2 pr-4">{type?.name ?? "—"}</td>
                        <td className="py-2 pr-4">{formatCurrency(item.amount)}</td>
                        <td className="py-2 pr-4">{LOAN_PAYMENT_METHOD_LABELS[item.payment_method]}</td>
                        <td className="py-2">{item.source}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
