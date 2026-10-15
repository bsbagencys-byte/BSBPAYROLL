import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { SettlementsSubnav } from "@/components/settlements/subnav";
import { SettlementTable } from "@/components/settlements/settlement-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadSettlementsOverview } from "@/lib/exits/query";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Settlements" };

export default async function SettlementsPage() {
  const user = await requirePermissionOrRedirect("settlements.view");
  const overview = await loadSettlementsOverview(user.organization.id, user.organization.timezone);
  const canCreate = hasPermission(user, "settlements.calculate");

  return (
    <div>
      <PageHeader
        title="Full & final settlements"
        description="Server-side calculation from salary, leave, loans, claims and verified statutory versions. Finalized rows are immutable."
        actions={
          canCreate ? (
            <Link href="/settlements/new">
              <Button>New settlement</Button>
            </Link>
          ) : null
        }
      />
      <SettlementsSubnav />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Draft / exceptions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.drafts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Under review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.review.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Payable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.payable.length}</p>
            <p className="text-xs text-slate-500">
              {formatCurrency(overview.payable.reduce((sum, item) => sum + item.settlement.net_payable - item.settlement.paid_amount, 0))} outstanding
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Ready exits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.readyExits.length}</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        {overview.settlements.length === 0 ? (
          <EmptyState title="No settlements" description="Create an F&F after required clearance is complete." />
        ) : (
          <SettlementTable items={overview.settlements} />
        )}
      </div>
    </div>
  );
}
