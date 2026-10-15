import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ExitsSubnav } from "@/components/exits/subnav";
import { ExitTable } from "@/components/exits/exit-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadExitsOverview } from "@/lib/exits/query";

export const metadata = { title: "Employee exits" };

export default async function ExitsPage() {
  const user = await requirePermissionOrRedirect("exits.view");
  const overview = await loadExitsOverview(user.organization.id, user.organization.timezone);
  const canCreate = hasPermission(user, "exits.create");

  return (
    <div>
      <PageHeader
        title="Employee exits"
        description="Notice, clearance and last working date. Settlements are calculated separately after required clearance."
        actions={
          canCreate ? (
            <Link href="/employees/exits/new">
              <Button>New exit</Button>
            </Link>
          ) : null
        }
      />
      <ExitsSubnav />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Open exits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.pending.length}</p>
            <p className="text-xs text-slate-500">Submitted through settlement pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">In notice</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.inNotice.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Clearance pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.clearance.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Ready for F&F</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.ready.length}</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        {overview.exits.length === 0 ? (
          <EmptyState title="No exits" description="Record a resignation, termination or other exit to start clearance." />
        ) : (
          <ExitTable items={overview.exits} />
        )}
      </div>
    </div>
  );
}
