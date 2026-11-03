import { PageHeader } from "@/components/layout/app-shell";
import { WorkplaceForm } from "@/components/smart-attendance/forms";
import { SmartAttendanceSubnav } from "@/components/smart-attendance/subnav";
import { Badge } from "@/components/ui/badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadSmartDashboard } from "@/lib/smart-attendance/service";

export const metadata = { title: "Workplaces" };

export default async function SmartLocationsPage() {
  const user = await requirePermissionOrRedirect("attendance.smart.view");
  const data = await loadSmartDashboard(user.organization.id);
  const canManage = hasPermission(user, "attendance.smart.manage");

  return (
    <div>
      <PageHeader
        title="Workplaces"
        description="Each workplace has its own latitude, longitude and radius. Radius is never hard-coded."
      />
      <SmartAttendanceSubnav />
      {canManage ? <div className="mb-6"><WorkplaceForm /></div> : null}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Workplace</th>
              <th className="px-4 py-3">Coordinates</th>
              <th className="px-4 py-3">Radius</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.workplaces.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={4}>No workplaces yet.</td></tr>
            ) : data.workplaces.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 text-slate-600">{row.latitude.toFixed(5)}, {row.longitude.toFixed(5)}</td>
                <td className="px-4 py-3">{row.radius_meters}m</td>
                <td className="px-4 py-3"><Badge variant={row.status === "ACTIVE" ? "success" : "muted"}>{row.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
