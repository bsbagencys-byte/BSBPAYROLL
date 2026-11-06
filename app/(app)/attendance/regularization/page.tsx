import { PageHeader } from "@/components/layout/app-shell";
import { AttendanceSubnav } from "@/components/attendance/subnav";
import { RegularizationBadge } from "@/components/attendance/status-badge";
import { RegularizationDecisionForm, RegularizationForm } from "@/components/attendance/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadRegularizationPage } from "@/lib/attendance/service";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Attendance regularization" };

export default async function AttendanceRegularizationPage() {
  const user = await requirePermissionOrRedirect("attendance.view");
  const data = await loadRegularizationPage(user.organization.id);
  const canSubmit = hasPermission(user, "attendance.regularize");
  const canDecide = hasPermission(user, "attendance.manage");

  return (
    <div>
      <PageHeader title="Regularization" description="Approved corrections recalculate the day. Original punches stay unchanged." />
      <AttendanceSubnav />
      {canSubmit ? (
        <div className="mb-4">
          <RegularizationForm employees={data.employees} />
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {data.rows.length === 0 ? (
            <p className="text-sm text-slate-500">No regularization requests.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.rows.map((item) => (
                <div key={item.row.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <div>
                    <p className="text-sm font-medium">
                      {item.employeeCode} {item.employeeName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateOnly(item.row.work_date)} · {item.row.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RegularizationBadge status={item.row.status} />
                    {canDecide && item.row.status === "PENDING" ? <RegularizationDecisionForm id={item.row.id} /> : null}
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
