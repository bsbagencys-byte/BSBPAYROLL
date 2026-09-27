"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { saveDeviceAction } from "@/actions/biometric";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  BIOMETRIC_VENDOR_LABELS,
  BIOMETRIC_VENDORS,
  DEVICE_CONNECTION_LABELS,
  DEVICE_CONNECTION_MODES,
  TIMEZONES,
} from "@/lib/constants";
import type { ActionResult, Branch, Location } from "@/types";

const initial: ActionResult<{ id: string; token?: string }> = { success: false };

export function DeviceForm({
  branches,
  locations,
  defaultTimezone,
  deviceId,
  defaults,
}: {
  branches: Branch[];
  locations: Location[];
  defaultTimezone: string;
  deviceId?: string;
  defaults?: {
    name: string;
    vendor: string;
    serialNumber: string;
    model: string;
    firmware: string;
    connectionMode: string;
    branchId: string;
    locationId: string;
    timezone: string;
  };
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveDeviceAction, initial);
  const [copied, setCopied] = useState(false);
  const token = state.data?.token;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{deviceId ? "Edit device" : "Register device"}</CardTitle>
      </CardHeader>
      <CardContent>
        {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
        {token ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">Device token (shown once)</p>
            <p className="mt-1 break-all font-mono text-xs">{token}</p>
            <Button
              type="button"
              size="sm"
              className="mt-2"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(token);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy token"}
            </Button>
            <div className="mt-3">
              <Button type="button" onClick={() => router.push(`/biometric/devices/${state.data?.id}`)}>
                Continue to device
              </Button>
            </div>
          </div>
        ) : null}
        <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
          {deviceId ? <input type="hidden" name="id" value={deviceId} /> : null}
          <div className="sm:col-span-2">
            <Label htmlFor="name">Device name</Label>
            <Input id="name" name="name" className="mt-1" defaultValue={defaults?.name ?? ""} required />
            <FieldError>{state.errors?.name?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="vendor">Vendor</Label>
            <Select id="vendor" name="vendor" className="mt-1" defaultValue={defaults?.vendor ?? "ESSL"}>
              {BIOMETRIC_VENDORS.map((vendor) => (
                <option key={vendor} value={vendor}>
                  {BIOMETRIC_VENDOR_LABELS[vendor]}
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.vendor?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="serialNumber">Serial number</Label>
            <Input id="serialNumber" name="serialNumber" className="mt-1" defaultValue={defaults?.serialNumber ?? ""} required />
            <FieldError>{state.errors?.serialNumber?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="model">Model</Label>
            <Input id="model" name="model" className="mt-1" defaultValue={defaults?.model ?? ""} />
          </div>
          <div>
            <Label htmlFor="firmware">Firmware</Label>
            <Input id="firmware" name="firmware" className="mt-1" defaultValue={defaults?.firmware ?? ""} />
          </div>
          <div>
            <Label htmlFor="connectionMode">Connection mode</Label>
            <Select id="connectionMode" name="connectionMode" className="mt-1" defaultValue={defaults?.connectionMode ?? "PUSH"}>
              {DEVICE_CONNECTION_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {DEVICE_CONNECTION_LABELS[mode]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select id="timezone" name="timezone" className="mt-1" defaultValue={defaults?.timezone ?? defaultTimezone}>
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="branchId">Branch</Label>
            <Select id="branchId" name="branchId" className="mt-1" defaultValue={defaults?.branchId ?? ""}>
              <option value="">Unassigned</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="locationId">Location</Label>
            <Select id="locationId" name="locationId" className="mt-1" defaultValue={defaults?.locationId ?? ""}>
              <option value="">Unassigned</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {deviceId ? "Save device" : "Register device"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
