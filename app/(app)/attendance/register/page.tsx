import { PageHeader } from "@/components/layout/app-shell";
import { AttendanceSubnav } from "@/components/attendance/subnav";
import { AttendanceDayBadge } from "@/components/attendance/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadAttendanceRegister } from "@/lib/attendance/service";
import { addDays, todayInZone } from "@/lib/leave/dates";
import { formatDateOnly, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Attendance register" };

export default async function AttendanceRegisterPage() {
  const user = await requirePermissionOrRedirect("attendance.view");
  const to = todayInZone(user.organization.timezone);
  const from = addDays(to, -13);
  const rows = await loadAttendanceRegister(user.organization.id, from, to);

  return (
    <div>
      <PageHeader title="Attendance register" description="One calculated result per employee and work date. CSV is available from Reports." />
      <AttendanceSubnav />
      <Card>
        <CardHeader>
          <CardTitle>
            {formatDateOnly(from)} – {formatDateOnly(to)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">No attendance days in this window.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-slate-500">
                    <th className="py-2">Date</th>
                    <th>Employee</th>
                    <th>Status</th>
                    <th>First IN</th>
                    <th>Last OUT</th>
                    <th>Worked</th>
                    <th>Late</th>
                    <th>OT</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.employeeId}-${row.workDate}`} className="border-b border-slate-100">
                      <td className="py-2">{formatDateOnly(row.workDate)}</td>
                      <td>
                        {row.employeeCode} {row.employeeName}
                      </td>
                      <td>
                        <AttendanceDayBadge status={row.status} />
                      </td>
                      <td>{row.firstIn ? formatDateTime(row.firstIn) : "—"}</td>
                      <td>{row.lastOut ? formatDateTime(row.lastOut) : "—"}</td>
                      <td>{row.workedMinutes}m</td>
                      <td>{row.lateMinutes}m</td>
                      <td>{row.otMinutes}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
