import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import { loadSelfAttendance } from "@/lib/ess/query";
import { todayInZone } from "@/lib/leave/dates";
import { ATTENDANCE_DAY_STATUS_LABELS } from "@/lib/constants";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "My attendance" };

function monthBounds(today: string) {
  const [year, month] = today.split("-").map(Number);
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export default async function MyAttendancePage() {
  const user = await requirePermissionOrRedirect("self.view");
  const identity = await resolveSelfEmployee(user);
  if (!identity) return null;

  const today = todayInZone(user.organization.timezone);
  let [year, month] = today.split("-").map(Number);
  const bounds = monthBounds(today);
  let days = await loadSelfAttendance(user.organization.id, identity.employee.id, bounds.from, bounds.to);
  if (days.length === 0) {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    const fallbackFrom = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const fallbackTo = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    days = await loadSelfAttendance(user.organization.id, identity.employee.id, fallbackFrom, fallbackTo);
  }

  const present = days.filter((item) => item.status === "PRESENT").length;
  const leave = days.filter((item) => ["PAID_LEAVE", "UNPAID_LEAVE", "HALF_DAY_LEAVE", "COMP_OFF"].includes(item.status)).length;
  const absent = days.filter((item) => item.status === "ABSENT").length;

  return (
    <div>
      <PageHeader
        title="My attendance"
        description="Attendance days written from approved leave and (once Phase 4 ships) biometric processing. Raw punches are never edited here."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary title="Present" value={present} />
        <Summary title="Leave days" value={leave} />
        <Summary title="Absent" value={absent} />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Day-wise records</CardTitle>
        </CardHeader>
        <CardContent>
          {days.length === 0 ? (
            <p className="text-sm text-slate-500">No attendance days recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {days.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{formatDateOnly(item.work_date)}</p>
                    <p className="text-xs text-slate-500">
                      {item.session !== "FULL" ? `${item.session.replaceAll("_", " ").toLowerCase()} · ` : ""}
                      source: {item.source.toLowerCase()}
                    </p>
                  </div>
                  <Badge variant="muted">{ATTENDANCE_DAY_STATUS_LABELS[item.status]}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
