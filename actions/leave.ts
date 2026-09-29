"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors, optional } from "@/lib/form-errors";
import {
  ACCRUAL_FREQUENCIES,
  ACCRUAL_METHODS,
  COMP_OFF_STATUSES,
  HOLIDAY_TYPES,
  LEAVE_DAY_SESSIONS,
  POLICY_SCOPES,
  type CompOffStatus,
  type LeaveDaySession,
  type PermissionCode,
} from "@/lib/constants";
import {
  balanceAdjustSchema,
  compOffSchema,
  holidaySchema,
  leavePolicySchema,
  leaveRequestSchema,
  leaveTypeSchema,
} from "@/lib/validations/leave";
import {
  asBool,
  asNumber,
  decideCompOff,
  decideLeaveRequest,
  previewForForm,
  saveCompOffRow,
  saveHolidayRow,
  savePolicyRow,
  saveTypeRow,
  submitLeaveRequest,
  adjustBalance,
} from "@/lib/leave/service";
import { listLeaveTypes, listPolicies, updateLeaveType, updatePolicy } from "@/lib/leave/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import type { ActionResult, LeavePolicy, LeavePolicyAssignment, LeaveType } from "@/types";

function stamp() {
  return new Date().toISOString();
}

function refresh() {
  revalidatePath("/leave");
  revalidatePath("/leave/requests");
  revalidatePath("/leave/approvals");
  revalidatePath("/leave/balances");
  revalidatePath("/leave/calendar");
  revalidatePath("/leave/holidays");
  revalidatePath("/leave/types");
  revalidatePath("/leave/policies");
  revalidatePath("/leave/comp-off");
  revalidatePath("/leave/reports");
  revalidatePath("/leave/settings");
  revalidatePath("/employees");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

async function requireLeave(permission: PermissionCode) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." as const, user: null };
  if (!hasPermission(user, permission)) return { error: "You do not have permission for this action." as const, user: null };
  return { error: null, user };
}

export async function saveLeaveTypeAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireLeave("leave.policy.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = leaveTypeSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    paid: optional(formData.get("paid")),
    requiresApproval: optional(formData.get("requiresApproval")),
    requiresDocument: optional(formData.get("requiresDocument")),
    allowHalfDay: optional(formData.get("allowHalfDay")),
    allowBackdated: optional(formData.get("allowBackdated")),
    allowFuture: optional(formData.get("allowFuture")),
    carryForwardAllowed: optional(formData.get("carryForwardAllowed")),
    maxCarryForward: optional(formData.get("maxCarryForward")),
    encashmentAllowed: optional(formData.get("encashmentAllowed")),
    negativeBalanceAllowed: optional(formData.get("negativeBalanceAllowed")),
    isCompOff: optional(formData.get("isCompOff")),
    status: optional(formData.get("status")) || "ACTIVE",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };

  const id = optional(formData.get("id"));
  const orgId = access.user.organization.id;
  const types = await listLeaveTypes(orgId);
  const code = parsed.data.code.toUpperCase();
  if (types.some((item) => item.code.toUpperCase() === code && item.id !== id)) {
    return { success: false, errors: { code: ["A leave type with this code already exists."] } };
  }

  const row: LeaveType = {
    id: id || crypto.randomUUID(),
    organization_id: orgId,
    name: parsed.data.name,
    code,
    paid: asBool(parsed.data.paid),
    requires_approval: asBool(parsed.data.requiresApproval),
    requires_document: asBool(parsed.data.requiresDocument),
    allow_half_day: asBool(parsed.data.allowHalfDay),
    allow_backdated: asBool(parsed.data.allowBackdated),
    allow_future: asBool(parsed.data.allowFuture),
    carry_forward_allowed: asBool(parsed.data.carryForwardAllowed),
    max_carry_forward: parsed.data.maxCarryForward ? asNumber(parsed.data.maxCarryForward) : null,
    encashment_allowed: asBool(parsed.data.encashmentAllowed),
    negative_balance_allowed: asBool(parsed.data.negativeBalanceAllowed),
    is_comp_off: asBool(parsed.data.isCompOff),
    status: parsed.data.status ?? "ACTIVE",
    created_by: access.user.id,
    updated_by: access.user.id,
    created_at: stamp(),
    updated_at: stamp(),
  };
  await saveTypeRow(row, id || undefined);
  await writeAudit({
    organizationId: orgId,
    actorUserId: access.user.id,
    action: id ? "leave.type.update" : "leave.type.create",
    entityType: "leave_type",
    entityId: row.id,
    metadata: { name: row.name, code: row.code },
  });
  refresh();
  return { success: true, message: id ? "Leave type updated." : "Leave type created." };
}

