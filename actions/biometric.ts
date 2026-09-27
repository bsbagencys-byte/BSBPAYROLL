"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors, optional } from "@/lib/form-errors";
import { deviceSchema, mappingSchema, simulatePunchSchema } from "@/lib/validations/biometric";
import { generateDeviceToken, sha256, tokenHint } from "@/lib/biometric/hash";
import { formatLocalDateTime } from "@/lib/biometric/time";
import { ingestBiometricRequest } from "@/lib/biometric/gateway";
import {
  findDeviceById,
  insertDevice,
  insertMapping,
  listDevices,
  listMappings,
  updateDevice,
  updateMapping,
} from "@/lib/biometric/repository";
import type { ActionResult, BiometricDevice, BiometricIdentityMap } from "@/types";
import type { DeviceStatus } from "@/lib/constants";

function stamp() {
  return new Date().toISOString();
}

function refresh() {
  revalidatePath("/biometric");
  revalidatePath("/biometric/mapping");
  revalidatePath("/biometric/punches");
  revalidatePath("/biometric/logs");
  revalidatePath("/biometric/live");
  revalidatePath("/biometric/simulator");
}

async function requireBiometric(permission: "biometric.view" | "biometric.manage" | "biometric.mapping") {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." as const, user: null };
  if (!hasPermission(user, permission)) return { error: "You do not have permission for this action." as const, user: null };
  return { error: null, user };
}

export async function saveDeviceAction(
  _prev: ActionResult<{ id: string; token?: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string; token?: string }>> {
  const access = await requireBiometric("biometric.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };

  const parsed = deviceSchema.safeParse({
    name: formData.get("name"),
    vendor: formData.get("vendor"),
    serialNumber: formData.get("serialNumber"),
    model: optional(formData.get("model")),
    firmware: optional(formData.get("firmware")),
    connectionMode: formData.get("connectionMode"),
    branchId: optional(formData.get("branchId")),
    locationId: optional(formData.get("locationId")),
    timezone: formData.get("timezone") || access.user.organization.timezone,
    status: optional(formData.get("status")) || undefined,
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };

  const id = String(formData.get("id") ?? "").trim();
  const orgId = access.user.organization.id;
  const values = parsed.data;

  if (id) {
    const existing = await findDeviceById(orgId, id);
    if (!existing) return { success: false, message: "Device not found." };
    await updateDevice(orgId, id, {
      name: values.name,
      vendor: values.vendor,
      serial_number: values.serialNumber,
      model: values.model || null,
      firmware: values.firmware || null,
      connection_mode: values.connectionMode,
      branch_id: values.branchId || null,
      location_id: values.locationId || null,
      timezone: values.timezone,
      status: (values.status as DeviceStatus | undefined) ?? existing.status,
    });
    await writeAudit({
      organizationId: orgId,
      actorUserId: access.user.id,
      action: "biometric.device.update",
      entityType: "biometric_device",
      entityId: id,
      metadata: { name: values.name, vendor: values.vendor, serialNumber: values.serialNumber },
    });
    refresh();
    return { success: true, message: "Device updated.", data: { id } };
  }

  const devices = await listDevices(orgId);
  if (devices.some((item) => item.serial_number.toLowerCase() === values.serialNumber.toLowerCase())) {
    return { success: false, errors: { serialNumber: ["A device with this serial number already exists."] } };
  }

  const token = generateDeviceToken();
  const device: BiometricDevice = {
    id: crypto.randomUUID(),
    organization_id: orgId,
    name: values.name,
    vendor: values.vendor,
    serial_number: values.serialNumber,
    model: values.model || null,
    firmware: values.firmware || null,
    connection_mode: values.connectionMode,
    branch_id: values.branchId || null,
    location_id: values.locationId || null,
    timezone: values.timezone,
    token_hash: sha256(token),
    token_hint: tokenHint(token),
    status: "PENDING",
    last_seen_at: null,
    last_error: null,
    created_by: access.user.id,
    created_at: stamp(),
    updated_at: stamp(),
  };
  await insertDevice(device);
  await writeAudit({
    organizationId: orgId,
    actorUserId: access.user.id,
    action: "biometric.device.create",
    entityType: "biometric_device",
    entityId: device.id,
    metadata: { name: device.name, vendor: device.vendor, serialNumber: device.serial_number },
  });
  refresh();
  return {
    success: true,
    message: "Device registered. Copy the token now; it will not be shown again.",
    data: { id: device.id, token },
  };
}

export async function rotateDeviceTokenAction(deviceId: string): Promise<ActionResult<{ token: string }>> {
  const access = await requireBiometric("biometric.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const device = await findDeviceById(access.user.organization.id, deviceId);
  if (!device) return { success: false, message: "Device not found." };
  const token = generateDeviceToken();
  await updateDevice(access.user.organization.id, deviceId, {
    token_hash: sha256(token),
    token_hint: tokenHint(token),
  });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "biometric.device.rotate_token",
    entityType: "biometric_device",
    entityId: deviceId,
  });
  refresh();
  return { success: true, message: "New device token generated.", data: { token } };
}

export async function setDeviceStatusAction(deviceId: string, status: DeviceStatus): Promise<ActionResult> {
  const access = await requireBiometric("biometric.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const device = await updateDevice(access.user.organization.id, deviceId, { status, last_error: null });
  if (!device) return { success: false, message: "Device not found." };
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: status === "DISABLED" ? "biometric.device.disable" : "biometric.device.enable",
    entityType: "biometric_device",
    entityId: deviceId,
    metadata: { status },
  });
  refresh();
  return { success: true, message: status === "DISABLED" ? "Device disabled." : "Device enabled." };
}

export async function saveMappingAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireBiometric("biometric.mapping");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };

  const parsed = mappingSchema.safeParse({
    deviceId: formData.get("deviceId"),
    deviceUserId: formData.get("deviceUserId"),
    employeeId: formData.get("employeeId"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };

  const orgId = access.user.organization.id;
  const device = await findDeviceById(orgId, parsed.data.deviceId);
  if (!device) return { success: false, message: "Device not found." };

  const maps = await listMappings(orgId);
  const userTaken = maps.find(
    (item) =>
      item.device_id === parsed.data.deviceId &&
      item.device_user_id === parsed.data.deviceUserId &&
      item.status === "ACTIVE"
  );
  if (userTaken) {
    return { success: false, errors: { deviceUserId: ["This device user ID is already mapped."] } };
  }
  const employeeTaken = maps.find(
    (item) =>
      item.device_id === parsed.data.deviceId &&
      item.employee_id === parsed.data.employeeId &&
      item.status === "ACTIVE"
  );
  if (employeeTaken) {
    return { success: false, errors: { employeeId: ["This employee is already mapped on this device."] } };
  }

  const mapping: BiometricIdentityMap = {
    id: crypto.randomUUID(),
    organization_id: orgId,
    device_id: parsed.data.deviceId,
    device_user_id: parsed.data.deviceUserId,
    employee_id: parsed.data.employeeId,
    status: "ACTIVE",
    created_by: access.user.id,
    created_at: stamp(),
    updated_at: stamp(),
  };
  await insertMapping(mapping);
  await writeAudit({
    organizationId: orgId,
    actorUserId: access.user.id,
    action: "biometric.mapping.create",
    entityType: "biometric_identity_map",
    entityId: mapping.id,
    metadata: { deviceId: mapping.device_id, deviceUserId: mapping.device_user_id, employeeId: mapping.employee_id },
  });
  refresh();
  return { success: true, message: "Identity mapped." };
}

export async function setMappingStatusAction(id: string, enable: boolean): Promise<ActionResult> {
  const access = await requireBiometric("biometric.mapping");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const maps = await listMappings(access.user.organization.id);
  const mapping = maps.find((item) => item.id === id);
  if (!mapping) return { success: false, message: "Mapping not found." };
  if (enable) {
    const conflict = maps.find(
      (item) =>
        item.id !== id &&
        item.status === "ACTIVE" &&
        item.device_id === mapping.device_id &&
        (item.device_user_id === mapping.device_user_id || item.employee_id === mapping.employee_id)
    );
    if (conflict) return { success: false, message: "Another active mapping already uses this user or employee." };
  }
  await updateMapping(id, { status: enable ? "ACTIVE" : "DISABLED" });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: enable ? "biometric.mapping.enable" : "biometric.mapping.disable",
    entityType: "biometric_identity_map",
    entityId: id,
  });
  refresh();
  return { success: true, message: enable ? "Mapping enabled." : "Mapping disabled." };
}

