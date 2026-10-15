import { PageHeader } from "@/components/layout/app-shell";
import { ContractorsSubnav } from "@/components/contractors/subnav";
import { ContractorForm } from "@/components/contractors/contractor-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadOrgCatalog } from "@/lib/org-data";

export const metadata = { title: "New contractor" };

export default async function NewContractorPage() {
  const user = await requirePermissionOrRedirect("contractors.manage");
  const catalog = await loadOrgCatalog(user.organization.id);
  return (
    <div>
      <PageHeader title="New contractor" description="Legal identity, tax identifiers and payout bank details." />
      <ContractorsSubnav />
      <ContractorForm employees={catalog.employees} />
    </div>
  );
}