export async function toggleLeaveTypeAction(id: string, enable: boolean): Promise<ActionResult> {
  const access = await requireLeave("leave.policy.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  await updateLeaveType(id, { status: enable ? "ACTIVE" : "DISABLED", updated_by: access.user.id });
  refresh();
  return { success: true, message: enable ? "Leave type enabled." : "Leave type disabled." };
}

export async function saveLeavePolicyAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireLeave("leave.policy.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = leavePolicySchema.safeParse({
    name: formData.get("name"),
    leaveTypeId: formData.get("leaveTypeId"),
    annualAllocation: formData.get("annualAllocation"),
    accrualMethod: formData.get("accrualMethod") || ACCRUAL_METHODS[0],
    accrualFrequency: formData.get("accrualFrequency") || ACCRUAL_FREQUENCIES[0],
    startBalance: optional(formData.get("startBalance")),
    carryForward: optional(formData.get("carryForward")),
    carryForwardLimit: optional(formData.get("carryForwardLimit")),
    encashment: optional(formData.get("encashment")),
    approvalRequired: optional(formData.get("approvalRequired")),
    countWeeklyOff: optional(formData.get("countWeeklyOff")),
    countHoliday: optional(formData.get("countHoliday")),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: optional(formData.get("effectiveTo")),
    scope: formData.get("scope") || POLICY_SCOPES[0],
    branchId: optional(formData.get("branchId")),
    departmentId: optional(formData.get("departmentId")),
    designationId: optional(formData.get("designationId")),
    employmentTypeId: optional(formData.get("employmentTypeId")),
    employeeId: optional(formData.get("employeeId")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };

  const id = optional(formData.get("id"));
  const orgId = access.user.organization.id;
  const existing = id ? (await listPolicies(orgId)).find((item) => item.id === id) : null;
  const policy: LeavePolicy = {
    id: id || crypto.randomUUID(),
    organization_id: orgId,
    name: parsed.data.name,
    leave_type_id: parsed.data.leaveTypeId,
    annual_allocation: asNumber(parsed.data.annualAllocation),
    accrual_method: parsed.data.accrualMethod,
    accrual_frequency: parsed.data.accrualFrequency,
    start_balance: asNumber(parsed.data.startBalance),
    carry_forward: asBool(parsed.data.carryForward),
    carry_forward_limit: parsed.data.carryForwardLimit ? asNumber(parsed.data.carryForwardLimit) : null,
    encashment: asBool(parsed.data.encashment),
    approval_required: asBool(parsed.data.approvalRequired),
    count_weekly_off: asBool(parsed.data.countWeeklyOff),
    count_holiday: asBool(parsed.data.countHoliday),
    version: existing ? existing.version + 1 : 1,
    effective_from: parsed.data.effectiveFrom,
    effective_to: parsed.data.effectiveTo || null,
    status: "ACTIVE",
    created_by: access.user.id,
    updated_by: access.user.id,
    created_at: stamp(),
    updated_at: stamp(),
  };
  const assignment: LeavePolicyAssignment = {
    id: crypto.randomUUID(),
    organization_id: orgId,
    policy_id: policy.id,
    scope: parsed.data.scope,
    branch_id: parsed.data.branchId || null,
    department_id: parsed.data.departmentId || null,
    designation_id: parsed.data.designationId || null,
    employment_type_id: parsed.data.employmentTypeId || null,
    employee_id: parsed.data.employeeId || null,
    created_at: stamp(),
  };
  await savePolicyRow(policy, assignment, id || undefined);
  await writeAudit({
    organizationId: orgId,
    actorUserId: access.user.id,
    action: id ? "leave.policy.update" : "leave.policy.create",
    entityType: "leave_policy",
    entityId: policy.id,
    metadata: { name: policy.name, leaveTypeId: policy.leave_type_id },
  });
  refresh();
  return { success: true, message: id ? "Policy updated." : "Policy created." };
}

export async function toggleLeavePolicyAction(id: string, enable: boolean): Promise<ActionResult> {
  const access = await requireLeave("leave.policy.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  await updatePolicy(id, { status: enable ? "ACTIVE" : "DISABLED", updated_by: access.user.id });
  refresh();
  return { success: true, message: enable ? "Policy enabled." : "Policy disabled." };
}

export async function saveHolidayAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireLeave("leave.calendar.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = holidaySchema.safeParse({
    name: formData.get("name"),
    holidayDate: formData.get("holidayDate"),
    holidayType: formData.get("holidayType") || HOLIDAY_TYPES[3],
    branchId: optional(formData.get("branchId")),
    locationId: optional(formData.get("locationId")),
    optional: optional(formData.get("optional")),
    status: optional(formData.get("status")) || "ACTIVE",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const id = optional(formData.get("id"));
  const orgId = access.user.organization.id;
  await saveHolidayRow(
    {
      id: id || crypto.randomUUID(),
      organization_id: orgId,
      name: parsed.data.name,
      holiday_date: parsed.data.holidayDate,
      holiday_type: parsed.data.holidayType,
      branch_id: parsed.data.branchId || null,
      location_id: parsed.data.locationId || null,
      optional: asBool(parsed.data.optional) || parsed.data.holidayType === "OPTIONAL",
      status: parsed.data.status ?? "ACTIVE",
      created_by: access.user.id,
      updated_by: access.user.id,
      created_at: stamp(),
      updated_at: stamp(),
    },
    id || undefined
  );
  await writeAudit({
    organizationId: orgId,
    actorUserId: access.user.id,
    action: id ? "leave.holiday.update" : "leave.holiday.create",
    entityType: "holiday",
    entityId: id || undefined,
    metadata: { name: parsed.data.name, date: parsed.data.holidayDate },
  });
  refresh();
  return { success: true, message: id ? "Holiday updated." : "Holiday added." };
}

export async function submitLeaveRequestAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireLeave("leave.request");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = leaveRequestSchema.safeParse({
    employeeId: formData.get("employeeId"),
    leaveTypeId: formData.get("leaveTypeId"),
    fromDate: formData.get("fromDate"),
    toDate: formData.get("toDate"),
    session: formData.get("session") || LEAVE_DAY_SESSIONS[0],
    reason: optional(formData.get("reason")),
    contactDuringLeave: optional(formData.get("contactDuringLeave")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };

  let employeeId = parsed.data.employeeId;
  if (access.user.roleCode === "EMPLOYEE") {
    const catalog = await loadOrgCatalog(access.user.organization.id);
    const linked = catalog.employees.find((item) => item.user_id === access.user.id);
    if (!linked) return { success: false, message: "No employee profile is linked to this user." };
    employeeId = linked.id;
  }

  const result = await submitLeaveRequest({
    organization: access.user.organization,
    actorId: access.user.id,
    employeeId,
    leaveTypeId: parsed.data.leaveTypeId,
    fromDate: parsed.data.fromDate,
    toDate: parsed.data.toDate,
    session: parsed.data.session,
    reason: parsed.data.reason,
    contactDuringLeave: parsed.data.contactDuringLeave,
  });
  if (result.error) return { success: false, message: result.error };
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "leave.request.submit",
    entityType: "leave_request",
    entityId: result.request?.id,
    metadata: { employeeId, leaveTypeId: parsed.data.leaveTypeId, days: result.request?.days },
  });
  refresh();
  return { success: true, message: result.request?.status === "APPROVED" ? "Leave applied and approved." : "Leave request submitted." };
}

export async function previewLeaveAction(formData: FormData): Promise<ActionResult<{ total: number; available: number | null; days: { date: string; units: number; counted: boolean; skipReason: string | null }[] }>> {
  const access = await requireLeave("leave.request");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const employeeId = String(formData.get("employeeId") ?? "");
  const leaveTypeId = String(formData.get("leaveTypeId") ?? "");
  const fromDate = String(formData.get("fromDate") ?? "");
  const toDate = String(formData.get("toDate") ?? "");
  const session = (String(formData.get("session") ?? "FULL") || "FULL") as LeaveDaySession;
  if (!employeeId || !leaveTypeId || !fromDate || !toDate) return { success: false, message: "Select employee, type and dates." };
  const preview = await previewForForm({
    organization: access.user.organization,
    employeeId,
    leaveTypeId,
    fromDate,
    toDate,
    session,
  });
  if (preview.error) return { success: false, message: preview.error };
  return { success: true, data: { total: preview.total, available: preview.available, days: preview.days } };
}

export async function decideLeaveAction(requestId: string, action: "APPROVED" | "REJECTED" | "CANCELLED" | "WITHDRAWN", reason?: string): Promise<ActionResult> {
  const permission: PermissionCode =
    action === "APPROVED" || action === "REJECTED" ? "leave.approve" : action === "CANCELLED" ? "leave.manage" : "leave.request";
  const access = await requireLeave(permission);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  if ((action === "APPROVED" || action === "REJECTED") && !reason && action === "REJECTED") {
    return { success: false, message: "A reason is required to reject leave." };
  }
  const result = await decideLeaveRequest({
    organization: access.user.organization,
    actorId: access.user.id,
    requestId,
    action,
    reason,
  });
  if (result.error) return { success: false, message: result.error };
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: `leave.request.${action.toLowerCase()}`,
    entityType: "leave_request",
    entityId: requestId,
    metadata: { reason: reason ?? null },
  });
  refresh();
  return { success: true, message: `Request ${action.toLowerCase()}.` };
}

