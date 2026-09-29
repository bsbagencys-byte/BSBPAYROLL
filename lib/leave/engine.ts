import type {
  Employee,
  EmployeeEmployment,
  Holiday,
  LeaveBalance,
  LeaveBalanceTransaction,
  LeaveDayPreview,
  LeavePolicy,
  LeavePolicyAssignment,
  LeaveRequest,
  LeaveRequestDay,
  LeaveType,
} from "@/types";
import type { LeaveDaySession, LeaveLedgerSource } from "@/lib/constants";
import { eachDate, sessionUnits, toDateOnly, todayInZone, weekdayName } from "@/lib/leave/dates";

export function asBool(value: unknown, fallback = false) {
  if (value === true || value === "on" || value === "true") return true;
  if (value === false || value === "false" || value === "") return false;
  return fallback;
}

export function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function roundUnits(value: number) {
  return Math.round(value * 100) / 100;
}

export function emptyBalance(partial: Omit<LeaveBalance, "available" | "updated_at"> & { available?: number; updated_at?: string }): LeaveBalance {
  const available = roundUnits(
    (partial.opening ?? 0) +
      (partial.allocated ?? 0) +
      (partial.accrued ?? 0) +
      (partial.carry_forward ?? 0) +
      (partial.adjusted ?? 0) -
      (partial.used ?? 0) -
      (partial.pending ?? 0)
  );
  return {
    ...partial,
    available,
    updated_at: partial.updated_at ?? new Date().toISOString(),
  };
}

export function recomputeAvailable(balance: LeaveBalance) {
  balance.available = roundUnits(
    balance.opening + balance.allocated + balance.accrued + balance.carry_forward + balance.adjusted - balance.used - balance.pending
  );
  balance.updated_at = new Date().toISOString();
  return balance;
}

export function matchingPolicy(
  employee: Employee,
  employment: EmployeeEmployment | null,
  leaveTypeId: string,
  policies: LeavePolicy[],
  assignments: LeavePolicyAssignment[],
  onDate: string
) {
  const active = policies.filter(
    (policy) =>
      policy.leave_type_id === leaveTypeId &&
      policy.status === "ACTIVE" &&
      policy.effective_from <= onDate &&
      (!policy.effective_to || policy.effective_to >= onDate)
  );
  const ranked = active
    .map((policy) => {
      const assignment = assignments.find((item) => item.policy_id === policy.id);
      if (!assignment) return null;
      const match = assignmentMatches(assignment, employee, employment);
      if (!match) return null;
      return { policy, rank: scopeRank(assignment.scope) };
    })
    .filter((item): item is { policy: LeavePolicy; rank: number } => Boolean(item))
    .sort((a, b) => b.rank - a.rank || b.policy.version - a.policy.version);
  return ranked[0]?.policy ?? null;
}

function scopeRank(scope: LeavePolicyAssignment["scope"]) {
  switch (scope) {
    case "EMPLOYEE":
      return 6;
    case "EMPLOYMENT_TYPE":
      return 5;
    case "DESIGNATION":
      return 4;
    case "DEPARTMENT":
      return 3;
    case "BRANCH":
      return 2;
    default:
      return 1;
  }
}

function assignmentMatches(assignment: LeavePolicyAssignment, employee: Employee, employment: EmployeeEmployment | null) {
  switch (assignment.scope) {
    case "EMPLOYEE":
      return assignment.employee_id === employee.id;
    case "BRANCH":
      return Boolean(assignment.branch_id && employment?.branch_id === assignment.branch_id);
    case "DEPARTMENT":
      return Boolean(assignment.department_id && employment?.department_id === assignment.department_id);
    case "DESIGNATION":
      return Boolean(assignment.designation_id && employment?.designation_id === assignment.designation_id);
    case "EMPLOYMENT_TYPE":
      return Boolean(assignment.employment_type_id && employment?.employment_type_id === assignment.employment_type_id);
    default:
      return true;
  }
}

export function isWeeklyOff(date: string, weeklyOff: string) {
  return weekdayName(date) === weeklyOff;
}

export function matchingHoliday(date: string, holidays: Holiday[], branchId?: string | null, locationId?: string | null) {
  return (
    holidays.find((holiday) => {
      if (holiday.status !== "ACTIVE") return false;
      if (holiday.holiday_date !== date) return false;
      if (holiday.branch_id && holiday.branch_id !== branchId) return false;
      if (holiday.location_id && holiday.location_id !== locationId) return false;
      return true;
    }) ?? null
  );
}

export function previewLeaveDays(input: {
  fromDate: string;
  toDate: string;
  session: LeaveDaySession;
  weeklyOff: string;
  holidays: Holiday[];
  countWeeklyOff: boolean;
  countHoliday: boolean;
  branchId?: string | null;
  locationId?: string | null;
}): { days: LeaveDayPreview[]; total: number } {
  const from = toDateOnly(input.fromDate);
  const to = toDateOnly(input.toDate);
  const dates = eachDate(from, to);
  const days = dates.map((date) => {
    const weeklyOff = isWeeklyOff(date, input.weeklyOff);
    const holiday = matchingHoliday(date, input.holidays, input.branchId, input.locationId);
    let counted = true;
    let skipReason: string | null = null;
    if (weeklyOff && !input.countWeeklyOff) {
      counted = false;
      skipReason = "WEEKLY_OFF";
    } else if (holiday && !input.countHoliday) {
      counted = false;
      skipReason = "HOLIDAY";
    }
    const session = from === to ? input.session : "FULL";
    const units = counted ? sessionUnits(session) : 0;
    return {
      date,
      session,
      units,
      counted,
      skipReason,
      weekday: weekdayName(date),
    };
  });
  const total = roundUnits(days.reduce((sum, day) => sum + day.units, 0));
  return { days, total };
}

