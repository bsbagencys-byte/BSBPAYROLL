import { PageHeader } from "@/components/layout/app-shell";
import { CreateQrForm } from "@/components/smart-attendance/forms";
import { RiskBadge, SmartEventBadge } from "@/components/smart-attendance/status-badge";
import { SmartAttendanceSubnav } from "@/components/smart-attendance/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadSmartDashboard } from "@/lib/smart-attendance/service";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Smart Attendance" };

export default async function SmartAttendancePage() {
  const user = await requirePermissionOrRedirect("attendance.smart.view");
  const data = await loadSmartDashboard(user.organization.id);
  const canManage = hasPermission(user, "attendance.smart.manage");

  return (
    <div>
      <PageHeader
        title="Smart Attendance"
        description="Geofence overlay that feeds the existing punch pipeline. The app never decides validity. Phase 4 attendance calculation is not started."
      />
      <SmartAttendanceSubnav />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="Accepted" value={data.counts.accepted} hint="Written to attendance_punches" />
        <Stat title="Pending review" value={data.counts.suspicious} hint="HR must decide" />
        <Stat title="Pending verification" value={data.counts.pending} hint="Extra check required" />
        <Stat title="Trusted devices" value={data.counts.activeDevices} hint={`${data.counts.pendingDevices} pending`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>Status: {data.settings.enabled ? "Enabled" : "Disabled"}</p>
            <p>Default radius: {data.settings.geofence_radius_meters}m (organization-configured, not hard-coded)</p>
            <p>Trusted device required: {data.settings.require_trusted_device ? "Yes" : "No"}</p>
            <p>Background location: {data.settings.background_location_enabled ? "Allowed" : "Off"}</p>
            <p>Face matching: not implemented. Provider is unconfigured.</p>
            <p>QR fallback: {data.settings.qr_fallback_enabled ? `TTL ${data.settings.qr_ttl_seconds}s` : "Disabled"}</p>
          </CardContent>
        </Card>
        {canManage ? <CreateQrForm workplaces={data.workplaces.filter((row) => row.status === "ACTIVE")} /> : (
          <Card>
            <CardHeader><CardTitle>Workplaces</CardTitle></CardHeader>
            <CardContent>
              {data.workplaces.length === 0 ? (
                <p className="text-sm text-slate-500">No workplaces configured.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.workplaces.map((row) => (
                    <li key={row.id}>{row.name} · {row.radius_meters}m</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
        </CardHeader>
        <CardContent>
          {data.events.length === 0 ? (
            <p className="text-sm text-slate-500">No smart attendance events yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.events.slice(0, 8).map((event) => (
                <div key={event.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{event.direction} · {event.source}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(event.occurred_at)} · {event.risk_reasons[0] ?? "No extra signals"}</p>
                  </div>
                  <div className="flex gap-2">
                    <RiskBadge risk={event.risk_level} />
                    <SmartEventBadge status={event.status} />
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

function Stat({ title, value, hint }: { title: string; value: number; hint: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  );
}
