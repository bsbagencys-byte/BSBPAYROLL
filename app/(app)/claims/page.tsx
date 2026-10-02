import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { ClaimsSubnav } from "@/components/claims/subnav";
import { ClaimTable } from "@/components/claims/claim-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadClaimsOverview } from "@/lib/claims/query";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Claims" };

export default async function ClaimsPage() {
  const user = await requirePermissionOrRedirect("claims.view");
  const overview = await loadClaimsOverview(user.organization.id, user.organization.timezone);
  const canCreate = hasPermission(user, "claims.create");

  return (
    <div>
      <PageHeader
        title="Claims"
        description="Reimbursements and TA/DA claims with policy validation and configurable approval workflow. Payroll inclusion is a later phase."
        actions={
          canCreate ? (
            <Link href="/claims/new">
              <Button>New claim</Button>
            </Link>
          ) : null
        }
      />
      <ClaimsSubnav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Awaiting approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.pending.length}</p>
            <p className="text-xs text-slate-500">{formatCurrency(overview.pendingAmount)} claimed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Approved this month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.approved.length}</p>
            <p className="text-xs text-slate-500">{formatCurrency(overview.approvedAmount)} approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.drafts.length}</p>
            <p className="text-xs text-slate-500">Not submitted yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Claim types</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.types.filter((item) => item.status === "ACTIVE").length}</p>
            <p className="text-xs text-slate-500">{overview.policies.length} policies</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Recent claims</h2>
          <Link href="/claims/history" className="text-sm text-brand-700 hover:underline">
            View all
          </Link>
        </div>
        {overview.recent.length === 0 ? (
          <p className="text-sm text-slate-500">No claims yet.</p>
        ) : (
          <ClaimTable items={overview.recent} />
        )}
      </div>
    </div>
  );
}
