import { PageHeader } from "@/components/layout/app-shell";
import { AttendanceSubnav } from "@/components/attendance/subnav";
import { AttendanceDayBadge } from "@/components/attendance/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadLiveAttendance } from "@/lib/attendance/service";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Live attendance" };

export default async function AttendanceLivePage() {
  const user = await requirePermissionOrRedirect("attendance.view");
  const rows = await loadLiveAttendance(user.organization.id, user.organization.timezone);

  return (
    <div>
      <PageHeader title="Live attendance" description="Today's last punch and calculated day status. Hardware ingest remains Phase 3." />
      <AttendanceSubnav />
      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">No active employees.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {rows.map((item) => (
                <div key={item.employee.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{item.employee.display_name}</p>
                    <p className="text-xs text-slate-500">
                      {item.employee.employee_code} · {item.shift?.name ?? "Default shift"}
                      {item.lastPunch ? ` · last ${item.lastPunch.direction} ${formatDateTime(item.lastPunch.punched_at)}` : " · no punch today"}
                    </p>
                  </div>
                  {item.day ? <AttendanceDayBadge status={item.day.status} /> : <span className="text-xs text-slate-500">Uncalculated</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
