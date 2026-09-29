import type {
  CompOffEarning,
  Employee,
  EmployeeEmployment,
  Holiday,
  LeaveBalance,
  LeaveDayPreview,
  LeavePolicy,
  LeavePolicyAssignment,
  LeaveRequest,
  LeaveType,
  Organization,
} from "@/types";
import type { CompOffStatus, LeaveDaySession, LeaveLedgerSource } from "@/lib/constants";
import { applyLeaveToAttendance, revertLeaveAttendance } from "@/lib/leave/attendance";
import { currentYear } from "@/lib/leave/dates";
import {
  applyLedgerDelta,
  asBool,
  asNumber,
  emptyBalance,
  expectedAllocation,
  findConflicts,
  isUnlimited,
  makeLedger,
  matchingPolicy,
  previewLeaveDays,
  recomputeAvailable,
  roundUnits,
  toRequestDays,
  validateRequestWindow,
} from "@/lib/leave/engine";
import {
  getRequest,
  insertApproval,
  insertCompOff,
  insertHoliday,
  insertLedger,
  insertLeaveType,
  insertPolicy,
  insertRequest,
  listBalances,
  listCompOff,
  listEmployment,
  listHolidays,
  listLeaveTypes,
  listPolicies,
  listPolicyAssignments,
  listRequestDays,
  listRequests,
  updateCompOff,
  updateHoliday,
  updateLeaveType,
  updatePolicy,
  updateRequest,
  upsertBalance,
} from "@/lib/leave/repository";
import { loadOrgCatalog } from "@/lib/org-data";

function stamp() {
  return new Date().toISOString();
}

async function context(organizationId: string) {
  const [types, policies, assignments, holidays, requests, requestDays, balances, catalog, employment] = await Promise.all([
    listLeaveTypes(organizationId),
    listPolicies(organizationId),
    listPolicyAssignments(organizationId),
    listHolidays(organizationId),
    listRequests(organizationId),
    listRequestDays(organizationId),
    listBalances(organizationId),
    loadOrgCatalog(organizationId),
    listEmployment(organizationId),
  ]);
  return { types, policies, assignments, holidays, requests, requestDays, balances, catalog, employment };
}

export async function ensureEmployeeBalance(input: {
  organization: Organization;
  employee: Employee;
  employment: EmployeeEmployment | null;
  type: LeaveType;
  policies: LeavePolicy[];
  assignments: LeavePolicyAssignment[];
  balances: LeaveBalance[];
  year?: number;
  actorId?: string | null;
}) {
  const year = input.year ?? currentYear(input.organization.timezone);
  const existing = input.balances.find(
    (item) => item.employee_id === input.employee.id && item.leave_type_id === input.type.id && item.year === year
  );
  const policy = matchingPolicy(
    input.employee,
    input.employment,
    input.type.id,
    input.policies,
    input.assignments,
    `${year}-01-01`
  );
  if (existing) {
    if (!policy) return existing;
    const expected = expectedAllocation(policy, year, input.organization.timezone);
    let changed = false;
    if (expected.allocated > existing.allocated) {
      const delta = roundUnits(expected.allocated - existing.allocated);
      const before = existing.available;
      applyLedgerDelta(existing, "ALLOCATED", delta);
      await insertLedger(
        makeLedger({
          organizationId: input.organization.id,
          employeeId: input.employee.id,
          leaveTypeId: input.type.id,
          year,
          source: "ALLOCATED",
          quantity: delta,
          before,
          after: existing.available,
          notes: "Annual allocation",
          createdBy: input.actorId,
        })
      );
      changed = true;
    }
    if (expected.accrued > existing.accrued) {
      const delta = roundUnits(expected.accrued - existing.accrued);
      const before = existing.available;
      applyLedgerDelta(existing, "ACCRUED", delta);
      await insertLedger(
        makeLedger({
          organizationId: input.organization.id,
          employeeId: input.employee.id,
          leaveTypeId: input.type.id,
          year,
          source: "ACCRUED",
          quantity: delta,
          before,
          after: existing.available,
          notes: "Monthly accrual",
          createdBy: input.actorId,
        })
      );
      changed = true;
    }
    if (changed) await upsertBalance(existing);
    return existing;
  }

  const expected = policy ? expectedAllocation(policy, year, input.organization.timezone) : { allocated: 0, accrued: 0 };
  const row = emptyBalance({
    id: crypto.randomUUID(),
    organization_id: input.organization.id,
    employee_id: input.employee.id,
    leave_type_id: input.type.id,
    year,
    opening: policy?.start_balance ?? 0,
    allocated: 0,
    accrued: 0,
    used: 0,
    pending: 0,
    carry_forward: 0,
    adjusted: 0,
  });
  await upsertBalance(row);
  if (expected.allocated) {
    const before = row.available;
    applyLedgerDelta(row, "ALLOCATED", expected.allocated);
    await insertLedger(
      makeLedger({
        organizationId: input.organization.id,
        employeeId: input.employee.id,
        leaveTypeId: input.type.id,
        year,
        source: "ALLOCATED",
        quantity: expected.allocated,
        before,
        after: row.available,
        notes: "Annual allocation",
        createdBy: input.actorId,
      })
    );
  }
  if (expected.accrued) {
    const before = row.available;
    applyLedgerDelta(row, "ACCRUED", expected.accrued);
    await insertLedger(
      makeLedger({
        organizationId: input.organization.id,
        employeeId: input.employee.id,
        leaveTypeId: input.type.id,
        year,
        source: "ACCRUED",
        quantity: expected.accrued,
        before,
        after: row.available,
        notes: "Monthly accrual",
        createdBy: input.actorId,
      })
    );
  }
  await upsertBalance(row);
  input.balances.unshift(row);
  return row;
}

