import { PageHeader } from "@/components/layout/app-shell";
import { AdminSupportSubnav } from "@/components/onboarding/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { loadOpsSnapshot } from "@/lib/onboarding/service";

export const metadata = { title: "Platform operations" };

export default async function AdminOpsPage() {
  await requirePlatformAdmin();
  const snapshot = await loadOpsSnapshot();

  return (
    <div>
      <PageHeader
        title="Platform operations"
        description="SUPER_ADMIN only. Counts are from stored data. This is not a live impersonation console."
      />
      <AdminSupportSubnav />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Organizations</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{snapshot.organizations}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Employees</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{snapshot.employees}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Open tickets</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{snapshot.openTickets}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">SLA breached</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{snapshot.breachedTickets}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Ready exports</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{snapshot.readyExports}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Failed jobs</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{snapshot.failedJobs}</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
