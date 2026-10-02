import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ClaimsSubnav } from "@/components/claims/subnav";
import { ClaimTable } from "@/components/claims/claim-table";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadClaimListItems } from "@/lib/claims/query";

export const metadata = { title: "Pending claims" };

export default async function PendingClaimsPage() {
  const user = await requirePermissionOrRedirect("claims.view");
  const items = await loadClaimListItems(user.organization.id);
  const pending = items.filter((item) => item.claim.status === "SUBMITTED" || item.claim.status === "PENDING_APPROVAL");

  return (
    <div>
      <PageHeader title="Pending" description="Claims submitted and waiting on one or more approval steps." />
      <ClaimsSubnav />
      {pending.length === 0 ? (
        <EmptyState title="Nothing pending" description="Submitted claims will appear here for approval." />
      ) : (
        <ClaimTable items={pending} />
      )}
    </div>
  );
}
