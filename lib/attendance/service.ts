import { writeAudit } from "@/lib/audit";
import {
  calculateAttendanceDay,
  calendarKind,
  dateInPayrollPeriod,
  defaultAttendancePolicy,
  exceptionCodesFor,
  localParts,
  workDateForPunch,
  zonedDate,
  type AttendancePolicyConfig,
  type EnginePunch,
  type ShiftConfig,
} from "@/lib/attendance/engine";
import {
  getAttendancePolicy,
  getRegularization,
  getShift,
  insertRegularization,
  insertShiftAssignment,
  listExceptions,
  listPunchesForEmployee,
  listPunchesInRange,
  listRegularizations,
  listShiftAssignments,
  listShifts,
  replaceDayExceptions,
  updateException,
  updateRegularization,
  upsertAttendanceDay,
  upsertAttendancePolicy,
  upsertShift,
} from "@/lib/attendance/repository";
import { DEFAULT_ATTENDANCE_POLICY, DEMO_SHIFT_ID } from "@/lib/constants";
import { emitSafe } from "@/lib/events/emit";
import { listAttendanceDays } from "@/lib/leave/attendance";
import { addDays, eachDate, todayInZone } from "@/lib/leave/dates";
import { listEmployment, listHolidays } from "@/lib/leave/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { listPayrollRuns } from "@/lib/payroll/repository";
import { isPayrollImmutable } from "@/lib/payroll/workflow";
import { belongsToOrganization } from "@/lib/tenancy";
import type {
  AttendanceDay,
  AttendanceDayStatus,
  AttendanceException,
  AttendanceExceptionCode,
  AttendancePolicy,
  AttendancePunch,
  AttendanceRegisterRow,
  AttendanceRegularization,
  Employee,
  Shift,
  ShiftAssignment,
} from "@/types";

function stamp() {
  return new Date().toISOString();
}

