import { PageHeader } from "@/components/layout/app-shell";
import { LeaveSubnav } from "@/components/leave/subnav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { listHolidays, listRequests } from "@/lib/leave/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { addDays, eachDate, todayInZone, weekdayName } from "@/lib/leave/dates";
import { HOLIDAY_TYPE_LABELS } from "@/lib/constants";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Leave calendar" };

export default async function LeaveCalendarPage() {
  const user = await requirePermissionOrRedirect("leave.view");
  const today = todayInZone(user.organization.timezone);
  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonthStart =
    today.slice(5, 7) === "12" ? `${Number(today.slice(0, 4)) + 1}-01-01` : `${today.slice(0, 4)}-${String(Number(today.slice(5, 7)) + 1).padStart(2, "0")}-01`;
  const monthEnd = addDays(nextMonthStart, -1);
  const [holidays, requests, catalog] = await Promise.all([
    listHolidays(user.organization.id),
    listRequests(user.organization.id),
    loadOrgCatalog(user.organization.id),
  ]);
  const dates = eachDate(monthStart, monthEnd);
  const approved = requests.filter((item) => item.status === "APPROVED");

  return (
    <div>
      <PageHeader title="Calendar" description={`${formatDateOnly(monthStart)} – ${formatDateOnly(monthEnd)}. Weekly off: ${user.organization.weekly_off}.`} />
      <LeaveSubnav />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dates.map((date) => {
          const holiday = holidays.find((item) => item.holiday_date === date && item.status === "ACTIVE");
          const off = weekdayName(date) === user.organization.weekly_off;
          const onLeave = approved.filter((item) => item.from_date <= date && item.to_date >= date);
          return (
            <Card key={date} className={holiday || off ? "bg-slate-50" : undefined}>
              <CardHeader>
                <CardTitle className="text-sm">{formatDateOnly(date)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {off ? <Badge variant="muted">Weekly off</Badge> : null}
                {holiday ? <Badge>{HOLIDAY_TYPE_LABELS[holiday.holiday_type]} · {holiday.name}</Badge> : null}
                {onLeave.length ? (
                  <div className="space-y-1">
                    {onLeave.slice(0, 3).map((item) => (
                      <p key={item.id} className="text-xs text-slate-600">
                        {catalog.employees.find((row) => row.id === item.employee_id)?.display_name ?? "Employee"}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No leave</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
