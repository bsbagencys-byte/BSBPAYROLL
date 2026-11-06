import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { AttendanceSubnav } from "@/components/attendance/subnav";
import { AttendanceDayBadge } from "@/components/attendance/status-badge";
import { RecalculateForm } from "@/components/attendance/forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadAttendanceOverview } from "@/lib/attendance/service";
import { loadOrgCatalog } from "@/lib/org-data";
import { addDays } from "@/lib/leave/dates";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const user = await requirePermissionOrRedirect("attendance.view");
  const [overview, catalog] = await Promise.all([
    loadAttendanceOverview(user.organization.id, user.organization.timezone),
    loadOrgCatalog(user.organization.id),
  ]);
  const canManage = hasPermission(user, "attendance.manage");

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Punch pairing, shift rules and daily results. Raw biometric punches are never altered."
        actions={
          <Link href="/attendance/regularization">
            <Button variant="outline">Regularization</Button>
          </Link>
        }
      />
      <AttendanceSubnav />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="Present today" value={overview.present} hint={`${overview.employees} active employees`} />
        <Stat title="Absent today" value={overview.absent} hint="Working-day absences" />
        <Stat title="Open exceptions" value={overview.openExceptions} hint="Missing IN/OUT, late, early exit" />
        <Stat title="Pending regularization" value={overview.pendingRegularizations} hint={`${overview.todayPunches} punches today`} />
      </div>
      {canManage ? (
        <div className="mt-4">
          <RecalculateForm defaultFrom={addDays(overview.today, -6)} defaultTo={overview.today} employees={catalog.employees} />
        </div>
      ) : null}
      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent days</CardTitle>
          <Link href="/attendance/register" className="text-sm text-brand-700 hover:underline">
            Register
          </Link>
        </CardHeader>
        <CardContent>
          {overview.recent.length === 0 ? (
            <p className="text-sm text-slate-500">No calculated days yet. Recalculate from punches or wait for ingest.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {overview.recent.map((row) => {
                const employee = catalog.employees.find((item) => item.id === row.employee_id);
                return (
                  <div key={row.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{employee?.display_name ?? "Unknown"}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateOnly(row.work_date)} · {row.source.toLowerCase()}
                      </p>
                    </div>
                    <AttendanceDayBadge status={row.status} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ title, value, hint }: { title: string; value: number; hint: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  );
}
