import { PageHeader } from "@/components/layout/app-shell";
import { AttendanceSubnav } from "@/components/attendance/subnav";
import { AttendanceDayBadge } from "@/components/attendance/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadAttendanceRegister } from "@/lib/attendance/service";
import { todayInZone } from "@/lib/leave/dates";
import { formatDateOnly, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Daily attendance" };

export default async function AttendanceDailyPage() {
  const user = await requirePermissionOrRedirect("attendance.view");
  const today = todayInZone(user.organization.timezone);
  const rows = await loadAttendanceRegister(user.organization.id, today, today);

  return (
    <div>
      <PageHeader title="Daily attendance" description="Calculated first IN / last OUT for today. Duplicate punches stay idempotent." />
      <AttendanceSubnav />
      <Card>
        <CardHeader>
          <CardTitle>{formatDateOnly(today)}</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">No calculated days for today.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {rows.map((row) => (
                <div key={row.employeeId} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">
                      {row.employeeCode} {row.employeeName}
                    </p>
                    <p className="text-xs text-slate-500">
                      IN {row.firstIn ? formatDateTime(row.firstIn) : "—"} · OUT {row.lastOut ? formatDateTime(row.lastOut) : "—"} · worked {row.workedMinutes}m
                    </p>
                  </div>
                  <AttendanceDayBadge status={row.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