export async function simulatePunchAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireBiometric("biometric.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };

  const parsed = simulatePunchSchema.safeParse({
    deviceId: formData.get("deviceId"),
    deviceUserId: formData.get("deviceUserId"),
    punchedAt: optional(formData.get("punchedAt")),
    direction: optional(formData.get("direction")) || "IN",
    verificationMode: optional(formData.get("verificationMode")) || "FINGER",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };

  const device = await findDeviceById(access.user.organization.id, parsed.data.deviceId);
  if (!device) return { success: false, message: "Device not found." };

  const punchedAt = parsed.data.punchedAt ? new Date(parsed.data.punchedAt) : new Date();
  if (Number.isNaN(punchedAt.getTime())) return { success: false, errors: { punchedAt: ["Enter a valid date and time."] } };

  const body = {
    PIN: parsed.data.deviceUserId,
    DateTime: formatLocalDateTime(punchedAt, device.timezone),
    Status: parsed.data.direction ?? "IN",
    Verified: parsed.data.verificationMode ?? "FINGER",
    SN: device.serial_number,
  };
  const request = new Request("http://localhost/api/biometric/simulator", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await ingestBiometricRequest(request, "SIMULATOR", { device });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "biometric.simulate",
    entityType: "biometric_device",
    entityId: device.id,
    metadata: { deviceUserId: parsed.data.deviceUserId, result },
  });
  refresh();
  if (!result.accepted) return { success: false, message: result.message };
  if (result.unmapped) return { success: true, message: "Punch stored as unmapped. Map the device user ID to create a punch." };
  if (result.duplicates) return { success: true, message: "Duplicate punch ignored." };
  return { success: true, message: `Punch ingested. ${result.punches} punch created.` };
}
