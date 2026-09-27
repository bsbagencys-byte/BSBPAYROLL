import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { BiometricSubnav } from "@/components/biometric/subnav";
import { DeviceActions } from "@/components/biometric/device-actions";
import { DeviceForm } from "@/components/biometric/device-form";
import { DeviceStatusBadge } from "@/components/biometric/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { effectiveDeviceStatus, findDeviceById } from "@/lib/biometric/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { BIOMETRIC_VENDOR_LABELS, DEVICE_CONNECTION_LABELS } from "@/lib/constants";
import { formatDateTime, lookupName } from "@/lib/utils";

export const metadata = { title: "Device" };

export default async function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionOrRedirect("biometric.view");
  const { id } = await params;
  const [device, catalog] = await Promise.all([
    findDeviceById(user.organization.id, id),
    loadOrgCatalog(user.organization.id),
  ]);
  if (!device) notFound();
  const canManage = hasPermission(user, "biometric.manage");
  const status = effectiveDeviceStatus(device);

  return (
    <div>
      <PageHeader title={device.name} description={`${BIOMETRIC_VENDOR_LABELS[device.vendor]} · ${device.serial_number}`} />
      <BiometricSubnav />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Health</span>
              <DeviceStatusBadge status={status} />
            </div>
            <div className="flex items-center justify-between">
              <span>Mode</span>
              <span>{DEVICE_CONNECTION_LABELS[device.connection_mode]}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Last seen</span>
              <span>{device.last_seen_at ? formatDateTime(device.last_seen_at, device.timezone) : "Never"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Token hint</span>
              <span className="font-mono">****{device.token_hint}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Branch</span>
              <span>{lookupName(catalog.branches, device.branch_id) ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Location</span>
              <span>{lookupName(catalog.locations, device.location_id) ?? "—"}</span>
            </div>
            {device.last_error ? <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">{device.last_error}</p> : null}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ingest endpoints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Push URL: <span className="font-mono text-xs">/api/biometric/push</span>
            </p>
            <p>
              Webhook URL: <span className="font-mono text-xs">/api/biometric/webhook</span>
            </p>
            <p className="text-slate-500">
              Send header <span className="font-mono">x-device-token</span> or query <span className="font-mono">token</span>. The full
              token is never stored.
            </p>
            {canManage ? <DeviceActions deviceId={device.id} status={device.status} /> : null}
          </CardContent>
        </Card>
      </div>
      {canManage ? (
        <div className="mt-4">
          <DeviceForm
            branches={catalog.branches}
            locations={catalog.locations}
            defaultTimezone={device.timezone}
            deviceId={device.id}
            defaults={{
              name: device.name,
              vendor: device.vendor,
              serialNumber: device.serial_number,
              model: device.model ?? "",
              firmware: device.firmware ?? "",
              connectionMode: device.connection_mode,
              branchId: device.branch_id ?? "",
              locationId: device.location_id ?? "",
              timezone: device.timezone,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
