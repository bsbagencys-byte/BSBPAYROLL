import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ContractorsSubnav } from "@/components/contractors/subnav";
import { InvoiceTable } from "@/components/contractors/invoice-table";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadContractorsOverview } from "@/lib/exits/query";

export const metadata = { title: "Contractor invoice approvals" };

export default async function InvoiceApprovalsPage() {
  const user = await requirePermissionOrRedirect("contractors.view");
  const overview = await loadContractorsOverview(user.organization.id, user.organization.timezone);
  return (
    <div>
      <PageHeader title="Approvals" description="Submitted contractor invoices waiting for finance review." />
      <ContractorsSubnav />
      {overview.pendingInvoices.length === 0 ? (
        <EmptyState title="Nothing waiting" description="Submitted invoices will appear here." />
      ) : (
        <InvoiceTable items={overview.pendingInvoices} />
      )}
    </div>
  );
}
