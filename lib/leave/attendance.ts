import type { AttendanceDay, AttendanceDayStatus, LeaveDaySession, LeaveRequest, LeaveRequestDay, LeaveType } from "@/types";
import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

function stamp() {
  return new Date().toISOString();
}

function leaveStatus(type: LeaveType, session: LeaveDaySession): AttendanceDayStatus {
  if (type.is_comp_off) return "COMP_OFF";
  if (session !== "FULL") return "HALF_DAY_LEAVE";
  return type.paid ? "PAID_LEAVE" : "UNPAID_LEAVE";
}

export async function applyLeaveToAttendance(request: LeaveRequest, days: LeaveRequestDay[], type: LeaveType) {
  const counted = days.filter((day) => day.counted);
  if (!counted.length) return;
  if (demoEnabled()) {
    const store = getDemoStore();
    for (const day of counted) {
      const existing = store.attendanceDays.find(
        (item) =>
          item.employee_id === request.employee_id &&
          item.work_date === day.work_date &&
          item.session === day.session
      );
      const status = leaveStatus(type, day.session);
      if (existing) {
        existing.previous_status = existing.status;
        existing.status = status;
        existing.leave_request_id = request.id;
        existing.source = "LEAVE";
        existing.updated_at = stamp();
      } else {
        store.attendanceDays.unshift({
          id: crypto.randomUUID(),
          organization_id: request.organization_id,
          employee_id: request.employee_id,
          work_date: day.work_date,
          status,
          session: day.session,
          leave_request_id: request.id,
          source: "LEAVE",
          previous_status: null,
          created_at: stamp(),
          updated_at: stamp(),
        });
      }
    }
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  for (const day of counted) {
    const status = leaveStatus(type, day.session);
    const { data: existing } = await admin
      .from("attendance_days")
      .select("*")
      .eq("organization_id", request.organization_id)
      .eq("employee_id", request.employee_id)
      .eq("work_date", day.work_date)
      .eq("session", day.session)
      .maybeSingle();
    const row = existing as AttendanceDay | null;
    if (row) {
      await admin
        .from("attendance_days")
        .update({
          previous_status: row.status,
          status,
          leave_request_id: request.id,
          source: "LEAVE",
          updated_at: stamp(),
        })
        .eq("id", row.id);
    } else {
      await admin.from("attendance_days").insert({
        organization_id: request.organization_id,
        employee_id: request.employee_id,
        work_date: day.work_date,
        status,
        session: day.session,
        leave_request_id: request.id,
        source: "LEAVE",
      });
    }
  }
}

export async function revertLeaveAttendance(requestId: string) {
  if (demoEnabled()) {
    const store = getDemoStore();
    for (const day of store.attendanceDays.filter((item) => item.leave_request_id === requestId)) {
      if (day.previous_status) {
        day.status = day.previous_status;
        day.previous_status = null;
        day.leave_request_id = null;
        day.source = "RECALC";
        day.updated_at = stamp();
      } else {
        day.status = "ABSENT";
        day.leave_request_id = null;
        day.source = "RECALC";
        day.updated_at = stamp();
      }
    }
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  const { data } = await admin.from("attendance_days").select("*").eq("leave_request_id", requestId);
  for (const row of (data ?? []) as AttendanceDay[]) {
    await admin
      .from("attendance_days")
      .update({
        status: row.previous_status ?? "ABSENT",
        previous_status: null,
        leave_request_id: null,
        source: "RECALC",
        updated_at: stamp(),
      })
      .eq("id", row.id);
  }
}

export async function listAttendanceDays(organizationId: string, from?: string, to?: string) {
  if (demoEnabled()) {
    return getDemoStore().attendanceDays.filter((item) => {
      if (item.organization_id !== organizationId) return false;
      if (from && item.work_date < from) return false;
      if (to && item.work_date > to) return false;
      return true;
    });
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("attendance_days").select("*").eq("organization_id", organizationId);
  if (from) query = query.gte("work_date", from);
  if (to) query = query.lte("work_date", to);
  const { data } = await query.order("work_date", { ascending: false });
  return (data ?? []) as AttendanceDay[];
}