export async function buildPreview(input: {
  organization: Organization;
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  session: LeaveDaySession;
}) {
  const ctx = await context(input.organization.id);
  const employee = ctx.catalog.employees.find((item) => item.id === input.employeeId);
  if (!employee) return { error: "Employee not found." as const, preview: null, type: null, policy: null, total: 0 };
  const type = ctx.types.find((item) => item.id === input.leaveTypeId);
  if (!type || type.status !== "ACTIVE") return { error: "Leave type is not available." as const, preview: null, type: null, policy: null, total: 0 };
  const employment = ctx.employment.find((item) => item.employee_id === employee.id) ?? null;
  const policy = matchingPolicy(employee, employment, type.id, ctx.policies, ctx.assignments, input.fromDate);
  const windowError = validateRequestWindow(type, input.fromDate, input.toDate, input.session, input.organization.timezone);
  if (windowError) return { error: windowError, preview: null, type, policy, total: 0 };
  const preview = previewLeaveDays({
    fromDate: input.fromDate,
    toDate: input.toDate,
    session: input.session,
    weeklyOff: input.organization.weekly_off,
    holidays: ctx.holidays,
    countWeeklyOff: policy?.count_weekly_off ?? false,
    countHoliday: policy?.count_holiday ?? false,
    branchId: employment?.branch_id,
    locationId: employment?.location_id,
  });
  const conflicts = findConflicts(employee.id, preview.days, ctx.requests, ctx.requestDays);
  if (conflicts.length) {
    return { error: `Overlapping leave exists on ${conflicts[0].date}.`, preview, type, policy, total: preview.total };
  }
  return { error: null, preview, type, policy, total: preview.total, employee, employment, ctx };
}

export async function submitLeaveRequest(input: {
  organization: Organization;
  actorId: string;
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  session: LeaveDaySession;
  reason?: string;
  contactDuringLeave?: string;
  autoApprove?: boolean;
}) {
  const built = await buildPreview(input);
  if (built.error || !built.preview || !built.type || !built.employee) return { error: built.error ?? "Unable to calculate leave days." };
  if (built.total <= 0) return { error: "No countable leave days in this range. Weekly offs and holidays are excluded unless the policy counts them." };

  const year = Number(input.fromDate.slice(0, 4));
  const balance = await ensureEmployeeBalance({
    organization: input.organization,
    employee: built.employee,
    employment: built.employment ?? null,
    type: built.type,
    policies: built.ctx!.policies,
    assignments: built.ctx!.assignments,
    balances: built.ctx!.balances,
    year,
    actorId: input.actorId,
  });
  const unlimited = isUnlimited(built.type, built.policy);
  if (!unlimited && !built.type.negative_balance_allowed && balance.available < built.total) {
    return { error: `Insufficient balance. Available ${balance.available}, requested ${built.total}.` };
  }

  const id = crypto.randomUUID();
  const now = stamp();
  const requiresApproval = built.policy?.approval_required ?? built.type.requires_approval;
  const status = input.autoApprove || !requiresApproval ? "APPROVED" : "PENDING";
  const request: LeaveRequest = {
    id,
    organization_id: input.organization.id,
    employee_id: input.employeeId,
    leave_type_id: input.leaveTypeId,
    from_date: input.fromDate,
    to_date: input.toDate,
    session: input.session,
    days: built.total,
    reason: input.reason || null,
    contact_during_leave: input.contactDuringLeave || null,
    attachment_name: null,
    attachment_data: null,
    status,
    submitted_at: now,
    decided_at: status === "APPROVED" ? now : null,
    created_by: input.actorId,
    updated_by: input.actorId,
    created_at: now,
    updated_at: now,
  };
  const days = toRequestDays(input.organization.id, id, input.employeeId, built.preview.days);
  await insertRequest(request, days, {
    id: crypto.randomUUID(),
    organization_id: input.organization.id,
    request_id: id,
    actor_user_id: input.actorId,
    action: "SUBMITTED",
    reason: null,
    created_at: now,
  });

  const source: LeaveLedgerSource = status === "APPROVED" ? (built.type.is_comp_off ? "COMP_OFF_USED" : "USED") : "PENDING";
  if (!unlimited) {
    const before = balance.available;
    applyLedgerDelta(balance, source, built.total);
    await upsertBalance(balance);
    await insertLedger(
      makeLedger({
        organizationId: input.organization.id,
        employeeId: input.employeeId,
        leaveTypeId: input.leaveTypeId,
        year,
        source,
        quantity: built.total,
        before,
        after: balance.available,
        referenceId: id,
        createdBy: input.actorId,
      })
    );
  }
  if (status === "APPROVED") {
    await applyLeaveToAttendance(request, days, built.type);
    if (built.type.is_comp_off) await consumeCompOff(input.organization.id, input.employeeId, built.total, id, input.actorId);
  }
  return { error: null, request };
}