export function sessionsOverlap(a: LeaveDaySession, b: LeaveDaySession) {
  if (a === "FULL" || b === "FULL") return true;
  return a === b;
}

export function findConflicts(
  employeeId: string,
  preview: LeaveDayPreview[],
  requests: LeaveRequest[],
  requestDays: LeaveRequestDay[],
  ignoreRequestId?: string
) {
  const blocking = new Set(["PENDING", "APPROVED"]);
  const open = requests.filter((item) => item.employee_id === employeeId && blocking.has(item.status) && item.id !== ignoreRequestId);
  const openIds = new Set(open.map((item) => item.id));
  const counted = preview.filter((day) => day.counted);
  return counted.filter((day) =>
    requestDays.some(
      (existing) =>
        existing.employee_id === employeeId &&
        existing.work_date === day.date &&
        existing.counted &&
        openIds.has(existing.request_id) &&
        sessionsOverlap(existing.session, day.session)
    )
  );
}

export function validateRequestWindow(type: LeaveType, fromDate: string, toDate: string, session: LeaveDaySession, timezone: string) {
  if (toDate < fromDate) return "To date cannot be before from date.";
  if (session !== "FULL" && fromDate !== toDate) return "Half-day leave can only be applied for a single date.";
  if (session !== "FULL" && !type.allow_half_day) return "This leave type does not allow half day.";
  const today = todayInZone(timezone);
  if (fromDate < today && !type.allow_backdated) return "Backdated leave is not allowed for this leave type.";
  if (fromDate > today && !type.allow_future) return "Future leave is not allowed for this leave type.";
  return null;
}

export function isUnlimited(type: LeaveType, policy: LeavePolicy | null) {
  if (type.is_comp_off) return false;
  if (policy?.accrual_method === "NONE") return true;
  return false;
}

export function expectedAllocation(policy: LeavePolicy, year: number, timezone: string) {
  if (policy.accrual_method === "NONE") return { allocated: 0, accrued: 0 };
  if (policy.accrual_method === "MANUAL") return { allocated: policy.start_balance, accrued: 0 };
  if (policy.accrual_method === "ANNUAL" || policy.accrual_frequency === "ANNUAL") {
    return { allocated: policy.annual_allocation, accrued: 0 };
  }
  const today = todayInZone(timezone);
  const currentYear = Number(today.slice(0, 4));
  if (year < currentYear) return { allocated: 0, accrued: policy.annual_allocation };
  if (year > currentYear) return { allocated: 0, accrued: 0 };
  const month = Number(today.slice(5, 7));
  const monthly = policy.annual_allocation / 12;
  return { allocated: 0, accrued: roundUnits(monthly * month) };
}

export function applyLedgerDelta(balance: LeaveBalance, source: LeaveLedgerSource, quantity: number) {
  if (source === "ALLOCATED") balance.allocated = roundUnits(balance.allocated + quantity);
  if (source === "ACCRUED") balance.accrued = roundUnits(balance.accrued + quantity);
  if (source === "USED" || source === "COMP_OFF_USED") balance.used = roundUnits(balance.used + quantity);
  if (source === "PENDING") balance.pending = roundUnits(balance.pending + quantity);
  if (source === "CANCELLED") {
    if (quantity < 0) balance.pending = roundUnits(balance.pending + quantity);
    else balance.used = roundUnits(balance.used - quantity);
  }
  if (source === "CARRY_FORWARD" || source === "COMP_OFF_EARNED") balance.carry_forward = roundUnits(balance.carry_forward + quantity);
  if (source === "ADJUSTMENT" || source === "ENCASHED") balance.adjusted = roundUnits(balance.adjusted + quantity);
  return recomputeAvailable(balance);
}

export function makeLedger(input: {
  organizationId: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  source: LeaveLedgerSource;
  quantity: number;
  before: number;
  after: number;
  referenceId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}): LeaveBalanceTransaction {
  return {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    employee_id: input.employeeId,
    leave_type_id: input.leaveTypeId,
    year: input.year,
    source: input.source,
    quantity: input.quantity,
    balance_before: input.before,
    balance_after: input.after,
    reference_id: input.referenceId ?? null,
    notes: input.notes ?? null,
    created_by: input.createdBy ?? null,
    created_at: new Date().toISOString(),
  };
}

export function toRequestDays(
  organizationId: string,
  requestId: string,
  employeeId: string,
  preview: LeaveDayPreview[]
): LeaveRequestDay[] {
  return preview.map((day) => ({
    id: crypto.randomUUID(),
    organization_id: organizationId,
    request_id: requestId,
    employee_id: employeeId,
    work_date: day.date,
    session: day.session,
    units: day.units,
    counted: day.counted,
    skip_reason: day.skipReason,
  }));
}

export function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  return [headers.join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n");
}
