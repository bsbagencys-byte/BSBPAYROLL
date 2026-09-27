import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { BiometricSubnav } from "@/components/biometric/subnav";
import { MappingActions } from "@/components/biometric/mapping-actions";
import { MappingForm } from "@/components/biometric/mapping-form";
import { EventStatusBadge } from "@/components/biometric/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadMappingList, loadUnmappedList } from "@/lib/biometric/query";
import { listDevices } from "@/lib/biometric/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Identity mapping" };

export default async function MappingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermissionOrRedirect("biometric.view");
  const params = await searchParams;
  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const [maps, unmapped, devices, catalog] = await Promise.all([
    loadMappingList(user.organization.id),
    loadUnmappedList(user.organization.id),
    listDevices(user.organization.id),
    loadOrgCatalog(user.organization.id),
  ]);
  const canMap = hasPermission(user, "biometric.mapping");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Identity mapping"
        description="Map a device user ID to an employee. Unmapped punches stay in the queue until they are linked."
      />
      <BiometricSubnav />
      {canMap ? (
        <MappingForm
          devices={devices}
          employees={catalog.employees}
          defaultDeviceId={first("deviceId")}
          defaultUserId={first("deviceUserId")}
        />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Unmapped queue</CardTitle>
        </CardHeader>
        <CardContent>
          {unmapped.length === 0 ? (
            <p className="text-sm text-slate-500">No unmapped punches.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Device</th>
                    <th className="px-3 py-2">Device user</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {unmapped.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{item.deviceName}</td>
                      <td className="px-3 py-2 font-mono">{item.deviceUserId}</td>
                      <td className="px-3 py-2">{formatDateTime(item.punchedAt, user.organization.timezone)}</td>
                      <td className="px-3 py-2">
                        <EventStatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {maps.length === 0 ? (
        <EmptyState title="No mappings yet" description="Map a device user ID to an employee to create punches." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Device user</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Status</th>
                {canMap ? <th className="px-4 py-3 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {maps.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{item.deviceName}</td>
                  <td className="px-4 py-3 font-mono">{item.deviceUserId}</td>
                  <td className="px-4 py-3">
                    {item.employeeName}
                    <div className="text-xs text-slate-500">{item.employeeCode}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>{item.status}</Badge>
                  </td>
                  {canMap ? (
                    <td className="px-4 py-3 text-right">
                      <MappingActions id={item.id} enabled={item.status === "ACTIVE"} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
