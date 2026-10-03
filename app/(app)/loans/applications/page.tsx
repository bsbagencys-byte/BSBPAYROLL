import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { LoansSubnav } from "@/components/loans/subnav";
import { LoanApplicationTable } from "@/components/loans/application-table";
import { Button } from "@/components/ui/button";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadLoanListItems } from "@/lib/loans/query";

export const metadata = { title: "Loan applications" };

export default async function LoanApplicationsPage() {
  const user = await requirePermissionOrRedirect("loans.view");
  const items = await loadLoanListItems(user.organization.id);
  const canCreate = hasPermission(user, "loans.create");

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Draft, submitted and approved loan requests."
        actions={
          canCreate ? (
            <Link href="/loans/applications/new">
              <Button>New application</Button>
            </Link>
          ) : null
        }
      />
      <LoansSubnav />
      {items.length === 0 ? (
        <EmptyState title="No applications" description="New loan and advance requests will appear here." />
      ) : (
        <LoanApplicationTable items={items} />
      )}
    </div>
  );
}
