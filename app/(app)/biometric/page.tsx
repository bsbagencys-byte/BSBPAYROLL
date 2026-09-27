import Link from "next/link";
import { Fingerprint } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { BiometricSubnav } from "@/components/biometric/subnav";
import { DeviceStatusBadge, PunchDirectionBadge } from "@/components/biometric/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadBiometricOverview } from "@/lib/biometric/query";
import { BIOMETRIC_VENDOR_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Biometric" };

export default async function BiometricPage() {
  const user = await requirePermissionOrRedirect("biometric.view");
  const overview = await loadBiometricOverview(user.organization.id);
  const canManage = hasPermission(user, "biometric.manage");

  return (
    <div>
      <PageHeader
        title="Biometric"
        description="Vendor-neutral device ingest. Punches are captured here; attendance calculation is not enabled yet."
        actions={
          canManage ? (
            <Link href="/biometric/devices/new">
              <Button>Add device</Button>
            </Link>
          ) : null
        }
      />
      <BiometricSubnav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.devices.length}</p>
            <p className="text-xs text-slate-500">{overview.onlineCount} online</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Unmapped</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.unmappedCount}</p>
            <p className="text-xs text-slate-500">Need identity mapping</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.rejectedCount}</p>
            <p className="text-xs text-slate-500">Failed ingest payloads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Duplicates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.duplicateCount}</p>
            <p className="text-xs text-slate-500">Ignored repeats</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Devices</CardTitle>
            <Link href="/biometric/devices/new" className="text-sm text-brand-700 hover:underline">
              Register
            </Link>
          </CardHeader>
          <CardContent>
            {overview.devices.length === 0 ? (
              <p className="text-sm text-slate-500">No devices yet. Register an eSSL or generic JSON device.</p>
            ) : (
              <div className="space-y-3">
                {overview.devices.map((device) => (
                  <Link
                    key={device.id}
                    href={`/biometric/devices/${device.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:border-brand-500"
                  >
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-xs text-slate-500">
                        {BIOMETRIC_VENDOR_LABELS[device.vendor]} · {device.serialNumber}
                      </p>
                    </div>
                    <DeviceStatusBadge status={device.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent punches</CardTitle>
            <Link href="/biometric/punches" className="text-sm text-brand-700 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {overview.recentPunches.length === 0 ? (
              <p className="text-sm text-slate-500">No punches yet. Use the simulator or push an eSSL event.</p>
            ) : (
              <div className="space-y-3">
                {overview.recentPunches.map((punch) => (
                  <div key={punch.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="font-medium">{punch.employeeName}</p>
                      <p className="text-xs text-slate-500">
                        {punch.deviceName} · {formatDateTime(punch.punchedAt, punch.timezone)}
                      </p>
                    </div>
                    <PunchDirectionBadge direction={punch.direction} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <Fingerprint className="h-3.5 w-3.5" />
        New vendors plug in as adapters. Face, QR, GPS and mobile attendance are not part of this phase.
      </p>
      {overview.unmappedCount > 0 ? (
        <div className="mt-3">
          <Badge variant="warning">{overview.unmappedCount} unmapped event{overview.unmappedCount === 1 ? "" : "s"}</Badge>
          <Link href="/biometric/mapping" className="ml-2 text-sm text-brand-700 hover:underline">
            Map identities
          </Link>
        </div>
      ) : null}
    </div>
  );
}
