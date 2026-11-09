"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  correctSmartEventAction,
  createQrAction,
  deviceStatusAction,
  saveSmartSettingsAction,
  saveWorkplaceAction,
  selfVerifySmartEventAction,
  verifySmartEventAction,
} from "@/actions/smart-attendance";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  GEOFENCE_RADIUS_PRESETS,
  SMART_AUTO_ACCEPT_POLICIES,
  SMART_AUTO_ACCEPT_POLICY_LABELS,
} from "@/lib/constants";
import type { ActionResult, AttendanceLocationConfig, SmartAttendanceSettings } from "@/types";

const initial: ActionResult = { success: false };

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" name={name} value="true" defaultChecked={defaultChecked} className="h-4 w-4" />
      {label}
    </label>
  );
}

export function SmartSettingsForm({ settings }: { settings: SmartAttendanceSettings }) {
  const [state, action, pending] = useActionState(saveSmartSettingsAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization settings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-slate-600">
          Radius is never hard-coded. The app never decides validity. Background location stays off unless this organization enables it.
        </p>
        {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
        <form action={action} className="mt-3 grid gap-4 sm:grid-cols-2">
          <Check name="enabled" label="Enable smart attendance" defaultChecked={settings.enabled} />
          <Check name="requireTrustedDevice" label="Require trusted device" defaultChecked={settings.require_trusted_device} />
          <Check name="requirePreciseLocation" label="Require precise location" defaultChecked={settings.require_precise_location} />
          <Check name="backgroundLocationEnabled" label="Allow background location (off by default)" defaultChecked={settings.background_location_enabled} />
          <Check name="qrFallbackEnabled" label="Enable dynamic QR fallback" defaultChecked={settings.qr_fallback_enabled} />
          <Check name="dynamicPinEnabled" label="Require rotating PIN with QR" defaultChecked={settings.dynamic_pin_enabled} />
          <div>
            <Label htmlFor="geofenceRadiusMeters">Default radius (m)</Label>
            <Input id="geofenceRadiusMeters" name="geofenceRadiusMeters" type="number" min={30} max={2000} className="mt-1" defaultValue={settings.geofence_radius_meters} />
            <p className="mt-1 text-xs text-slate-500">Presets {GEOFENCE_RADIUS_PRESETS.join("/")} m, or custom 30–2000.</p>
            <FieldError>{state.errors?.geofenceRadiusMeters?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="accuracyThresholdMeters">Accuracy threshold (m)</Label>
            <Input id="accuracyThresholdMeters" name="accuracyThresholdMeters" type="number" className="mt-1" defaultValue={settings.accuracy_threshold_meters} />
          </div>
          <div>
            <Label htmlFor="freshnessSeconds">Freshness (seconds)</Label>
            <Input id="freshnessSeconds" name="freshnessSeconds" type="number" className="mt-1" defaultValue={settings.freshness_seconds} />
          </div>
          <div>
            <Label htmlFor="maxTrustedDevices">Max trusted devices</Label>
            <Input id="maxTrustedDevices" name="maxTrustedDevices" type="number" min={1} max={5} className="mt-1" defaultValue={settings.max_trusted_devices} />
          </div>
          <div>
            <Label htmlFor="qrTtlSeconds">QR TTL (seconds)</Label>
            <Input id="qrTtlSeconds" name="qrTtlSeconds" type="number" min={30} max={300} className="mt-1" defaultValue={settings.qr_ttl_seconds} />
          </div>
          <div>
            <Label htmlFor="retentionDays">Retention (days)</Label>
            <Input id="retentionDays" name="retentionDays" type="number" className="mt-1" defaultValue={settings.retention_days} />
          </div>
          <div>
            <Label htmlFor="entryWindowStart">Entry window start</Label>
            <Input id="entryWindowStart" name="entryWindowStart" className="mt-1" defaultValue={settings.entry_window_start} />
          </div>
          <div>
            <Label htmlFor="entryWindowEnd">Entry window end</Label>
            <Input id="entryWindowEnd" name="entryWindowEnd" className="mt-1" defaultValue={settings.entry_window_end} />
          </div>
          <div>
            <Label htmlFor="exitWindowStart">Exit window start</Label>
            <Input id="exitWindowStart" name="exitWindowStart" className="mt-1" defaultValue={settings.exit_window_start} />
          </div>
          <div>
            <Label htmlFor="exitWindowEnd">Exit window end</Label>
            <Input id="exitWindowEnd" name="exitWindowEnd" className="mt-1" defaultValue={settings.exit_window_end} />
          </div>
          <div>
            <Label htmlFor="duplicateIntervalSeconds">Duplicate interval (seconds)</Label>
            <Input id="duplicateIntervalSeconds" name="duplicateIntervalSeconds" type="number" min={30} max={3600} className="mt-1" defaultValue={settings.duplicate_interval_seconds} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="autoAcceptPolicy">Auto-accept policy</Label>
            <Select id="autoAcceptPolicy" name="autoAcceptPolicy" className="mt-1" defaultValue={settings.auto_accept_policy}>
              {SMART_AUTO_ACCEPT_POLICIES.map((policy) => (
                <option key={policy} value={policy}>
                  {SMART_AUTO_ACCEPT_POLICY_LABELS[policy]}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function WorkplaceForm({ workplace }: { workplace?: AttendanceLocationConfig }) {
  const [state, action, pending] = useActionState(saveWorkplaceAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{workplace ? "Edit workplace" : "Add workplace"}</CardTitle>
      </CardHeader>
      <CardContent>
        {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
        <form action={action} className="mt-3 grid gap-4 sm:grid-cols-2">
          {workplace ? <input type="hidden" name="id" value={workplace.id} /> : null}
          <div className="sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" className="mt-1" defaultValue={workplace?.name ?? ""} required />
            <FieldError>{state.errors?.name?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="latitude">Latitude</Label>
            <Input id="latitude" name="latitude" className="mt-1" defaultValue={workplace?.latitude ?? 12.9716} required />
          </div>
          <div>
            <Label htmlFor="longitude">Longitude</Label>
            <Input id="longitude" name="longitude" className="mt-1" defaultValue={workplace?.longitude ?? 77.5946} required />
          </div>
          <div>
            <Label htmlFor="radiusMeters">Radius (m)</Label>
            <Input id="radiusMeters" name="radiusMeters" type="number" min={30} max={2000} className="mt-1" defaultValue={workplace?.radius_meters ?? 100} />
            <p className="mt-1 text-xs text-slate-500">Presets {GEOFENCE_RADIUS_PRESETS.join("/")} or custom 30–2000.</p>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" className="mt-1" defaultValue={workplace?.status ?? "ACTIVE"}>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save workplace
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function DeviceStatusForm({
  deviceId,
  status,
  label,
}: {
  deviceId: string;
  status: "ACTIVE" | "REVOKED" | "LOST" | "REPLACEMENT_PENDING";
  label: string;
}) {
  const [state, action, pending] = useActionState(deviceStatusAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="deviceId" value={deviceId} />
      <input type="hidden" name="status" value={status} />
      {status !== "ACTIVE" ? (
        <Input name="reason" placeholder="Reason" className="h-8 w-40" />
      ) : null}
      <Button type="submit" size="sm" variant={status === "ACTIVE" ? "default" : "outline"} disabled={pending}>
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        {label}
      </Button>
      {state.message ? <span className="text-xs text-slate-500">{state.message}</span> : null}
    </form>
  );
}

export function CreateQrForm({ workplaces }: { workplaces: AttendanceLocationConfig[] }) {
  const [state, action, pending] = useActionState(
    createQrAction,
    { success: false } as ActionResult<{ token: string; pin: string | null; expiresAt: string }>
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dynamic QR</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-slate-600">Short-lived signed token. Permanent static QR codes are rejected.</p>
        {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
        {state.success && state.data ? (
          <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">{state.data.token}</pre>
        ) : null}
        {state.data?.pin ? <p className="mt-2 text-sm">PIN {state.data.pin}</p> : null}
        <form action={action} className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="workplaceId">Workplace</Label>
            <Select id="workplaceId" name="workplaceId" className="mt-1" defaultValue={workplaces[0]?.id ?? ""}>
              {workplaces.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="direction">Direction</Label>
            <Select id="direction" name="direction" className="mt-1" defaultValue="IN">
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending || workplaces.length === 0}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create QR
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function VerifyEventForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(verifySmartEventAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="eventId" value={eventId} />
      <Select name="method" defaultValue="DEVICE_BIOMETRIC" className="h-8 w-40">
        <option value="DEVICE_BIOMETRIC">Phone biometric</option>
        <option value="DYNAMIC_PIN">Dynamic PIN</option>
        <option value="FACE_PROVIDER">Face provider</option>
        <option value="HR_REVIEW">HR review</option>
      </Select>
      <Select name="outcome" defaultValue="PASSED" className="h-8 w-28">
        <option value="PASSED">Passed</option>
        <option value="FAILED">Failed</option>
        <option value="SKIPPED">Skipped</option>
        <option value="UNAVAILABLE">Unavailable</option>
      </Select>
      <Input name="notes" placeholder="Notes" className="h-8 w-40" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Verify
      </Button>
      {state.message ? <span className="text-xs text-slate-500">{state.message}</span> : null}
    </form>
  );
}

export function CorrectEventForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(correctSmartEventAction, initial);
  return (
    <form action={action} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="eventId" value={eventId} />
      <Input name="notes" placeholder="Authorized correction notes" className="h-8 w-64" required />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Correct
      </Button>
      {state.message ? <span className="text-xs text-slate-500">{state.message}</span> : null}
    </form>
  );
}

export function SelfVerifyForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(selfVerifySmartEventAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="method" value="DEVICE_BIOMETRIC" />
      <input type="hidden" name="outcome" value="PASSED" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Confirm with phone biometric
      </Button>
      {state.message ? <span className="text-xs text-slate-500">{state.message}</span> : null}
    </form>
  );
}
