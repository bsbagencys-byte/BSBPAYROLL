"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { flattenErrors, optional } from "@/lib/form-errors";
import { employeeIdForUser } from "@/lib/ess/identity";
import {
  correctionSchema,
  deviceActionSchema,
  qrCreateSchema,
  smartSettingsSchema,
  verificationSchema,
  workplaceSchema,
} from "@/lib/validations/smart-attendance";
import {
  createQrSession,
  recordVerification,
  saveSmartSettings,
  saveWorkplace,
  setTrustedDeviceStatus,
} from "@/lib/smart-attendance/service";
import type { ActionResult } from "@/types";
import type { PermissionCode } from "@/lib/constants";

function fail<T = undefined>(error: unknown, fallback: string): ActionResult<T> {
  return { success: false, message: error instanceof Error ? error.message : fallback };
}

function refresh() {
  revalidatePath("/attendance/smart");
  revalidatePath("/attendance/smart-settings");
  revalidatePath("/attendance/locations");
  revalidatePath("/attendance/trusted-devices");
  revalidatePath("/attendance/smart-events");
  revalidatePath("/my/smart-attendance");
  revalidatePath("/my/attendance");
}

async function requireSmart(permission: PermissionCode) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." as const, user: null };
  if (!hasPermission(user, permission)) {
    return { error: "You do not have permission for this action." as const, user: null };
  }
  return { error: null, user };
}

