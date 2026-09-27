import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashesEqual } from "@/lib/biometric/hash";
import { isStale } from "@/lib/biometric/time";
import type {
  AttendancePunch,
  BiometricDevice,
  BiometricIdentityMap,
  BiometricNormalizedEvent,
  BiometricRawEvent,
} from "@/types";
import type { BiometricEventStatus, DeviceStatus } from "@/lib/constants";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

function stamp() {
  return new Date().toISOString();
}

export async function findDeviceByToken(tokenHash: string): Promise<BiometricDevice | null> {
  if (demoEnabled()) {
    const device = getDemoStore().biometricDevices.find((item) => hashesEqual(item.token_hash, tokenHash));
    return device ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("biometric_devices").select("*").eq("token_hash", tokenHash).maybeSingle();
  return (data as BiometricDevice | null) ?? null;
}

export async function findDeviceById(organizationId: string, id: string): Promise<BiometricDevice | null> {
  if (demoEnabled()) {
    return getDemoStore().biometricDevices.find((item) => item.organization_id === organizationId && item.id === id) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("biometric_devices")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  return (data as BiometricDevice | null) ?? null;
}

export async function listDevices(organizationId: string): Promise<BiometricDevice[]> {
  if (demoEnabled()) {
    return getDemoStore().biometricDevices.filter((item) => item.organization_id === organizationId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("biometric_devices").select("*").eq("organization_id", organizationId).order("name");
  return (data ?? []) as BiometricDevice[];
}

export async function insertDevice(device: BiometricDevice) {
  if (demoEnabled()) {
    getDemoStore().biometricDevices.unshift(device);
    return device;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("biometric_devices").insert(device).select("*").single();
  if (error) throw error;
  return data as BiometricDevice;
}

export async function updateDevice(
  organizationId: string,
  id: string,
  patch: Partial<BiometricDevice>
): Promise<BiometricDevice | null> {
  if (demoEnabled()) {
    const store = getDemoStore();
    const device = store.biometricDevices.find((item) => item.organization_id === organizationId && item.id === id);
    if (!device) return null;
    Object.assign(device, patch, { updated_at: stamp() });
    return device;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("biometric_devices")
    .update({ ...patch, updated_at: stamp() })
    .eq("organization_id", organizationId)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as BiometricDevice | null) ?? null;
}

export async function touchDevice(deviceId: string, status: DeviceStatus, lastError: string | null) {
  const lastSeen = stamp();
  if (demoEnabled()) {
    const device = getDemoStore().biometricDevices.find((item) => item.id === deviceId);
    if (!device) return;
    device.last_seen_at = lastSeen;
    device.last_error = lastError;
    if (device.status !== "DISABLED") device.status = status;
    device.updated_at = lastSeen;
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  const patch: Record<string, unknown> = { last_seen_at: lastSeen, last_error: lastError, updated_at: lastSeen };
  if (status) patch.status = status;
  await admin.from("biometric_devices").update(patch).eq("id", deviceId).neq("status", "DISABLED");
}

export async function insertRawEvent(event: BiometricRawEvent) {
  if (demoEnabled()) {
    getDemoStore().biometricRawEvents.unshift(event);
    getDemoStore().biometricRawEvents = getDemoStore().biometricRawEvents.slice(0, 500);
    return event;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("biometric_raw_events").insert(event).select("*").single();
  if (error) throw error;
  return data as BiometricRawEvent;
}

export async function updateRawEvent(id: string, patch: Partial<BiometricRawEvent>) {
  if (demoEnabled()) {
    const event = getDemoStore().biometricRawEvents.find((item) => item.id === id);
    if (!event) return;
    Object.assign(event, patch);
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("biometric_raw_events").update(patch).eq("id", id);
}

export async function findDuplicateNormalized(deviceId: string, deviceUserId: string, punchedAt: string) {
  if (demoEnabled()) {
    return (
      getDemoStore().biometricNormalizedEvents.find(
        (item) => item.device_id === deviceId && item.device_user_id === deviceUserId && item.punched_at === punchedAt
      ) ?? null
    );
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("biometric_normalized_events")
    .select("*")
    .eq("device_id", deviceId)
    .eq("device_user_id", deviceUserId)
    .eq("punched_at", punchedAt)
    .maybeSingle();
  return (data as BiometricNormalizedEvent | null) ?? null;
}

export async function insertNormalizedEvent(event: BiometricNormalizedEvent) {
  if (demoEnabled()) {
    getDemoStore().biometricNormalizedEvents.unshift(event);
    getDemoStore().biometricNormalizedEvents = getDemoStore().biometricNormalizedEvents.slice(0, 500);
    return event;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("biometric_normalized_events").insert(event).select("*").single();
  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }
  return data as BiometricNormalizedEvent;
}

export async function updateNormalizedEvent(id: string, status: BiometricEventStatus) {
  if (demoEnabled()) {
    const event = getDemoStore().biometricNormalizedEvents.find((item) => item.id === id);
    if (event) event.status = status;
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("biometric_normalized_events").update({ status }).eq("id", id);
}

export async function findActiveMapping(deviceId: string, deviceUserId: string): Promise<BiometricIdentityMap | null> {
  if (demoEnabled()) {
    return (
      getDemoStore().biometricIdentityMaps.find(
        (item) => item.device_id === deviceId && item.device_user_id === deviceUserId && item.status === "ACTIVE"
      ) ?? null
    );
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("biometric_identity_maps")
    .select("*")
    .eq("device_id", deviceId)
    .eq("device_user_id", deviceUserId)
    .eq("status", "ACTIVE")
    .maybeSingle();
  return (data as BiometricIdentityMap | null) ?? null;
}

export async function listMappings(organizationId: string): Promise<BiometricIdentityMap[]> {
  if (demoEnabled()) {
    return getDemoStore().biometricIdentityMaps.filter((item) => item.organization_id === organizationId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("biometric_identity_maps")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as BiometricIdentityMap[];
}

export async function insertMapping(mapping: BiometricIdentityMap) {
  if (demoEnabled()) {
    getDemoStore().biometricIdentityMaps.unshift(mapping);
    return mapping;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("biometric_identity_maps").insert(mapping).select("*").single();
  if (error) throw error;
  return data as BiometricIdentityMap;
}

export async function updateMapping(id: string, patch: Partial<BiometricIdentityMap>) {
  if (demoEnabled()) {
    const mapping = getDemoStore().biometricIdentityMaps.find((item) => item.id === id);
    if (!mapping) return null;
    Object.assign(mapping, patch, { updated_at: stamp() });
    return mapping;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("biometric_identity_maps")
    .update({ ...patch, updated_at: stamp() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as BiometricIdentityMap | null;
}

export async function insertPunch(punch: AttendancePunch) {
  if (demoEnabled()) {
    const exists = getDemoStore().attendancePunches.find(
      (item) => item.device_id === punch.device_id && item.employee_id === punch.employee_id && item.punched_at === punch.punched_at
    );
    if (exists) return exists;
    getDemoStore().attendancePunches.unshift(punch);
    getDemoStore().attendancePunches = getDemoStore().attendancePunches.slice(0, 500);
    return punch;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("attendance_punches").insert(punch).select("*").single();
  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }
  return data as AttendancePunch;
}

export async function listPunches(organizationId: string, limit = 100) {
  if (demoEnabled()) {
    return getDemoStore()
      .attendancePunches.filter((item) => item.organization_id === organizationId)
      .slice(0, limit);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("attendance_punches")
    .select("*")
    .eq("organization_id", organizationId)
    .order("punched_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AttendancePunch[];
}

export async function listRawEvents(organizationId: string, limit = 100) {
  if (demoEnabled()) {
    return getDemoStore()
      .biometricRawEvents.filter((item) => item.organization_id === organizationId)
      .slice(0, limit);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("biometric_raw_events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("received_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as BiometricRawEvent[];
}

export async function listNormalizedEvents(organizationId: string, limit = 200) {
  if (demoEnabled()) {
    return getDemoStore()
      .biometricNormalizedEvents.filter((item) => item.organization_id === organizationId)
      .slice(0, limit);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("biometric_normalized_events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as BiometricNormalizedEvent[];
}

export async function listUnmappedEvents(organizationId: string) {
  const events = await listNormalizedEvents(organizationId, 300);
  return events.filter((item) => item.status === "UNMAPPED");
}

export function effectiveDeviceStatus(device: BiometricDevice): DeviceStatus {
  if (device.status === "DISABLED" || device.status === "PENDING") return device.status;
  if (isStale(device.last_seen_at)) return "OFFLINE";
  return device.status;
}

export { demoEnabled };