export async function decideLeaveRequest(input: {
  organization: Organization;
  actorId: string;
  requestId: string;
  action: "APPROVED" | "REJECTED" | "CANCELLED" | "WITHDRAWN";
  reason?: string;
}) {
  const request = await getRequest(input.organization.id, input.requestId);
  if (!request) return { error: "Leave request not found." };
  if (input.action === "APPROVED" && request.status !== "PENDING") return { error: "Only pending requests can be approved." };
  if (input.action === "REJECTED" && request.status !== "PENDING") return { error: "Only pending requests can be rejected." };
  if ((input.action === "CANCELLED" || input.action === "WITHDRAWN") && !["PENDING", "APPROVED"].includes(request.status)) {
    return { error: "This request cannot be cancelled." };
  }

  const ctx = await context(input.organization.id);
  const type = ctx.types.find((item) => item.id === request.leave_type_id);
  if (!type) return { error: "Leave type not found." };
  const employee = ctx.catalog.employees.find((item) => item.id === request.employee_id);
  if (!employee) return { error: "Employee not found." };
  const employment = ctx.employment.find((item) => item.employee_id === employee.id) ?? null;
  const days = ctx.requestDays.filter((item) => item.request_id === request.id);
  const year = Number(request.from_date.slice(0, 4));
  const balance = await ensureEmployeeBalance({
    organization: input.organization,
    employee,
    employment,
    type,
    policies: ctx.policies,
    assignments: ctx.assignments,
    balances: ctx.balances,
    year,
    actorId: input.actorId,
  });
  const unlimited = isUnlimited(type, matchingPolicy(employee, employment, type.id, ctx.policies, ctx.assignments, request.from_date));
  const now = stamp();

  if (input.action === "APPROVED") {
    if (!unlimited) {
      const before = balance.available;
      applyLedgerDelta(balance, "PENDING", -request.days);
      applyLedgerDelta(balance, type.is_comp_off ? "COMP_OFF_USED" : "USED", request.days);
      await upsertBalance(balance);
      await insertLedger(
        makeLedger({
          organizationId: input.organization.id,
          employeeId: request.employee_id,
          leaveTypeId: request.leave_type_id,
          year,
          source: type.is_comp_off ? "COMP_OFF_USED" : "USED",
          quantity: request.days,
          before,
          after: balance.available,
          referenceId: request.id,
          createdBy: input.actorId,
        })
      );
    }
    await updateRequest(request.id, { status: "APPROVED", decided_at: now, updated_by: input.actorId });
    await insertApproval({
      id: crypto.randomUUID(),
      organization_id: input.organization.id,
      request_id: request.id,
      actor_user_id: input.actorId,
      action: "APPROVED",
      reason: input.reason || null,
      created_at: now,
    });
    await applyLeaveToAttendance({ ...request, status: "APPROVED" }, days, type);
    if (type.is_comp_off) await consumeCompOff(input.organization.id, request.employee_id, request.days, request.id, input.actorId);
    return { error: null };
  }

  if (request.status === "PENDING" && !unlimited) {
    const before = balance.available;
    applyLedgerDelta(balance, "PENDING", -request.days);
    await upsertBalance(balance);
    await insertLedger(
      makeLedger({
        organizationId: input.organization.id,
        employeeId: request.employee_id,
        leaveTypeId: request.leave_type_id,
        year,
        source: "CANCELLED",
        quantity: -request.days,
        before,
        after: balance.available,
        referenceId: request.id,
        notes: input.action,
        createdBy: input.actorId,
      })
    );
  }
  if (request.status === "APPROVED" && !unlimited) {
    const before = balance.available;
    applyLedgerDelta(balance, "USED", -request.days);
    recomputeAvailable(balance);
    await upsertBalance(balance);
    await insertLedger(
      makeLedger({
        organizationId: input.organization.id,
        employeeId: request.employee_id,
        leaveTypeId: request.leave_type_id,
        year,
        source: "CANCELLED",
        quantity: request.days,
        before,
        after: balance.available,
        referenceId: request.id,
        notes: input.action,
        createdBy: input.actorId,
      })
    );
    await revertLeaveAttendance(request.id);
  }
  await updateRequest(request.id, { status: input.action, decided_at: now, updated_by: input.actorId });
  await insertApproval({
    id: crypto.randomUUID(),
    organization_id: input.organization.id,
    request_id: request.id,
    actor_user_id: input.actorId,
    action: input.action,
    reason: input.reason || null,
    created_at: now,
  });
  return { error: null };
}

