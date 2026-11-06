"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { flattenErrors, optional } from "@/lib/form-errors";
import type { PermissionCode } from "@/lib/constants";
import {
  attendancePolicySchema,
  recalculateSchema,
  regularizationDecisionSchema,
  regularizationSchema,
  shiftAssignmentSchema,
  shiftSchema,
} from "@/lib/validations/attendance";
import {
  assignShiftRow,
  decideRegularization,
  dismissException,
  recalculateAttendance,
  savePolicyRow,
  saveShiftRow,
  submitRegularization,
} from "@/lib/attendance/service";
import type { ActionResult } from "@/types";

function refresh() {
  revalidatePath("/attendance");
  revalidatePath("/attendance/live");
  revalidatePath("/attendance/register");
  revalidatePath("/attendance/daily");
  revalidatePath("/attendance/exceptions");
  revalidatePath("/attendance/regularization");
  revalidatePath("/attendance/shifts");
  revalidatePath("/attendance/settings");
  revalidatePath("/my/attendance");
  revalidatePath("/reports");
}

async function requireAttendance(permission: PermissionCode) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." as const, user: null };
  if (!hasPermission(user, permission)) return { error: "You do not have permission for this action." as const, user: null };
  return { error: null, user };
}

export async function saveAttendancePolicyAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAttendance("attendance.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = attendancePolicySchema.safeParse({
    graceMinutes: formData.get("graceMinutes"),
    breakMinutes: formData.get("breakMinutes"),
    fullDayMinutes: formData.get("fullDayMinutes"),
    halfDayMinutes: formData.get("halfDayMinutes"),
    otMinimumMinutes: formData.get("otMinimumMinutes"),
    otRoundingMinutes: formData.get("otRoundingMinutes"),
    punchPairing: formData.get("punchPairing"),
    allowOvernight: optional(formData.get("allowOvernight")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };
  try {
    await savePolicyRow(access.user.organization.id, access.user.id, parsed.data);
    refresh();
    return { success: true, message: "Attendance policy saved." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save policy." };
  }
}

export async function saveShiftAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAttendance("attendance.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = shiftSchema.safeParse({
    id: optional(formData.get("id")),
    name: formData.get("name"),
    code: formData.get("code"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    breakMinutes: formData.get("breakMinutes"),
    overnight: optional(formData.get("overnight")),
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };
  try {
    await saveShiftRow(access.user.organization.id, access.user.id, parsed.data);
    refresh();
    return { success: true, message: parsed.data.id ? "Shift updated." : "Shift created." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save shift." };
  }
}

export async function assignShiftAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAttendance("attendance.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = shiftAssignmentSchema.safeParse({
    employeeId: formData.get("employeeId"),
    shiftId: formData.get("shiftId"),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: optional(formData.get("effectiveTo")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };
  try {
    await assignShiftRow(access.user.organization.id, access.user.id, parsed.data);
    refresh();
    return { success: true, message: "Shift assigned." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not assign shift." };
  }
}

export async function recalculateAttendanceAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAttendance("attendance.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = recalculateSchema.safeParse({
    from: formData.get("from"),
    to: formData.get("to"),
    employeeId: optional(formData.get("employeeId")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };
  try {
    const result = await recalculateAttendance({
      organizationId: access.user.organization.id,
      actorId: access.user.id,
      from: parsed.data.from,
      to: parsed.data.to,
      employeeId: parsed.data.employeeId || null,
      timezone: access.user.organization.timezone,
      weeklyOff: access.user.organization.weekly_off,
    });
    refresh();
    return {
      success: true,
      message: `Recalculated ${result.written} day(s). ${result.skippedLocked} locked by payroll.`,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Recalculation failed." };
  }
}

export async function submitRegularizationAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAttendance("attendance.regularize");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = regularizationSchema.safeParse({
    employeeId: formData.get("employeeId"),
    workDate: formData.get("workDate"),
    requestedIn: optional(formData.get("requestedIn")),
    requestedOut: optional(formData.get("requestedOut")),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };
  try {
    await submitRegularization(access.user.organization.id, access.user.id, parsed.data);
    refresh();
    return { success: true, message: "Regularization submitted." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not submit regularization." };
  }
}

export async function decideRegularizationAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAttendance("attendance.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = regularizationDecisionSchema.safeParse({
    id: formData.get("id"),
    decision: formData.get("decision"),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };
  try {
    await decideRegularization(access.user.organization.id, access.user.id, {
      ...parsed.data,
      timezone: access.user.organization.timezone,
      weeklyOff: access.user.organization.weekly_off,
    });
    refresh();
    return { success: true, message: `Regularization ${parsed.data.decision.toLowerCase()}.` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not decide regularization." };
  }
}

export async function dismissExceptionAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAttendance("attendance.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { success: false, message: "Exception is required." };
  try {
    await dismissException(access.user.organization.id, access.user.id, id);
    refresh();
    return { success: true, message: "Exception dismissed." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not dismiss exception." };
  }
}