export async function adjustBalanceAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireLeave("leave.balance.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = balanceAdjustSchema.safeParse({
    employeeId: formData.get("employeeId"),
    leaveTypeId: formData.get("leaveTypeId"),
    quantity: formData.get("quantity"),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const quantity = asNumber(parsed.data.quantity);
  if (!quantity) return { success: false, errors: { quantity: ["Enter a non-zero quantity."] } };
  const result = await adjustBalance({
    organization: access.user.organization,
    actorId: access.user.id,
    employeeId: parsed.data.employeeId,
    leaveTypeId: parsed.data.leaveTypeId,
    quantity,
    notes: parsed.data.notes,
  });
  if (result.error) return { success: false, message: result.error };
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "leave.balance.adjust",
    entityType: "leave_balance",
    metadata: { employeeId: parsed.data.employeeId, leaveTypeId: parsed.data.leaveTypeId, quantity },
  });
  refresh();
  return { success: true, message: `Balance updated. Available ${result.available}.` };
}

export async function saveCompOffAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireLeave("leave.comp_off.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = compOffSchema.safeParse({
    employeeId: formData.get("employeeId"),
    workDate: formData.get("workDate"),
    source: formData.get("source"),
    units: optional(formData.get("units")),
    notes: optional(formData.get("notes")),
    status: optional(formData.get("status")) || "PENDING",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const row = await saveCompOffRow({
    id: crypto.randomUUID(),
    organization_id: access.user.organization.id,
    employee_id: parsed.data.employeeId,
    work_date: parsed.data.workDate,
    source: parsed.data.source,
    units: parsed.data.units ? asNumber(parsed.data.units, 1) : 1,
    status: (parsed.data.status as CompOffStatus | undefined) ?? "PENDING",
    notes: parsed.data.notes || null,
    request_id: null,
    decided_by: null,
    created_by: access.user.id,
    created_at: stamp(),
    updated_at: stamp(),
  });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "leave.comp_off.create",
    entityType: "comp_off",
    entityId: row.id,
    metadata: { employeeId: row.employee_id, workDate: row.work_date },
  });
  refresh();
  return { success: true, message: "Comp-off earning recorded." };
}

export async function decideCompOffAction(id: string, status: CompOffStatus): Promise<ActionResult> {
  const access = await requireLeave("leave.comp_off.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  if (!COMP_OFF_STATUSES.includes(status)) return { success: false, message: "Invalid status." };
  await decideCompOff(id, status, access.user.id);
  if (status === "APPROVED") {
    const { listCompOff, listLeaveTypes } = await import("@/lib/leave/repository");
    const earnings = await listCompOff(access.user.organization.id);
    const earning = earnings.find((item) => item.id === id);
    const types = await listLeaveTypes(access.user.organization.id);
    const compType = types.find((item) => item.is_comp_off);
    if (earning && compType) {
      await adjustBalance({
        organization: access.user.organization,
        actorId: access.user.id,
        employeeId: earning.employee_id,
        leaveTypeId: compType.id,
        quantity: earning.units,
        notes: `Comp-off earned ${earning.work_date}`,
        source: "COMP_OFF_EARNED",
      });
    }
  }
  refresh();
  return { success: true, message: `Comp-off ${status.toLowerCase()}.` };
}


