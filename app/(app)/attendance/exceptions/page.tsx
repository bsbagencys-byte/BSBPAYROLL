import { PageHeader } from "@/components/layout/app-shell";
import { AttendanceSubnav } from "@/components/attendance/subnav";
import { ExceptionBadge, ExceptionCodeBadge } from "@/components/attendance/status-badge";
import { DismissExceptionForm } from "@/components/attendance/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadExceptionsPage } from "@/lib/attendance/service";
import { addDays, todayInZone } from "@/lib/leave/dates";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Attendance exceptions" };

export default async function AttendanceExceptionsPage() {
  const user = await requirePermissionOrRedirect("attendance.view");
  const to = todayInZone(user.organization.timezone);
  const from = addDays(to, -13);
  const rows = await loadExceptionsPage(user.organization.id, from, to);
  const canManage = hasPermission(user, "attendance.manage");

  return (
    <div>
      <PageHeader title="Exceptions" description="Missing punches, absences, late and early exit. Unmapped device users stay on Biometric." />
      <AttendanceSubnav />
      <Card>
        <CardHeader>
          <CardTitle>Open and recent</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">No exceptions in this window.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {rows.map((item) => (
                <div key={item.row.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="text-sm font-medium">
                      {item.employeeCode} {item.employeeName}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateOnly(item.row.work_date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExceptionCodeBadge code={item.row.code} />
                    <ExceptionBadge status={item.row.status} />
                    {canManage && item.row.status === "OPEN" ? <DismissExceptionForm id={item.row.id} /> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
