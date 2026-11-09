import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { belongsToOrganization, scopedRecord } from "@/lib/tenancy";
import type {
  AttendanceDay,
  AttendanceException,
  AttendancePolicy,
  AttendancePunch,
  AttendanceRegularization,
  Shift,
  ShiftAssignment,
} from "@/types";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

function stamp() {
  return new Date().toISOString();
}

export { demoEnabled };

export async function listPunchesInRange(organizationId: string, fromIso: string, toIso: string) {
  if (demoEnabled()) {
    return belongsToOrganization(organizationId, getDemoStore().attendancePunches).filter(
      (item) => item.punched_at >= fromIso && item.punched_at <= toIso
    );
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("attendance_punches")
    .select("*")
    .eq("organization_id", organizationId)
    .gte("punched_at", fromIso)
    .lte("punched_at", toIso)
    .order("punched_at");
  return (data ?? []) as AttendancePunch[];
}

export async function listPunchesForEmployee(organizationId: string, employeeId: string, fromIso: string, toIso: string) {
  const rows = await listPunchesInRange(organizationId, fromIso, toIso);
  return rows.filter((item) => item.employee_id === employeeId);
}

export async function getAttendancePolicy(organizationId: string) {
  if (demoEnabled()) {
    return belongsToOrganization(organizationId, getDemoStore().attendancePolicies)[0] ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("attendance_policies").select("*").eq("organization_id", organizationId).maybeSingle();
  return (data as AttendancePolicy | null) ?? null;
}

export async function upsertAttendancePolicy(row: AttendancePolicy) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const existing = store.attendancePolicies.find((item) => item.organization_id === row.organization_id);
    if (existing) {
      Object.assign(existing, row, { updated_at: stamp() });
      return existing;
    }
    store.attendancePolicies.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin
    .from("attendance_policies")
    .upsert(row, { onConflict: "organization_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as AttendancePolicy;
}

export async function listShifts(organizationId: string) {
  if (demoEnabled()) return belongsToOrganization(organizationId, getDemoStore().shifts);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("shifts").select("*").eq("organization_id", organizationId).order("name");
  return (data ?? []) as Shift[];
}

export async function getShift(organizationId: string, id: string) {
  const rows = await listShifts(organizationId);
  return rows.find((item) => item.id === id) ?? null;
}

export async function upsertShift(row: Shift) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const existing = store.shifts.find((item) => item.id === row.id);
    if (existing) {
      Object.assign(existing, row, { updated_at: stamp() });
      return existing;
    }
    store.shifts.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("shifts").upsert(row).select("*").single();
  if (error) throw error;
  return data as Shift;
}

export async function listShiftAssignments(organizationId: string) {
  if (demoEnabled()) return belongsToOrganization(organizationId, getDemoStore().shiftAssignments);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("shift_assignments").select("*").eq("organization_id", organizationId);
  return (data ?? []) as ShiftAssignment[];
}

export async function insertShiftAssignment(row: ShiftAssignment) {
  if (demoEnabled()) {
    getDemoStore().shiftAssignments.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("shift_assignments").insert(row).select("*").single();
  if (error) throw error;
  return data as ShiftAssignment;
}

export async function upsertAttendanceDay(row: AttendanceDay) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const existing = store.attendanceDays.find(
      (item) =>
        item.organization_id === row.organization_id &&
        item.employee_id === row.employee_id &&
        item.work_date === row.work_date &&
        item.session === row.session
    );
    if (existing) {
      Object.assign(existing, row, { id: existing.id, created_at: existing.created_at, updated_at: stamp() });
      return existing;
    }
    store.attendanceDays.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data: found } = await admin
    .from("attendance_days")
    .select("*")
    .eq("organization_id", row.organization_id)
    .eq("employee_id", row.employee_id)
    .eq("work_date", row.work_date)
    .eq("session", row.session)
    .maybeSingle();
  if (found) {
    const { data, error } = await admin
      .from("attendance_days")
      .update({ ...row, id: (found as AttendanceDay).id, created_at: (found as AttendanceDay).created_at, updated_at: stamp() })
      .eq("id", (found as AttendanceDay).id)
      .select("*")
      .single();
    if (error) throw error;
    return data as AttendanceDay;
  }
  const { data, error } = await admin.from("attendance_days").insert(row).select("*").single();
  if (error) throw error;
  return data as AttendanceDay;
}

export async function listExceptions(organizationId: string, from?: string, to?: string) {
  if (demoEnabled()) {
    return belongsToOrganization(organizationId, getDemoStore().attendanceExceptions).filter((item) => {
      if (from && item.work_date < from) return false;
      if (to && item.work_date > to) return false;
      return true;
    });
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("attendance_exceptions").select("*").eq("organization_id", organizationId);
  if (from) query = query.gte("work_date", from);
  if (to) query = query.lte("work_date", to);
  const { data } = await query.order("work_date", { ascending: false });
  return (data ?? []) as AttendanceException[];
}

export async function replaceDayExceptions(organizationId: string, employeeId: string, workDate: string, rows: AttendanceException[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.attendanceExceptions = store.attendanceExceptions.filter(
      (item) => !(item.organization_id === organizationId && item.employee_id === employeeId && item.work_date === workDate)
    );
    store.attendanceExceptions.unshift(...rows);
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  await admin
    .from("attendance_exceptions")
    .delete()
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("work_date", workDate);
  if (rows.length) await admin.from("attendance_exceptions").insert(rows);
}

export async function insertExceptionIfAbsent(row: AttendanceException) {
  const existing = await listExceptions(row.organization_id, row.work_date, row.work_date);
  const found = existing.find(
    (item) => item.employee_id === row.employee_id && item.code === row.code && item.status === "OPEN"
  );
  if (found) return found;
  if (demoEnabled()) {
    getDemoStore().attendanceExceptions.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("attendance_exceptions").insert(row).select("*").single();
  if (error) {
    if (error.code === "23505") {
      const again = await listExceptions(row.organization_id, row.work_date, row.work_date);
      return again.find((item) => item.employee_id === row.employee_id && item.code === row.code) ?? row;
    }
    throw error;
  }
  return data as AttendanceException;
}

export async function updateException(id: string, organizationId: string, patch: Partial<AttendanceException>) {
  if (demoEnabled()) {
    const row = scopedRecord(organizationId, getDemoStore().attendanceExceptions.find((item) => item.id === id));
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("attendance_exceptions")
    .update({ ...patch, updated_at: stamp() })
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as AttendanceException | null;
}

export async function listRegularizations(organizationId: string) {
  if (demoEnabled()) return belongsToOrganization(organizationId, getDemoStore().attendanceRegularizations);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("attendance_regularizations")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as AttendanceRegularization[];
}

export async function getRegularization(organizationId: string, id: string) {
  const rows = await listRegularizations(organizationId);
  return rows.find((item) => item.id === id) ?? null;
}

export async function insertRegularization(row: AttendanceRegularization) {
  if (demoEnabled()) {
    getDemoStore().attendanceRegularizations.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("attendance_regularizations").insert(row).select("*").single();
  if (error) throw error;
  return data as AttendanceRegularization;
}

export async function updateRegularization(id: string, organizationId: string, patch: Partial<AttendanceRegularization>) {
  if (demoEnabled()) {
    const row = scopedRecord(organizationId, getDemoStore().attendanceRegularizations.find((item) => item.id === id));
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("attendance_regularizations")
    .update({ ...patch, updated_at: stamp() })
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as AttendanceRegularization | null;
}
