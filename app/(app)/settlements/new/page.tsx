import { PageHeader } from "@/components/layout/app-shell";
import { SettlementsSubnav } from "@/components/settlements/subnav";
import { SettlementCreateForm } from "@/components/settlements/settlement-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadSettlementsOverview } from "@/lib/exits/query";

export const metadata = { title: "New settlement" };

export default async function NewSettlementPage() {
  const user = await requirePermissionOrRedirect("settlements.calculate");
  const overview = await loadSettlementsOverview(user.organization.id, user.organization.timezone);
  return (
    <div>
      <PageHeader title="New settlement" description="Pick a clearance-complete exit. Amounts are calculated on the server." />
      <SettlementsSubnav />
      <SettlementCreateForm exits={overview.readyExits} />
    </div>
  );
}
