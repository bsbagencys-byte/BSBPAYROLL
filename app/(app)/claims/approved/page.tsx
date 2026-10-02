import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ClaimsSubnav } from "@/components/claims/subnav";
import { ClaimTable } from "@/components/claims/claim-table";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadClaimListItems } from "@/lib/claims/query";

export const metadata = { title: "Approved claims" };

export default async function ApprovedClaimsPage() {
  const user = await requirePermissionOrRedirect("claims.view");
  const items = await loadClaimListItems(user.organization.id);
  const approved = items.filter((item) => item.claim.status === "APPROVED");

  return (
    <div>
      <PageHeader title="Approved" description="Claims approved and ready for inclusion in a future payroll run." />
      <ClaimsSubnav />
      {approved.length === 0 ? (
        <EmptyState title="No approved claims" description="Approved claims will be listed here." />
      ) : (
        <ClaimTable items={approved} />
      )}
    </div>
  );
}
