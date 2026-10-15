import { PageHeader } from "@/components/layout/app-shell";
import { ContractorsSubnav } from "@/components/contractors/subnav";
import { InvoiceForm } from "@/components/contractors/invoice-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadExitsCatalog } from "@/lib/exits/query";

export const metadata = { title: "New contractor invoice" };

export default async function NewInvoicePage() {
  const user = await requirePermissionOrRedirect("contractors.invoices.create");
  const catalog = await loadExitsCatalog(user.organization.id);
  return (
    <div>
      <PageHeader title="New invoice" description="Withholding uses the verified TDS rule version effective on the invoice date." />
      <ContractorsSubnav />
      <InvoiceForm contractors={catalog.contractors} engagements={catalog.engagements} />
    </div>
  );
}
