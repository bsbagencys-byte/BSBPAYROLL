import Link from "next/link";
import { Palmtree } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { LeaveSubnav } from "@/components/leave/subnav";
import { LeaveStatusBadge } from "@/components/leave/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadLeaveOverview } from "@/lib/leave/query";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Leave" };

export default async function LeavePage() {
  const user = await requirePermissionOrRedirect("leave.view");
  const overview = await loadLeaveOverview(user.organization.id, user.organization.timezone);
  const canRequest = hasPermission(user, "leave.request");

  return (
    <div>
      <PageHeader
        title="Leave"
        description="Configurable leave types, balances, holidays and approvals. Approved leave writes attendance days without replacing punch history."
        actions={
          canRequest ? (
            <Link href="/leave/requests">
              <Button>Apply leave</Button>
            </Link>
          ) : null
        }
      />
      <LeaveSubnav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.pendingCount}</p>
            <p className="text-xs text-slate-500">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.approvedCount}</p>
            <p className="text-xs text-slate-500">This organisation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">On leave days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.onLeaveCount}</p>
            <p className="text-xs text-slate-500">Attendance-day marks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.holidays.length}</p>
            <p className="text-xs text-slate-500">Do not become absent</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent requests</CardTitle>
            <Link href="/leave/requests" className="text-sm text-brand-700 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {overview.requests.length === 0 ? (
              <p className="text-sm text-slate-500">No leave requests yet.</p>
            ) : (
              <div className="space-y-3">
                {overview.requests.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="font-medium">{item.employeeName}</p>
                      <p className="text-xs text-slate-500">
                        {item.leaveTypeCode} · {formatDateOnly(item.fromDate)}
                        {item.fromDate !== item.toDate ? ` – ${formatDateOnly(item.toDate)}` : ""} · {item.days}d
                      </p>
                    </div>
                    <LeaveStatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Low balances</CardTitle>
            <Link href="/leave/balances" className="text-sm text-brand-700 hover:underline">
              Balances
            </Link>
          </CardHeader>
          <CardContent>
            {overview.lowBalances.length === 0 ? (
              <p className="text-sm text-slate-500">No low balances.</p>
            ) : (
              <div className="space-y-3">
                {overview.lowBalances.map((item) => (
                  <div key={`${item.employeeId}-${item.leaveTypeId}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="font-medium">{item.employeeName}</p>
                      <p className="text-xs text-slate-500">{item.leaveTypeName}</p>
                    </div>
                    <Badge variant={item.available <= 0 ? "danger" : "warning"}>{item.available}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <Palmtree className="h-3.5 w-3.5" />
        Weekly off is {user.organization.weekly_off}. Holidays and weekly offs are skipped unless a policy counts them.
      </p>
    </div>
  );
}
