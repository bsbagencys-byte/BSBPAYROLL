import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { LoansSubnav } from "@/components/loans/subnav";
import { LoanAccountTable } from "@/components/loans/account-table";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadAccountListItems } from "@/lib/loans/query";

export const metadata = { title: "Active loans" };

export default async function ActiveLoansPage() {
  const user = await requirePermissionOrRedirect("loans.view");
  const items = await loadAccountListItems(user.organization.id, user.organization.timezone);
  const active = items.filter((item) => item.account.status === "ACTIVE" || item.account.status === "PAUSED");

  return (
    <div>
      <PageHeader title="Active" description="Disbursed loans and advances with outstanding balances." />
      <LoansSubnav />
      {active.length === 0 ? (
        <EmptyState title="No active loans" description="Disbursed accounts will appear here until they are repaid or written off." />
      ) : (
        <LoanAccountTable items={active} />
      )}
    </div>
  );
}
