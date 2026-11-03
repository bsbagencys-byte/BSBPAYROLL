import { PageHeader } from "@/components/layout/app-shell";
import { SelfVerifyForm } from "@/components/smart-attendance/forms";
import { RiskBadge, SmartEventBadge, TrustedDeviceBadge } from "@/components/smart-attendance/status-badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import { loadEmployeeSmart } from "@/lib/smart-attendance/service";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Smart check-in" };

export default async function MySmartAttendancePage() {
  const user = await requirePermissionOrRedirect("attendance.smart.view");
  const identity = await resolveSelfEmployee(user);
  if (!identity) return null;
  const data = await loadEmployeeSmart(user.organization.id, identity.employee.id);

  return (
    <div>
      <PageHeader
        title="Smart check-in"
        description="Location is collected only for attendance evidence. The phone does not decide whether a punch is valid."
      />
      <Alert variant="info" className="mb-4">
        Precise location is used for geofence or QR events. Continuous tracking is not enabled
        {data.settings.background_location_enabled ? " except when this organization allows background location." : "."}
        {" "}Mock location and Play Integrity are risk signals, not proof of fraud.
      </Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Assigned workplaces</CardTitle></CardHeader>
          <CardContent>
            {data.workplaces.length === 0 ? (
              <p className="text-sm text-slate-500">No active workplaces.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.workplaces.map((row) => (
                  <li key={row.id}>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-slate-500">Radius {row.radius_meters}m</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>My devices</CardTitle></CardHeader>
          <CardContent>
            {data.devices.length === 0 ? (
              <p className="text-sm text-slate-500">Register a trusted Android device from the mobile app. Unauthorized devices are rejected.</p>
            ) : (
              <div className="space-y-2">
                {data.devices.map((row) => (
                  <div key={row.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="text-sm font-medium">{row.device_model}</p>
                      <p className="text-xs text-slate-500">{row.os_version}</p>
                    </div>
                    <TrustedDeviceBadge status={row.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle>My events</CardTitle></CardHeader>
        <CardContent>
          {data.events.length === 0 ? (
            <p className="text-sm text-slate-500">No smart events yet. Use the Android app for geofence or dynamic QR.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.events.map((event) => (
                <div key={event.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{event.direction} · {event.source}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(event.occurred_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      <RiskBadge risk={event.risk_level} />
                      <SmartEventBadge status={event.status} />
                    </div>
                  </div>
                  {event.status === "PENDING_VERIFICATION" ? (
                    <div className="mt-2"><SelfVerifyForm eventId={event.id} /></div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
