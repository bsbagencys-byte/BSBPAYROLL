import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ContractorsSubnav } from "@/components/contractors/subnav";
import { InvoiceTable } from "@/components/contractors/invoice-table";
import { Button } from "@/components/ui/button";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadContractorsOverview } from "@/lib/exits/query";

export const metadata = { title: "Contractor invoices" };

export default async function ContractorPaymentsPage() {
  const user = await requirePermissionOrRedirect("contractors.view");
  const overview = await loadContractorsOverview(user.organization.id, user.organization.timezone);
  const canCreate = hasPermission(user, "contractors.invoices.create");

  return (
    <div>
      <PageHeader
        title="Contractor invoices"
        description="Gross, verified TDS withholding and net payable. Duplicate invoice numbers need an authorized reason."
        actions={
          canCreate ? (
            <Link href="/contractor-payments/new">
              <Button>New invoice</Button>
            </Link>
          ) : null
        }
      />
      <ContractorsSubnav />
      {overview.invoices.length === 0 ? (
        <EmptyState title="No invoices" description="Record a contractor invoice after an engagement exists." />
      ) : (
        <InvoiceTable items={overview.invoices} />
      )}
    </div>
  );
}
