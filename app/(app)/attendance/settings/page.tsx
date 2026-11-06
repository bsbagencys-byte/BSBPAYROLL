import { PageHeader } from "@/components/layout/app-shell";
import { AttendanceSubnav } from "@/components/attendance/subnav";
import { AttendancePolicyForm } from "@/components/attendance/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadSettingsPage } from "@/lib/attendance/service";

export const metadata = { title: "Attendance settings" };

export default async function AttendanceSettingsPage() {
  const user = await requirePermissionOrRedirect("attendance.view");
  const data = await loadSettingsPage(user.organization.id);
  const canManage = hasPermission(user, "attendance.manage");

  return (
    <div>
      <PageHeader title="Attendance settings" description="Grace, thresholds, overtime rounding and punch pairing. Weekly off comes from company settings." />
      <AttendanceSubnav />
      {canManage ? (
        <AttendancePolicyForm policy={data.policy} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>Grace: {data.policy?.grace_minutes ?? 15} minutes</p>
            <p>Break: {data.policy?.break_minutes ?? 60} minutes</p>
            <p>Full day: {data.policy?.full_day_minutes ?? 480} minutes</p>
            <p>Pairing: {data.policy?.punch_pairing ?? "FIRST_LAST"}</p>
          </CardContent>
        </Card>
      )}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly off</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <p className="text-lg font-semibold text-slate-900">{user.organization.weekly_off}</p>
            <p className="mt-2">Weekly offs and holidays are not marked absent unless the employee punches.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payroll lock</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Days inside FINALIZED, LOCKED, PROCESSED, PAID or CANCELLED payroll periods cannot be silently recalculated.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
