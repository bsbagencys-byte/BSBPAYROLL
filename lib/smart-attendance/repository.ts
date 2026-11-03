import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AttendanceLocationConfig,
  AttendanceVerificationRecord,
  DeviceSecurityAssessment,
  DynamicQrSession,
  GeofenceEventCandidate,
  SmartAttendanceEvent,
  SmartAttendanceSettings,
  TrustedEmployeeDevice,
} from "@/types";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

export function stamp() {
  return new Date().toISOString();
}

function upsertLocal<T extends { id: string }>(rows: T[], row: T) {
  const index = rows.findIndex((item) => item.id === row.id);
  if (index >= 0) rows[index] = row;
  else rows.unshift(row);
  return row;
}

async function upsertTable<T extends { id: string }>(table: string, row: T): Promise<T> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from(table).upsert(row).select("*").single();
  if (error) throw error;
  return data as T;
}

export async function getSmartSettings(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore().smartAttendanceSettings.find((row) => row.organization_id === organizationId) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("smart_attendance_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return (data as SmartAttendanceSettings | null) ?? null;
}

export async function upsertSmartSettings(row: SmartAttendanceSettings) {
  if (demoEnabled()) return upsertLocal(getDemoStore().smartAttendanceSettings, row);
  return upsertTable("smart_attendance_settings", row);
}

export async function listWorkplaces(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore().attendanceLocationConfigs.filter((row) => row.organization_id === organizationId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("attendance_location_configs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");
  return (data ?? []) as AttendanceLocationConfig[];
}

export async function getWorkplace(organizationId: string, id: string) {
  const rows = await listWorkplaces(organizationId);
  return rows.find((row) => row.id === id) ?? null;
}

export async function upsertWorkplace(row: AttendanceLocationConfig) {
  if (demoEnabled()) return upsertLocal(getDemoStore().attendanceLocationConfigs, row);
  return upsertTable("attendance_location_configs", row);
}

export async function listTrustedDevices(organizationId: string, employeeId?: string) {
  if (demoEnabled()) {
    return getDemoStore().trustedEmployeeDevices.filter(
      (row) => row.organization_id === organizationId && (!employeeId || row.employee_id === employeeId)
    );
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("trusted_employee_devices").select("*").eq("organization_id", organizationId);
  if (employeeId) query = query.eq("employee_id", employeeId);
  const { data } = await query.order("registered_at", { ascending: false });
  return (data ?? []) as TrustedEmployeeDevice[];
}

export async function getTrustedDevice(organizationId: string, id: string) {
  const rows = await listTrustedDevices(organizationId);
  return rows.find((row) => row.id === id) ?? null;
}

export async function findTrustedDeviceByKey(organizationId: string, publicKey: string) {
  const rows = await listTrustedDevices(organizationId);
  return rows.find((row) => row.public_key === publicKey) ?? null;
}

export async function upsertTrustedDevice(row: TrustedEmployeeDevice) {
  if (demoEnabled()) return upsertLocal(getDemoStore().trustedEmployeeDevices, row);
  return upsertTable("trusted_employee_devices", row);
}

export async function insertGeofenceCandidate(row: GeofenceEventCandidate) {
  if (demoEnabled()) {
    const exists = getDemoStore().geofenceEventCandidates.find((item) => item.idempotency_key === row.idempotency_key);
    if (exists) return exists;
    getDemoStore().geofenceEventCandidates.unshift(row);
    getDemoStore().geofenceEventCandidates = getDemoStore().geofenceEventCandidates.slice(0, 1000);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("geofence_event_candidates").insert(row).select("*").single();
  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await admin
        .from("geofence_event_candidates")
        .select("*")
        .eq("idempotency_key", row.idempotency_key)
        .maybeSingle();
      return existing as GeofenceEventCandidate;
    }
    throw error;
  }
  return data as GeofenceEventCandidate;
}

export async function listSmartEvents(organizationId: string, employeeId?: string) {
  if (demoEnabled()) {
    return getDemoStore()
      .smartAttendanceEvents.filter(
        (row) => row.organization_id === organizationId && (!employeeId || row.employee_id === employeeId)
      )
      .slice(0, 300);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("smart_attendance_events").select("*").eq("organization_id", organizationId);
  if (employeeId) query = query.eq("employee_id", employeeId);
  const { data } = await query.order("occurred_at", { ascending: false }).limit(300);
  return (data ?? []) as SmartAttendanceEvent[];
}

export async function getSmartEvent(organizationId: string, id: string) {
  const rows = await listSmartEvents(organizationId);
  return rows.find((row) => row.id === id) ?? null;
}

export async function findSmartEventByKey(organizationId: string, idempotencyKey: string) {
  if (demoEnabled()) {
    return (
      getDemoStore().smartAttendanceEvents.find(
        (row) => row.organization_id === organizationId && row.idempotency_key === idempotencyKey
      ) ?? null
    );
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("smart_attendance_events")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  return (data as SmartAttendanceEvent | null) ?? null;
}

export async function upsertSmartEvent(row: SmartAttendanceEvent) {
  if (demoEnabled()) return upsertLocal(getDemoStore().smartAttendanceEvents, row);
  return upsertTable("smart_attendance_events", row);
}

export async function listVerifications(organizationId: string, eventId?: string) {
  if (demoEnabled()) {
    return getDemoStore().attendanceVerificationRecords.filter(
      (row) => row.organization_id === organizationId && (!eventId || row.event_id === eventId)
    );
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("attendance_verification_records").select("*").eq("organization_id", organizationId);
  if (eventId) query = query.eq("event_id", eventId);
  const { data } = await query.order("recorded_at", { ascending: false });
  return (data ?? []) as AttendanceVerificationRecord[];
}

export async function insertVerification(row: AttendanceVerificationRecord) {
  if (demoEnabled()) {
    getDemoStore().attendanceVerificationRecords.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("attendance_verification_records").insert(row).select("*").single();
  if (error) throw error;
  return data as AttendanceVerificationRecord;
}

export async function insertSecurityAssessment(row: DeviceSecurityAssessment) {
  if (demoEnabled()) {
    getDemoStore().deviceSecurityAssessments.unshift(row);
    getDemoStore().deviceSecurityAssessments = getDemoStore().deviceSecurityAssessments.slice(0, 500);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("device_security_assessments").insert(row).select("*").single();
  if (error) throw error;
  return data as DeviceSecurityAssessment;
}

export async function listQrSessions(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore().dynamicQrSessions.filter((row) => row.organization_id === organizationId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("dynamic_qr_sessions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as DynamicQrSession[];
}

export async function findQrSessionByHash(tokenHash: string) {
  if (demoEnabled()) {
    return getDemoStore().dynamicQrSessions.find((row) => row.token_hash === tokenHash) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("dynamic_qr_sessions").select("*").eq("token_hash", tokenHash).maybeSingle();
  return (data as DynamicQrSession | null) ?? null;
}

export async function upsertQrSession(row: DynamicQrSession) {
  if (demoEnabled()) return upsertLocal(getDemoStore().dynamicQrSessions, row);
  return upsertTable("dynamic_qr_sessions", row);
}

export async function expireQrSessions(nowIso: string) {
  if (demoEnabled()) {
    let count = 0;
    for (const row of getDemoStore().dynamicQrSessions) {
      if (row.status === "ACTIVE" && row.expires_at < nowIso) {
        row.status = "EXPIRED";
        row.updated_at = nowIso;
        count += 1;
      }
    }
    return { expired: count };
  }
  const admin = createAdminClient();
  if (!admin) return { expired: 0 };
  const { data } = await admin
    .from("dynamic_qr_sessions")
    .update({ status: "EXPIRED", updated_at: nowIso })
    .eq("status", "ACTIVE")
    .lt("expires_at", nowIso)
    .select("id");
  return { expired: data?.length ?? 0 };
}
