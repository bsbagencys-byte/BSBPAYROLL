import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { LoansSubnav } from "@/components/loans/subnav";
import { LoanApplicationTable } from "@/components/loans/application-table";
import { LoanAccountTable } from "@/components/loans/account-table";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadAccountListItems, loadLoanListItems } from "@/lib/loans/query";

export const metadata = { title: "Loan history" };

export default async function LoanHistoryPage() {
  const user = await requirePermissionOrRedirect("loans.view");
  const [applications, accounts] = await Promise.all([
    loadLoanListItems(user.organization.id),
    loadAccountListItems(user.organization.id, user.organization.timezone),
  ]);

  return (
    <div>
      <PageHeader title="History" description="All applications and loan accounts, including completed and written-off." />
      <LoansSubnav />
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Applications</h2>
      {applications.length === 0 ? (
        <EmptyState title="No applications" description="Loan requests will appear here." />
      ) : (
        <LoanApplicationTable items={applications} />
      )}
      <h2 className="mb-2 mt-6 text-sm font-semibold text-slate-700">Accounts</h2>
      {accounts.length === 0 ? (
        <EmptyState title="No accounts" description="Disbursed loans will appear here." />
      ) : (
        <LoanAccountTable items={accounts} />
      )}
    </div>
  );
}