export async function saveSmartSettingsAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireSmart("attendance.smart.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = smartSettingsSchema.safeParse({
    enabled: formData.get("enabled") ?? undefined,
    geofenceRadiusMeters: formData.get("geofenceRadiusMeters"),
    accuracyThresholdMeters: formData.get("accuracyThresholdMeters"),
    freshnessSeconds: formData.get("freshnessSeconds"),
    maxTrustedDevices: formData.get("maxTrustedDevices"),
    requireTrustedDevice: formData.get("requireTrustedDevice") ?? undefined,
    requirePreciseLocation: formData.get("requirePreciseLocation") ?? undefined,
    backgroundLocationEnabled: formData.get("backgroundLocationEnabled") ?? undefined,
    autoAcceptPolicy: formData.get("autoAcceptPolicy"),
    qrFallbackEnabled: formData.get("qrFallbackEnabled") ?? undefined,
    dynamicPinEnabled: formData.get("dynamicPinEnabled") ?? undefined,
    qrTtlSeconds: formData.get("qrTtlSeconds"),
    entryWindowStart: formData.get("entryWindowStart"),
    entryWindowEnd: formData.get("entryWindowEnd"),
    exitWindowStart: formData.get("exitWindowStart"),
    exitWindowEnd: formData.get("exitWindowEnd"),
    duplicateIntervalSeconds: formData.get("duplicateIntervalSeconds"),
    retentionDays: formData.get("retentionDays"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Settings are incomplete." };
  try {
    await saveSmartSettings(access.user.organization.id, access.user.id, {
      enabled: Boolean(parsed.data.enabled),
      geofence_radius_meters: parsed.data.geofenceRadiusMeters,
      accuracy_threshold_meters: parsed.data.accuracyThresholdMeters,
      freshness_seconds: parsed.data.freshnessSeconds,
      max_trusted_devices: parsed.data.maxTrustedDevices,
      require_trusted_device: Boolean(parsed.data.requireTrustedDevice),
      require_precise_location: Boolean(parsed.data.requirePreciseLocation),
      background_location_enabled: Boolean(parsed.data.backgroundLocationEnabled),
      auto_accept_policy: parsed.data.autoAcceptPolicy,
      qr_fallback_enabled: Boolean(parsed.data.qrFallbackEnabled),
      dynamic_pin_enabled: Boolean(parsed.data.dynamicPinEnabled),
      qr_ttl_seconds: parsed.data.qrTtlSeconds,
      entry_window_start: parsed.data.entryWindowStart,
      entry_window_end: parsed.data.entryWindowEnd,
      exit_window_start: parsed.data.exitWindowStart,
      exit_window_end: parsed.data.exitWindowEnd,
      duplicate_interval_seconds: parsed.data.duplicateIntervalSeconds,
      retention_days: parsed.data.retentionDays,
      face_provider_kind: "NONE",
      face_provider_configured: false,
    });
  } catch (error) {
    return fail(error, "Could not save settings.");
  }
  refresh();
  return { success: true, message: "Smart attendance settings saved. Radius is organization-configured, not hard-coded." };
}

export async function saveWorkplaceAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireSmart("attendance.smart.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = workplaceSchema.safeParse({
    id: optional(formData.get("id")),
    name: formData.get("name"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    radiusMeters: formData.get("radiusMeters"),
    branchId: optional(formData.get("branchId")),
    locationId: optional(formData.get("locationId")),
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Workplace details are incomplete." };
  try {
    const row = await saveWorkplace(access.user.organization.id, access.user.id, {
      id: parsed.data.id || undefined,
      name: parsed.data.name,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      radiusMeters: parsed.data.radiusMeters,
      branchId: parsed.data.branchId,
      locationId: parsed.data.locationId,
      status: parsed.data.status,
    });
    refresh();
    return { success: true, message: `${row.name} saved with ${row.radius_meters}m radius.` };
  } catch (error) {
    return fail(error, "Could not save workplace.");
  }
}

export async function deviceStatusAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireSmart("attendance.device.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = deviceActionSchema.safeParse({
    deviceId: formData.get("deviceId"),
    reason: optional(formData.get("reason")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Device action is incomplete." };
  const status = String(formData.get("status") ?? "");
  if (!["ACTIVE", "REVOKED", "LOST", "REPLACEMENT_PENDING"].includes(status)) {
    return { success: false, message: "Unsupported device status." };
  }
  try {
    const row = await setTrustedDeviceStatus(
      access.user.organization.id,
      parsed.data.deviceId,
      status as "ACTIVE" | "REVOKED" | "LOST" | "REPLACEMENT_PENDING",
      parsed.data.reason || null,
      access.user.id
    );
    refresh();
    return { success: true, message: `Device is now ${row.status.replaceAll("_", " ").toLowerCase()}.` };
  } catch (error) {
    return fail(error, "Could not update device.");
  }
}

export async function createQrAction(
  _prev: ActionResult<{ token: string; pin: string | null; expiresAt: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ token: string; pin: string | null; expiresAt: string }>> {
  const access = await requireSmart("attendance.smart.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = qrCreateSchema.safeParse({
    workplaceId: formData.get("workplaceId"),
    direction: formData.get("direction"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "QR details are incomplete." };
  try {
    const created = await createQrSession({
      organizationId: access.user.organization.id,
      workplaceId: parsed.data.workplaceId,
      direction: parsed.data.direction,
      actorId: access.user.id,
    });
    refresh();
    return {
      success: true,
      message: `Short-lived QR created. Expires ${created.expiresAt}. Permanent static QR codes are not accepted.`,
      data: { token: created.token, pin: created.pin, expiresAt: created.expiresAt },
    };
  } catch (error) {
    return fail(error, "Could not create QR session.");
  }
}

export async function verifySmartEventAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireSmart("attendance.correct");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = verificationSchema.safeParse({
    eventId: formData.get("eventId"),
    method: formData.get("method"),
    outcome: formData.get("outcome"),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Verification is incomplete." };
  try {
    const row = await recordVerification({
      organizationId: access.user.organization.id,
      eventId: parsed.data.eventId,
      method: parsed.data.method,
      outcome: parsed.data.outcome,
      notes: parsed.data.notes,
      actorId: access.user.id,
    });
    refresh();
    return { success: true, message: `Event is now ${row.status.replaceAll("_", " ").toLowerCase()}.` };
  } catch (error) {
    return fail(error, "Could not record verification.");
  }
}

export async function correctSmartEventAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireSmart("attendance.correct");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = correctionSchema.safeParse({
    eventId: formData.get("eventId"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Correction notes are required." };
  try {
    const row = await recordVerification({
      organizationId: access.user.organization.id,
      eventId: parsed.data.eventId,
      method: "HR_REVIEW",
      outcome: "PASSED",
      notes: parsed.data.notes,
      actorId: access.user.id,
    });
    refresh();
    return { success: true, message: `Authorized correction recorded. Status ${row.status}. Finalized days are not rewritten.` };
  } catch (error) {
    return fail(error, "Could not record correction.");
  }
}

export async function selfVerifySmartEventAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireSmart("attendance.smart.view");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const employeeId = await employeeIdForUser(access.user.organization.id, access.user.id);
  if (!employeeId) return { success: false, message: "No employee record is linked to this user." };
  const parsed = verificationSchema.safeParse({
    eventId: formData.get("eventId"),
    method: formData.get("method") || "DEVICE_BIOMETRIC",
    outcome: formData.get("outcome") || "PASSED",
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Verification is incomplete." };
  if (parsed.data.method === "HR_REVIEW") return { success: false, message: "Employees cannot complete HR review." };
  try {
    const { getSmartEvent } = await import("@/lib/smart-attendance/repository");
    const event = await getSmartEvent(access.user.organization.id, parsed.data.eventId);
    if (!event || event.employee_id !== employeeId) return { success: false, message: "Event not found." };
    const row = await recordVerification({
      organizationId: access.user.organization.id,
      eventId: parsed.data.eventId,
      method: parsed.data.method,
      outcome: parsed.data.outcome,
      notes: parsed.data.notes,
      actorId: access.user.id,
    });
    refresh();
    return { success: true, message: `Verification recorded. Status ${row.status.replaceAll("_", " ").toLowerCase()}.` };
  } catch (error) {
    return fail(error, "Could not record verification.");
  }
}
