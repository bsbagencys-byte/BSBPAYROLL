import { PageHeader } from "@/components/layout/app-shell";
import { DeviceStatusForm } from "@/components/smart-attendance/forms";
import { TrustedDeviceBadge } from "@/components/smart-attendance/status-badge";
import { SmartAttendanceSubnav } from "@/components/smart-attendance/subnav";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadOrgCatalog } from "@/lib/org-data";
import { loadSmartDashboard } from "@/lib/smart-attendance/service";
import { formatDateTime, lookupName } from "@/lib/utils";

export const metadata = { title: "Trusted devices" };

export default async function TrustedDevicesPage() {
  const user = await requirePermissionOrRedirect("attendance.smart.view");
  const [data, catalog] = await Promise.all([
    loadSmartDashboard(user.organization.id),
    loadOrgCatalog(user.organization.id),
  ]);
  const canManage = hasPermission(user, "attendance.device.manage");

  return (
    <div>
      <PageHeader
        title="Trusted devices"
        description="Attendance from unauthorized devices is rejected. Lost, revoked and replacement states are recorded."
      />
      <SmartAttendanceSubnav />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Device</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Registered</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.devices.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No trusted devices registered.</td></tr>
            ) : data.devices.map((row) => (
              <tr key={row.id} className="border-b last:border-0 align-top">
                <td className="px-4 py-3">{lookupName(catalog.employees, row.employee_id) ?? row.employee_id}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{row.device_model}</p>
                  <p className="text-xs text-slate-500">{row.os_version} · {row.app_version}</p>
                </td>
                <td className="px-4 py-3"><TrustedDeviceBadge status={row.status} /></td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(row.registered_at)}</td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <div className="space-y-2">
                      {row.status !== "ACTIVE" ? <DeviceStatusForm deviceId={row.id} status="ACTIVE" label="Activate" /> : null}
                      {row.status === "ACTIVE" ? <DeviceStatusForm deviceId={row.id} status="REVOKED" label="Revoke" /> : null}
                      <DeviceStatusForm deviceId={row.id} status="LOST" label="Mark lost" />
                      <DeviceStatusForm deviceId={row.id} status="REPLACEMENT_PENDING" label="Replacement" />
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">{row.revoked_reason ?? "—"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