function asBool(value: unknown) {
  return value === true || value === "on" || value === "true";
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const LEAVE_STATUSES = new Set<AttendanceDayStatus>(["PAID_LEAVE", "UNPAID_LEAVE", "HALF_DAY_LEAVE", "COMP_OFF"]);

export function policyConfig(row: AttendancePolicy | null): AttendancePolicyConfig {
  if (!row) return defaultAttendancePolicy();
  return {
    graceMinutes: row.grace_minutes,
    breakMinutes: row.break_minutes,
    fullDayMinutes: row.full_day_minutes,
    halfDayMinutes: row.half_day_minutes,
    otMinimumMinutes: row.ot_minimum_minutes,
    otRoundingMinutes: row.ot_rounding_minutes,
    punchPairing: row.punch_pairing,
    allowOvernight: row.allow_overnight,
  };
}

export function shiftConfig(row: Shift | null): ShiftConfig {
  return {
    startTime: row?.start_time ?? "09:00",
    endTime: row?.end_time ?? "18:00",
    breakMinutes: row?.break_minutes ?? DEFAULT_ATTENDANCE_POLICY.breakMinutes,
    overnight: row?.overnight ?? false,
  };
}

export async function ensureAttendanceDefaults(organizationId: string, actorId: string | null) {
  const existing = await getAttendancePolicy(organizationId);
  if (!existing) {
    await upsertAttendancePolicy({
      id: crypto.randomUUID(),
      organization_id: organizationId,
      grace_minutes: DEFAULT_ATTENDANCE_POLICY.graceMinutes,
      break_minutes: DEFAULT_ATTENDANCE_POLICY.breakMinutes,
      full_day_minutes: DEFAULT_ATTENDANCE_POLICY.fullDayMinutes,
      half_day_minutes: DEFAULT_ATTENDANCE_POLICY.halfDayMinutes,
      ot_minimum_minutes: DEFAULT_ATTENDANCE_POLICY.otMinimumMinutes,
      ot_rounding_minutes: DEFAULT_ATTENDANCE_POLICY.otRoundingMinutes,
      punch_pairing: DEFAULT_ATTENDANCE_POLICY.punchPairing,
      allow_overnight: DEFAULT_ATTENDANCE_POLICY.allowOvernight,
      created_by: actorId,
      updated_by: actorId,
      created_at: stamp(),
      updated_at: stamp(),
    });
  }
  const shifts = await listShifts(organizationId);
  if (!shifts.length) {
    await upsertShift({
      id: organizationId === "11111111-1111-1111-1111-111111111111" ? DEMO_SHIFT_ID : crypto.randomUUID(),
      organization_id: organizationId,
      name: "General",
      code: "GEN",
      start_time: "09:00",
      end_time: "18:00",
      break_minutes: 60,
      overnight: false,
      status: "ACTIVE",
      created_by: actorId,
      updated_by: actorId,
      created_at: stamp(),
      updated_at: stamp(),
    });
  }
}

function resolveShift(assignments: ShiftAssignment[], shifts: Shift[], employeeId: string, workDate: string) {
  const active = assignments
    .filter((item) => item.employee_id === employeeId && item.effective_from <= workDate && (!item.effective_to || item.effective_to >= workDate))
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
  const fallback = shifts.find((item) => item.status === "ACTIVE") ?? shifts[0] ?? null;
  return (active ? shifts.find((item) => item.id === active.shift_id) : null) ?? fallback;
}

async function lockedDates(organizationId: string) {
  const runs = await listPayrollRuns(organizationId);
  return runs
    .filter((run) => isPayrollImmutable(run.status))
    .map((run) => ({ from: run.period_from, to: run.period_to }));
}

function isLocked(workDate: string, periods: Array<{ from: string; to: string }>) {
  return periods.some((period) => dateInPayrollPeriod(workDate, period.from, period.to));
}

function toEnginePunches(rows: AttendancePunch[]): EnginePunch[] {
  return rows.map((row) => ({
    id: row.id,
    punchedAt: new Date(row.punched_at),
    direction: row.direction,
  }));
}

export async function savePolicyRow(
  organizationId: string,
  actorId: string,
  input: {
    graceMinutes: string;
    breakMinutes: string;
    fullDayMinutes: string;
    halfDayMinutes: string;
    otMinimumMinutes: string;
    otRoundingMinutes: string;
    punchPairing: AttendancePolicy["punch_pairing"];
    allowOvernight?: unknown;
  }
) {
  await ensureAttendanceDefaults(organizationId, actorId);
  const existing = await getAttendancePolicy(organizationId);
  const row = await upsertAttendancePolicy({
    id: existing?.id ?? crypto.randomUUID(),
    organization_id: organizationId,
    grace_minutes: asNumber(input.graceMinutes, DEFAULT_ATTENDANCE_POLICY.graceMinutes),
    break_minutes: asNumber(input.breakMinutes, DEFAULT_ATTENDANCE_POLICY.breakMinutes),
    full_day_minutes: asNumber(input.fullDayMinutes, DEFAULT_ATTENDANCE_POLICY.fullDayMinutes),
    half_day_minutes: asNumber(input.halfDayMinutes, DEFAULT_ATTENDANCE_POLICY.halfDayMinutes),
    ot_minimum_minutes: asNumber(input.otMinimumMinutes, DEFAULT_ATTENDANCE_POLICY.otMinimumMinutes),
    ot_rounding_minutes: asNumber(input.otRoundingMinutes, DEFAULT_ATTENDANCE_POLICY.otRoundingMinutes),
    punch_pairing: input.punchPairing,
    allow_overnight: asBool(input.allowOvernight ?? true),
    created_by: existing?.created_by ?? actorId,
    updated_by: actorId,
    created_at: existing?.created_at ?? stamp(),
    updated_at: stamp(),
  });
  await writeAudit({
    organizationId,
    actorUserId: actorId,
    action: "attendance.policy.update",
    entityType: "attendance_policy",
    entityId: row.id,
  });
  return row;
}

export async function saveShiftRow(
  organizationId: string,
  actorId: string,
  input: {
    id?: string;
    name: string;
    code: string;
    startTime: string;
    endTime: string;
    breakMinutes: string;
    overnight?: unknown;
    status?: Shift["status"];
  }
) {
  const existing = input.id ? await getShift(organizationId, input.id) : null;
  const row = await upsertShift({
    id: existing?.id ?? crypto.randomUUID(),
    organization_id: organizationId,
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    start_time: input.startTime,
    end_time: input.endTime,
    break_minutes: asNumber(input.breakMinutes, 60),
    overnight: asBool(input.overnight),
    status: input.status ?? existing?.status ?? "ACTIVE",
    created_by: existing?.created_by ?? actorId,
    updated_by: actorId,
    created_at: existing?.created_at ?? stamp(),
    updated_at: stamp(),
  });
  await writeAudit({
    organizationId,
    actorUserId: actorId,
    action: existing ? "attendance.shift.update" : "attendance.shift.create",
    entityType: "shift",
    entityId: row.id,
  });
  return row;
}

export async function assignShiftRow(
  organizationId: string,
  actorId: string,
  input: { employeeId: string; shiftId: string; effectiveFrom: string; effectiveTo?: string }
) {
  const catalog = await loadOrgCatalog(organizationId);
  const employee = catalog.employees.find((item) => item.id === input.employeeId);
  if (!employee || employee.organization_id !== organizationId) throw new Error("Employee not found.");
  const shift = await getShift(organizationId, input.shiftId);
  if (!shift) throw new Error("Shift not found.");
  const row = await insertShiftAssignment({
    id: crypto.randomUUID(),
    organization_id: organizationId,
    employee_id: input.employeeId,
    shift_id: input.shiftId,
    effective_from: input.effectiveFrom,
    effective_to: input.effectiveTo || null,
    created_by: actorId,
    created_at: stamp(),
  });
  await writeAudit({
    organizationId,
    actorUserId: actorId,
    action: "attendance.shift.assign",
    entityType: "shift_assignment",
    entityId: row.id,
  });
  return row;
}

export async function recalculateAttendance(input: {
  organizationId: string;
  actorId: string | null;
  from: string;
  to: string;
  employeeId?: string | null;
  timezone: string;
  weeklyOff: string;
}) {
  await ensureAttendanceDefaults(input.organizationId, input.actorId);
  const [policy, shifts, assignments, holidays, days, employment, catalog, periods] = await Promise.all([
    getAttendancePolicy(input.organizationId),
    listShifts(input.organizationId),
    listShiftAssignments(input.organizationId),
    listHolidays(input.organizationId),
    listAttendanceDays(input.organizationId, addDays(input.from, -1), addDays(input.to, 1)),
    listEmployment(input.organizationId),
    loadOrgCatalog(input.organizationId),
    lockedDates(input.organizationId),
  ]);
  const holidaySet = new Set(holidays.filter((item) => item.status === "ACTIVE").map((item) => item.holiday_date));
  const employees = catalog.employees.filter((item) => {
    if (item.organization_id !== input.organizationId) return false;
    if (input.employeeId && item.id !== input.employeeId) return false;
    return item.status === "ACTIVE" || item.status === "ON_NOTICE";
  });
  const fromIso = `${addDays(input.from, -1)}T00:00:00.000Z`;
  const toIso = `${addDays(input.to, 1)}T23:59:59.999Z`;
  const punches = await listPunchesInRange(input.organizationId, fromIso, toIso);
  const config = policyConfig(policy);
  let written = 0;
  let skippedLocked = 0;
  for (const employee of employees) {
    const job = employment.find((item) => item.employee_id === employee.id);
    const employeePunches = punches.filter((item) => item.employee_id === employee.id);
    for (const workDate of eachDate(input.from, input.to)) {
      if (job?.joining_date && workDate < job.joining_date) continue;
      if (isLocked(workDate, periods)) {
        skippedLocked += 1;
        continue;
      }
      const shift = resolveShift(assignments, shifts, employee.id, workDate);
      const cfg = shiftConfig(shift);
      const dayPunches = employeePunches.filter((punch) => workDateForPunch(new Date(punch.punched_at), input.timezone, cfg) === workDate);
      const existing = days.find((item) => item.employee_id === employee.id && item.work_date === workDate && item.session === "FULL");
      const leave =
        existing && LEAVE_STATUSES.has(existing.status)
          ? { status: existing.status, source: existing.source }
          : null;
      const result = calculateAttendanceDay({
        workDate,
        timezone: input.timezone,
        shift: cfg,
        policy: config,
        punches: toEnginePunches(dayPunches),
        calendar: calendarKind(workDate, input.weeklyOff, holidaySet),
        leave,
      });
      const row: AttendanceDay = {
        id: existing?.id ?? crypto.randomUUID(),
        organization_id: input.organizationId,
        employee_id: employee.id,
        work_date: workDate,
        status: result.status,
        session: "FULL",
        leave_request_id: leave ? existing?.leave_request_id ?? null : null,
        source: result.source,
        previous_status: leave ? existing?.previous_status ?? null : existing && !LEAVE_STATUSES.has(existing.status) ? existing.status : null,
        shift_id: shift?.id ?? null,
        first_in: result.firstIn?.toISOString() ?? null,
        last_out: result.lastOut?.toISOString() ?? null,
        worked_minutes: result.workedMinutes,
        late_minutes: result.lateMinutes,
        early_exit_minutes: result.earlyExitMinutes,
        ot_minutes: result.otMinutes,
        locked: false,
        created_at: existing?.created_at ?? stamp(),
        updated_at: stamp(),
      };
      const saved = await upsertAttendanceDay(row);
      const codes = exceptionCodesFor(result, calendarKind(workDate, input.weeklyOff, holidaySet));
      await replaceDayExceptions(
        input.organizationId,
        employee.id,
        workDate,
        codes.map((code) => ({
          id: crypto.randomUUID(),
          organization_id: input.organizationId,
          employee_id: employee.id,
          work_date: workDate,
          attendance_day_id: saved.id,
          code,
          status: "OPEN",
          notes: null,
          created_at: stamp(),
          updated_at: stamp(),
        }))
      );
      written += 1;
      await emitSafe({
        organizationId: input.organizationId,
        eventType: "attendance.day.calculated",
        entityType: "attendance_day",
        entityId: saved.id,
        payload: { status: result.status, href: "/attendance/daily", workDate },
        idempotencyKey: `attendance.day.calculated:${saved.id}:${workDate}:${result.status}`,
      });
    }
  }
  if (input.actorId) {
    await writeAudit({
      organizationId: input.organizationId,
      actorUserId: input.actorId,
      action: "attendance.recalculate",
      entityType: "attendance_days",
      entityId: input.organizationId,
      metadata: { from: input.from, to: input.to, written, skippedLocked },
    });
  }
  return { written, skippedLocked, employees: employees.length };
}

export async function submitRegularization(
  organizationId: string,
  actorId: string,
  input: { employeeId: string; workDate: string; requestedIn?: string; requestedOut?: string; reason: string }
) {
  const catalog = await loadOrgCatalog(organizationId);
  const employee = catalog.employees.find((item) => item.id === input.employeeId);
  if (!employee || employee.organization_id !== organizationId) throw new Error("Employee not found.");
  const periods = await lockedDates(organizationId);
  if (isLocked(input.workDate, periods)) throw new Error("Finalized payroll attendance cannot be changed.");
  const days = await listAttendanceDays(organizationId, input.workDate, input.workDate);
  const existing = days.find((item) => item.employee_id === input.employeeId && item.work_date === input.workDate);
  const row = await insertRegularization({
    id: crypto.randomUUID(),
    organization_id: organizationId,
    employee_id: input.employeeId,
    work_date: input.workDate,
    requested_in: input.requestedIn || null,
    requested_out: input.requestedOut || null,
    reason: input.reason.trim(),
    status: "PENDING",
    decided_by: null,
    decided_at: null,
    decision_notes: null,
    original_first_in: existing?.first_in ?? null,
    original_last_out: existing?.last_out ?? null,
    created_by: actorId,
    created_at: stamp(),
    updated_at: stamp(),
  });
  await writeAudit({
    organizationId,
    actorUserId: actorId,
    action: "attendance.regularization.submit",
    entityType: "attendance_regularization",
    entityId: row.id,
  });
  return row;
}

export async function decideRegularization(
  organizationId: string,
  actorId: string,
  input: { id: string; decision: "APPROVED" | "REJECTED"; notes?: string; timezone: string; weeklyOff: string }
) {
  const row = await getRegularization(organizationId, input.id);
  if (!row) throw new Error("Regularization not found.");
  if (row.status !== "PENDING") throw new Error("Only pending requests can be decided.");
  const updated = await updateRegularization(input.id, organizationId, {
    status: input.decision,
    decided_by: actorId,
    decided_at: stamp(),
    decision_notes: input.notes || null,
  });
  if (input.decision === "APPROVED") {
    const existingDays = await listAttendanceDays(organizationId, row.work_date, row.work_date);
    const existing = existingDays.find((item) => item.employee_id === row.employee_id && item.work_date === row.work_date);
    const punches: EnginePunch[] = [];
    if (row.requested_in) punches.push({ id: "reg-in", punchedAt: new Date(row.requested_in), direction: "IN" });
    if (row.requested_out) punches.push({ id: "reg-out", punchedAt: new Date(row.requested_out), direction: "OUT" });
    const [policy, shifts, assignments, holidays, periods] = await Promise.all([
      getAttendancePolicy(organizationId),
      listShifts(organizationId),
      listShiftAssignments(organizationId),
      listHolidays(organizationId),
      lockedDates(organizationId),
    ]);
    if (isLocked(row.work_date, periods)) throw new Error("Finalized payroll attendance cannot be changed.");
    const holidaySet = new Set(holidays.filter((item) => item.status === "ACTIVE").map((item) => item.holiday_date));
    const shift = resolveShift(assignments, shifts, row.employee_id, row.work_date);
    const result = calculateAttendanceDay({
      workDate: row.work_date,
      timezone: input.timezone,
      shift: shiftConfig(shift),
      policy: policyConfig(policy),
      punches,
      calendar: calendarKind(row.work_date, input.weeklyOff, holidaySet),
      leave: existing && LEAVE_STATUSES.has(existing.status) ? { status: existing.status, source: existing.source } : null,
    });
    const saved = await upsertAttendanceDay({
      id: existing?.id ?? crypto.randomUUID(),
      organization_id: organizationId,
      employee_id: row.employee_id,
      work_date: row.work_date,
      status: result.status,
      session: "FULL",
      leave_request_id: existing?.leave_request_id ?? null,
      source: existing && LEAVE_STATUSES.has(existing.status) ? existing.source : "REGULARIZATION",
      previous_status: existing?.status ?? null,
      shift_id: shift?.id ?? null,
      first_in: result.firstIn?.toISOString() ?? row.requested_in,
      last_out: result.lastOut?.toISOString() ?? row.requested_out,
      worked_minutes: result.workedMinutes,
      late_minutes: result.lateMinutes,
      early_exit_minutes: result.earlyExitMinutes,
      ot_minutes: result.otMinutes,
      locked: false,
      created_at: existing?.created_at ?? stamp(),
      updated_at: stamp(),
    });
    await replaceDayExceptions(organizationId, row.employee_id, row.work_date, []);
    await emitSafe({
      organizationId,
      eventType: "attendance.day.calculated",
      entityType: "attendance_day",
      entityId: saved.id,
      payload: { status: saved.status, href: "/attendance/regularization" },
      idempotencyKey: `attendance.day.calculated:${saved.id}:regularization`,
    });
  }
  await writeAudit({
    organizationId,
    actorUserId: actorId,
    action: `attendance.regularization.${input.decision.toLowerCase()}`,
    entityType: "attendance_regularization",
    entityId: input.id,
  });
  return updated;
}

export async function dismissException(organizationId: string, actorId: string, id: string) {
  const rows = await listExceptions(organizationId);
  const found = rows.find((item) => item.id === id);
  if (!found) throw new Error("Exception not found.");
  const updated = await updateException(id, organizationId, { status: "DISMISSED" });
  await writeAudit({
    organizationId,
    actorUserId: actorId,
    action: "attendance.exception.dismiss",
    entityType: "attendance_exception",
    entityId: id,
  });
  return updated;
}

export async function loadAttendanceOverview(organizationId: string, timezone: string) {
  await ensureAttendanceDefaults(organizationId, null);
  const today = todayInZone(timezone);
  const from = addDays(today, -6);
  const [days, exceptions, regularizations, punches, catalog] = await Promise.all([
    listAttendanceDays(organizationId, from, today),
    listExceptions(organizationId, from, today),
    listRegularizations(organizationId),
    listPunchesInRange(organizationId, `${today}T00:00:00.000Z`, `${today}T23:59:59.999Z`),
    loadOrgCatalog(organizationId),
  ]);
  const todayDays = days.filter((item) => item.work_date === today);
  return {
    today,
    present: todayDays.filter((item) => item.status === "PRESENT").length,
    absent: todayDays.filter((item) => item.status === "ABSENT").length,
    leave: todayDays.filter((item) => LEAVE_STATUSES.has(item.status)).length,
    openExceptions: exceptions.filter((item) => item.status === "OPEN").length,
    pendingRegularizations: regularizations.filter((item) => item.status === "PENDING").length,
    todayPunches: punches.length,
    employees: catalog.employees.length,
    recent: days.slice(0, 12),
  };
}

export async function loadAttendanceRegister(organizationId: string, from: string, to: string): Promise<AttendanceRegisterRow[]> {
  const [days, catalog] = await Promise.all([listAttendanceDays(organizationId, from, to), loadOrgCatalog(organizationId)]);
  return belongsToOrganization(organizationId, days)
    .slice()
    .sort((a, b) => b.work_date.localeCompare(a.work_date) || a.employee_id.localeCompare(b.employee_id))
    .map((row) => {
      const employee = catalog.employees.find((item) => item.id === row.employee_id);
      return {
        employeeId: row.employee_id,
        employeeCode: employee?.employee_code ?? "—",
        employeeName: employee?.display_name ?? "Unknown",
        workDate: row.work_date,
        status: row.status,
        firstIn: row.first_in ?? null,
        lastOut: row.last_out ?? null,
        workedMinutes: row.worked_minutes ?? 0,
        lateMinutes: row.late_minutes ?? 0,
        earlyExitMinutes: row.early_exit_minutes ?? 0,
        otMinutes: row.ot_minutes ?? 0,
        source: row.source,
        locked: Boolean(row.locked),
      };
    });
}

export async function loadLiveAttendance(organizationId: string, timezone: string) {
  const today = todayInZone(timezone);
  const [days, punches, catalog, shifts, assignments, policy] = await Promise.all([
    listAttendanceDays(organizationId, today, today),
    listPunchesInRange(organizationId, `${addDays(today, -1)}T00:00:00.000Z`, `${today}T23:59:59.999Z`),
    loadOrgCatalog(organizationId),
    listShifts(organizationId),
    listShiftAssignments(organizationId),
    getAttendancePolicy(organizationId),
  ]);
  return catalog.employees
    .filter((item) => item.organization_id === organizationId && (item.status === "ACTIVE" || item.status === "ON_NOTICE"))
    .map((employee) => {
      const day = days.find((item) => item.employee_id === employee.id);
      const mine = punches.filter((item) => item.employee_id === employee.id);
      const last = mine.slice().sort((a, b) => b.punched_at.localeCompare(a.punched_at))[0] ?? null;
      const shift = resolveShift(assignments, shifts, employee.id, today);
      return {
        employee,
        day,
        lastPunch: last,
        shift,
        policy,
      };
    });
}

export async function attendanceLateOtTotals(organizationId: string, employeeId: string, from: string, to: string) {
  const days = (await listAttendanceDays(organizationId, from, to)).filter((item) => item.employee_id === employeeId);
  return {
    lateCount: days.filter((item) => (item.late_minutes ?? 0) > 0).length,
    otMinutes: days.reduce((sum, item) => sum + (item.ot_minutes ?? 0), 0),
  };
}

export { asBool, asNumber, localParts, zonedDate };

export async function loadShiftsPage(organizationId: string) {
  await ensureAttendanceDefaults(organizationId, null);
  const [shifts, assignments, catalog] = await Promise.all([
    listShifts(organizationId),
    listShiftAssignments(organizationId),
    loadOrgCatalog(organizationId),
  ]);
  return { shifts, assignments, employees: catalog.employees as Employee[] };
}

export async function loadSettingsPage(organizationId: string) {
  await ensureAttendanceDefaults(organizationId, null);
  return {
    policy: await getAttendancePolicy(organizationId),
    shifts: await listShifts(organizationId),
  };
}

export async function loadExceptionsPage(organizationId: string, from: string, to: string) {
  const [rows, catalog] = await Promise.all([listExceptions(organizationId, from, to), loadOrgCatalog(organizationId)]);
  return rows.map((row) => ({
    row,
    employeeCode: catalog.employees.find((item) => item.id === row.employee_id)?.employee_code ?? "—",
    employeeName: catalog.employees.find((item) => item.id === row.employee_id)?.display_name ?? "Unknown",
  }));
}

export async function loadRegularizationPage(organizationId: string) {
  const [rows, catalog] = await Promise.all([listRegularizations(organizationId), loadOrgCatalog(organizationId)]);
  return {
    employees: catalog.employees,
    rows: rows.map((row) => ({
      row,
      employeeCode: catalog.employees.find((item) => item.id === row.employee_id)?.employee_code ?? "—",
      employeeName: catalog.employees.find((item) => item.id === row.employee_id)?.display_name ?? "Unknown",
    })),
  };
}

export async function unmappedPunchCount(organizationId: string) {
  const { listNormalizedEvents } = await import("@/lib/biometric/repository");
  const events = await listNormalizedEvents(organizationId, 400);
  return events.filter((item) => item.status === "UNMAPPED").length;
}
