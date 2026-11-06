import { PageHeader } from "@/components/layout/app-shell";
import { AttendanceSubnav } from "@/components/attendance/subnav";
import { ShiftAssignForm, ShiftForm } from "@/components/attendance/forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadShiftsPage } from "@/lib/attendance/service";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Shifts" };

export default async function AttendanceShiftsPage() {
  const user = await requirePermissionOrRedirect("attendance.view");
  const data = await loadShiftsPage(user.organization.id);
  const canManage = hasPermission(user, "attendance.manage");

  return (
    <div>
      <PageHeader title="Shifts" description="Configurable start/end, break and overnight. Assignments are effective-dated." />
      <AttendanceSubnav />
      {canManage ? (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <ShiftForm />
          <ShiftAssignForm employees={data.employees} shifts={data.shifts} />
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            {data.shifts.length === 0 ? (
              <p className="text-sm text-slate-500">No shifts configured.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.shifts.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{shift.name}</p>
                      <p className="text-xs text-slate-500">
                        {shift.start_time}–{shift.end_time} · break {shift.break_minutes}m
                        {shift.overnight ? " · overnight" : ""}
                      </p>
                    </div>
                    <Badge variant={shift.status === "ACTIVE" ? "success" : "muted"}>{shift.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {data.assignments.length === 0 ? (
              <p className="text-sm text-slate-500">No assignments. Employees use the default active shift.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.assignments.map((row) => {
                  const employee = data.employees.find((item) => item.id === row.employee_id);
                  const shift = data.shifts.find((item) => item.id === row.shift_id);
                  return (
                    <div key={row.id} className="py-2 text-sm">
                      <p className="font-medium">{employee?.display_name ?? "Unknown"}</p>
                      <p className="text-xs text-slate-500">
                        {shift?.name ?? "Shift"} · from {formatDateOnly(row.effective_from)}
                        {row.effective_to ? ` to ${formatDateOnly(row.effective_to)}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
