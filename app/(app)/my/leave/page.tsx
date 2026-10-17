import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { EssStatusBadge } from "@/components/ess/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import { loadSelfLeave } from "@/lib/ess/query";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "My leave" };

export default async function MyLeavePage() {
  const user = await requirePermissionOrRedirect("self.view");
  const identity = await resolveSelfEmployee(user);
  if (!identity) return null;

  const data = await loadSelfLeave(user.organization.id, identity.employee.id, user.organization.timezone);
  const canRequest = hasPermission(user, "leave.request");

  return (
    <div>
      <PageHeader
        title="My leave"
        description="Balances and requests use the existing leave service. Applying reuses the standard leave workflow and approvals."
        actions={
          canRequest ? (
            <Link href="/leave/requests">
              <Button>Apply leave</Button>
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.balances.length === 0 ? (
          <Card className="sm:col-span-2 xl:col-span-3">
            <CardContent className="p-6 text-sm text-slate-500">No leave balances allocated yet.</CardContent>
          </Card>
        ) : (
          data.balances.map((item) => (
            <Card key={`${item.leaveTypeId}-${item.year}`}>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-500">{item.leaveTypeName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{item.available}</p>
                <p className="text-xs text-slate-500">
                  available · used {item.used} · {item.year}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My leave requests</CardTitle>
          </CardHeader>
          <CardContent>
            {data.requests.length === 0 ? (
              <p className="text-sm text-slate-500">No leave requests yet.</p>
            ) : (
              <div className="space-y-3">
                {data.requests.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="text-sm font-medium">
                        {data.types.find((type) => type.id === item.leave_type_id)?.name ?? "Leave"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateOnly(item.from_date)}
                        {item.to_date !== item.from_date ? ` – ${formatDateOnly(item.to_date)}` : ""} · {item.days}d
                      </p>
                    </div>
                    <EssStatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Holiday calendar</CardTitle>
          </CardHeader>
          <CardContent>
            {data.holidays.length === 0 ? (
              <p className="text-sm text-slate-500">No holidays configured.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {data.holidays
                  .slice()
                  .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <span>{item.name}</span>
                      <span className="flex items-center gap-2">
                        <Badge variant="muted">{item.holiday_type?.toLowerCase() ?? "holiday"}</Badge>
                        {formatDateOnly(item.holiday_date)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