export async function adjustBalance(input: {
  organization: Organization;
  actorId: string;
  employeeId: string;
  leaveTypeId: string;
  quantity: number;
  notes?: string;
  source?: LeaveLedgerSource;
}) {
  const ctx = await context(input.organization.id);
  const employee = ctx.catalog.employees.find((item) => item.id === input.employeeId);
  const type = ctx.types.find((item) => item.id === input.leaveTypeId);
  if (!employee || !type) return { error: "Employee or leave type not found." };
  const employment = ctx.employment.find((item) => item.employee_id === employee.id) ?? null;
  const year = currentYear(input.organization.timezone);
  const balance = await ensureEmployeeBalance({
    organization: input.organization,
    employee,
    employment,
    type,
    policies: ctx.policies,
    assignments: ctx.assignments,
    balances: ctx.balances,
    year,
    actorId: input.actorId,
  });
  const source = input.source ?? "ADJUSTMENT";
  const before = balance.available;
  applyLedgerDelta(balance, source, input.quantity);
  await upsertBalance(balance);
  await insertLedger(
    makeLedger({
      organizationId: input.organization.id,
      employeeId: input.employeeId,
      leaveTypeId: input.leaveTypeId,
      year,
      source,
      quantity: input.quantity,
      before,
      after: balance.available,
      notes: input.notes || "Manual adjustment",
      createdBy: input.actorId,
    })
  );
  return { error: null, available: balance.available };
}

async function consumeCompOff(organizationId: string, employeeId: string, units: number, requestId: string, actorId: string) {
  const rows = (await listCompOff(organizationId))
    .filter((item) => item.employee_id === employeeId && item.status === "APPROVED")
    .sort((a, b) => a.work_date.localeCompare(b.work_date));
  let remaining = units;
  for (const row of rows) {
    if (remaining <= 0) break;
    const take = Math.min(row.units, remaining);
    remaining = roundUnits(remaining - take);
    await updateCompOff(row.id, {
      status: take >= row.units ? "USED" : row.status,
      request_id: requestId,
      decided_by: actorId,
    });
  }
}

export { asBool, asNumber, previewLeaveDays };

export type PreviewResult = {
  error: string | null;
  days: LeaveDayPreview[];
  total: number;
  available: number | null;
};

export async function previewForForm(input: {
  organization: Organization;
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  session: LeaveDaySession;
}): Promise<PreviewResult> {
  const built = await buildPreview(input);
  if (built.error || !built.preview) return { error: built.error ?? "Unable to preview.", days: [], total: 0, available: null };
  let available: number | null = null;
  if (built.employee && built.type) {
    const year = Number(input.fromDate.slice(0, 4));
    const balance = await ensureEmployeeBalance({
      organization: input.organization,
      employee: built.employee,
      employment: built.employment ?? null,
      type: built.type,
      policies: built.ctx!.policies,
      assignments: built.ctx!.assignments,
      balances: built.ctx!.balances,
      year,
    });
    available = balance.available;
  }
  return { error: null, days: built.preview.days, total: built.total, available };
}

export async function saveTypeRow(row: LeaveType, existingId?: string) {
  if (existingId) return updateLeaveType(existingId, row);
  return insertLeaveType(row);
}

export async function savePolicyRow(policy: LeavePolicy, assignment: LeavePolicyAssignment, existingId?: string) {
  if (existingId) return updatePolicy(existingId, policy);
  return insertPolicy(policy, assignment);
}

export async function saveHolidayRow(row: Holiday, existingId?: string) {
  if (existingId) return updateHoliday(existingId, row);
  return insertHoliday(row);
}

export async function saveCompOffRow(row: CompOffEarning) {
  return insertCompOff(row);
}

export async function decideCompOff(id: string, status: CompOffStatus, actorId: string) {
  return updateCompOff(id, { status, decided_by: actorId, updated_at: stamp() });
}
