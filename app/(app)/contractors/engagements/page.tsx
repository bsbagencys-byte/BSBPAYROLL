import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ContractorsSubnav } from "@/components/contractors/subnav";
import { EngagementForm } from "@/components/contractors/engagement-form";
import { EngagementTable } from "@/components/contractors/engagement-table";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadContractorsOverview } from "@/lib/exits/query";

export const metadata = { title: "Contractor engagements" };

export default async function EngagementsPage() {
  const user = await requirePermissionOrRedirect("contractors.view");
  const overview = await loadContractorsOverview(user.organization.id, user.organization.timezone);
  const canManage = hasPermission(user, "contractors.engagements.manage");

  return (
    <div>
      <PageHeader title="Engagements" description="Scope, fee and dates. Expired engagements are marked automatically." />
      <ContractorsSubnav />
      {canManage ? (
        <div className="mb-6">
          <EngagementForm contractors={overview.contractors.map((item) => item.contractor)} />
        </div>
      ) : null}
      {overview.engagements.length === 0 ? (
        <EmptyState title="No engagements" description="Link a contractor to a dated engagement before invoicing." />
      ) : (
        <EngagementTable items={overview.engagements} />
      )}
    </div>
  );
}
