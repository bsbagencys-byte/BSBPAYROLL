import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ClaimsSubnav } from "@/components/claims/subnav";
import { ClaimTable } from "@/components/claims/claim-table";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadClaimListItems } from "@/lib/claims/query";

export const metadata = { title: "Claim history" };

export default async function ClaimHistoryPage() {
  const user = await requirePermissionOrRedirect("claims.view");
  const items = await loadClaimListItems(user.organization.id);

  return (
    <div>
      <PageHeader title="History" description="Every claim across the organisation." />
      <ClaimsSubnav />
      {items.length === 0 ? (
        <EmptyState title="No claims" description="Claims raised by employees will appear here." />
      ) : (
        <ClaimTable items={items} />
      )}
    </div>
  );
}
