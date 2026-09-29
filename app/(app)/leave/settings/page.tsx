import { PageHeader } from "@/components/layout/app-shell";
import { LeaveSubnav } from "@/components/leave/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";

export const metadata = { title: "Leave settings" };

export default async function LeaveSettingsPage() {
  const user = await requirePermissionOrRedirect("leave.policy.manage");
  return (
    <div>
      <PageHeader title="Leave settings" description="Organisation defaults used by the leave engine. Weekly off comes from company settings." />
      <LeaveSubnav />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly off</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <p className="text-lg font-semibold text-slate-900">{user.organization.weekly_off}</p>
            <p className="mt-2">Change this under Settings / Company. Leave day calculation skips this weekday unless a policy counts weekly off.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Timezone</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <p className="text-lg font-semibold text-slate-900">{user.organization.timezone}</p>
            <p className="mt-2">Today, backdated checks and the calendar month use this timezone.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Attendance bridge</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Approved leave writes attendance_days as PAID_LEAVE, UNPAID_LEAVE, HALF_DAY_LEAVE or COMP_OFF. Cancel restores the previous status. Punch history is not erased.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ledger</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Balances never overwrite silently. ALLOCATED, ACCRUED, USED, PENDING, CANCELLED, ADJUSTMENT and COMP_OFF entries are stored on leave_balance_transactions.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
