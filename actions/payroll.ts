"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors, optional } from "@/lib/form-errors";
import { type PermissionCode } from "@/lib/constants";
import { payrollAcknowledgeSchema, payrollAdjustmentSchema, payrollHoldSchema, payrollReasonSchema, payrollRunSchema, statutoryRuleSchema } from "@/lib/validations/payroll";
import { asNumber } from "@/lib/payroll/engine";
import {
  acknowledgePayrollException,
  approvePayrollRun,
  calculatePayrollRun,
  cancelPayrollRun,
  createPayrollAdjustment,
  createPayrollRun,
  finalizePayrollRun,
  generatePayslipsForRun,
  holdPayrollItem,
  includePayrollItem,
  lockPayrollRun,
  markPayrollPaid,
  processPayrollRun,
  rejectPayrollRun,
  resolvePayrollException,
  returnPayrollToDraft,
  saveStatutoryRuleRow,
  submitPayrollForReview,
  unlockPayrollRun,
} from "@/lib/payroll/service";
import { listStatutoryRules, updateStatutoryRule } from "@/lib/payroll/repository";
import type { ActionResult, StatutoryRule } from "@/types";

function stamp() {
  return new Date().toISOString();
}

function refresh() {
  revalidatePath("/payroll");
  revalidatePath("/payroll/runs");
  revalidatePath("/payroll/employees");
  revalidatePath("/payroll/payslips");
  revalidatePath("/payroll/reports");
  revalidatePath("/payroll/settings");
  revalidatePath("/payroll/review");
  revalidatePath("/payroll/exceptions");
  revalidatePath("/payslips");
  revalidatePath("/compliance");
  revalidatePath("/dashboard");
  revalidatePath("/employees");
  revalidatePath("/loans");
  revalidatePath("/claims");
}

async function requireAccess(permission: PermissionCode) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." as const, user: null };
  if (!hasPermission(user, permission)) return { error: "You do not have permission for this action." as const, user: null };
  return { error: null, user };
}

export async function createPayrollRunAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("payroll.process");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = payrollRunSchema.safeParse({
    period: formData.get("period"),
    payDate: optional(formData.get("payDate")),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    const run = await createPayrollRun({
      organizationId: access.user.organization.id,
      period: parsed.data.period,
      payDate: parsed.data.payDate || null,
      notes: parsed.data.notes || null,
      actorId: access.user.id,
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "payroll.run.create",
      entityType: "payroll_run",
      entityId: run?.id ?? null,
      metadata: { period: parsed.data.period },
    });
    refresh();
    return { success: true, message: "Payroll run calculated." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not create payroll run." };
  }
}

export async function calculatePayrollRunAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payroll.process");
  if (access.error || !access.user) return;
  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;
  await calculatePayrollRun(access.user.organization.id, runId, access.user.id);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "payroll.run.calculate",
    entityType: "payroll_run",
    entityId: runId,
  });
  refresh();
}

export async function lockPayrollRunAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payroll.lock");
  if (access.error || !access.user) return;
  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;
  await lockPayrollRun(access.user.organization.id, runId, access.user.id, access.user.roleCode);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "payroll.run.lock",
    entityType: "payroll_run",
    entityId: runId,
  });
  refresh();
}

export async function unlockPayrollRunAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payroll.lock");
  if (access.error || !access.user) return;
  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;
  await unlockPayrollRun(access.user.organization.id, runId, access.user.id, access.user.roleCode);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "payroll.run.unlock",
    entityType: "payroll_run",
    entityId: runId,
  });
  refresh();
}

export async function processPayrollRunAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payroll.process");
  if (access.error || !access.user) return;
  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;
  await processPayrollRun(access.user.organization.id, runId, access.user.id);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "payroll.run.process",
    entityType: "payroll_run",
    entityId: runId,
  });
  refresh();
}

export async function markPayrollPaidAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payroll.process");
  if (access.error || !access.user) return;
  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;
  await markPayrollPaid(access.user.organization.id, runId, access.user.id);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "payroll.run.paid",
    entityType: "payroll_run",
    entityId: runId,
  });
  refresh();
}

export async function holdPayrollItemAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("payroll.process");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = payrollHoldSchema.safeParse({
    itemId: formData.get("itemId"),
    reason: optional(formData.get("reason")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    await holdPayrollItem(access.user.organization.id, parsed.data.itemId, parsed.data.reason || null, access.user.id);
    refresh();
    return { success: true, message: "Employee held from this run." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not hold employee." };
  }
}

export async function includePayrollItemAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payroll.process");
  if (access.error || !access.user) return;
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return;
  await includePayrollItem(access.user.organization.id, itemId, access.user.id);
  refresh();
}

export async function saveStatutoryRuleAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("payroll.settings");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = statutoryRuleSchema.safeParse({
    head: formData.get("head"),
    name: formData.get("name"),
    employeeRate: optional(formData.get("employeeRate")),
    employerRate: optional(formData.get("employerRate")),
    wageCeiling: optional(formData.get("wageCeiling")),
    minWage: optional(formData.get("minWage")),
    maxWage: optional(formData.get("maxWage")),
    fixedAmount: optional(formData.get("fixedAmount")),
    stateCode: optional(formData.get("stateCode")),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: optional(formData.get("effectiveTo")),
    status: optional(formData.get("status")) || "ACTIVE",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const existing = await listStatutoryRules(access.user.organization.id);
  const id = optional(formData.get("id")) || crypto.randomUUID();
  const found = existing.find((item) => item.id === id);
  const row: StatutoryRule = {
    id,
    organization_id: access.user.organization.id,
    head: parsed.data.head,
    name: parsed.data.name,
    employee_rate: asNumber(parsed.data.employeeRate),
    employer_rate: asNumber(parsed.data.employerRate),
    wage_ceiling: parsed.data.wageCeiling ? asNumber(parsed.data.wageCeiling) : null,
    min_wage: parsed.data.minWage ? asNumber(parsed.data.minWage) : null,
    max_wage: parsed.data.maxWage ? asNumber(parsed.data.maxWage) : null,
    fixed_amount: parsed.data.fixedAmount ? asNumber(parsed.data.fixedAmount) : null,
    slab_json: found?.slab_json ?? (parsed.data.head === "PT" ? JSON.stringify([
      { from: 0, to: 15000, amount: 0 },
      { from: 15001, to: 20000, amount: 200 },
      { from: 20001, to: null, amount: 300 },
    ]) : null),
    state_code: parsed.data.stateCode || null,
    effective_from: parsed.data.effectiveFrom,
    effective_to: parsed.data.effectiveTo || null,
    status: parsed.data.status ?? "ACTIVE",
    created_by: found?.created_by ?? access.user.id,
    updated_by: access.user.id,
    created_at: found?.created_at ?? stamp(),
    updated_at: stamp(),
  };
  try {
    await saveStatutoryRuleRow(row, existing);
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: found ? "payroll.statutory.edit" : "payroll.statutory.create",
      entityType: "statutory_rule",
      entityId: row.id,
    });
    refresh();
    return { success: true, message: found ? "Statutory rule updated." : "Statutory rule saved." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save rule." };
  }
}

export async function submitPayrollReviewAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payroll.review");
  if (access.error || !access.user) return;
  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;
  await submitPayrollForReview(access.user.organization.id, runId, access.user.id, access.user.roleCode);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "payroll.submitted",
    entityType: "payroll_run",
    entityId: runId,
  });
  refresh();
}

export async function approvePayrollRunAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payroll.approve");
  if (access.error || !access.user) return;
  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;
  await approvePayrollRun(access.user.organization.id, runId, access.user.id, access.user.roleCode);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "payroll.approved",
    entityType: "payroll_run",
    entityId: runId,
  });
  refresh();
}

export async function rejectPayrollRunAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("payroll.reject");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = payrollReasonSchema.safeParse({ runId: formData.get("runId"), reason: formData.get("reason") });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "A reason is required." };
  try {
    await rejectPayrollRun(access.user.organization.id, parsed.data.runId, access.user.id, access.user.roleCode, parsed.data.reason);
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "payroll.rejected",
      entityType: "payroll_run",
      entityId: parsed.data.runId,
      metadata: { reason: parsed.data.reason },
    });
    refresh();
    return { success: true, message: "Payroll rejected." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not reject payroll." };
  }
}

export async function returnPayrollDraftAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("payroll.process");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = payrollReasonSchema.safeParse({ runId: formData.get("runId"), reason: formData.get("reason") });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "A reason is required." };
  try {
    await returnPayrollToDraft(access.user.organization.id, parsed.data.runId, access.user.id, access.user.roleCode, parsed.data.reason);
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "payroll.returned",
      entityType: "payroll_run",
      entityId: parsed.data.runId,
      metadata: { reason: parsed.data.reason },
    });
    refresh();
    return { success: true, message: "Returned to draft." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not return payroll." };
  }
}

export async function finalizePayrollRunAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payroll.finalize");
  if (access.error || !access.user) return;
  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;
  await finalizePayrollRun(access.user.organization.id, runId, access.user.id, access.user.roleCode);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "payroll.finalized",
    entityType: "payroll_run",
    entityId: runId,
  });
  refresh();
}

export async function cancelPayrollRunAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("payroll.process");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = payrollReasonSchema.safeParse({ runId: formData.get("runId"), reason: formData.get("reason") });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "A reason is required." };
  try {
    await cancelPayrollRun(access.user.organization.id, parsed.data.runId, access.user.id, access.user.roleCode, parsed.data.reason);
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "payroll.cancelled",
      entityType: "payroll_run",
      entityId: parsed.data.runId,
      metadata: { reason: parsed.data.reason },
    });
    refresh();
    return { success: true, message: "Payroll cancelled." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not cancel payroll." };
  }
}

export async function acknowledgePayrollExceptionAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("payroll.review");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = payrollAcknowledgeSchema.safeParse({
    exceptionId: formData.get("exceptionId"),
    note: optional(formData.get("note")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Exception is required." };
  try {
    await acknowledgePayrollException(access.user.organization.id, parsed.data.exceptionId, access.user.id, parsed.data.note || null);
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "payroll.exception.acknowledged",
      entityType: "payroll_exception",
      entityId: parsed.data.exceptionId,
    });
    refresh();
    return { success: true, message: "Warning acknowledged." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not acknowledge exception." };
  }
}

export async function resolvePayrollExceptionAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payroll.process");
  if (access.error || !access.user) return;
  const exceptionId = String(formData.get("exceptionId") ?? "");
  if (!exceptionId) return;
  await resolvePayrollException(access.user.organization.id, exceptionId);
  refresh();
}

export async function createPayrollAdjustmentAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("payroll.adjust");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = payrollAdjustmentSchema.safeParse({
    runId: formData.get("runId"),
    itemId: formData.get("itemId"),
    kind: formData.get("kind"),
    name: formData.get("name"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    await createPayrollAdjustment({
      organizationId: access.user.organization.id,
      runId: parsed.data.runId,
      itemId: parsed.data.itemId,
      kind: parsed.data.kind,
      name: parsed.data.name,
      amount: asNumber(parsed.data.amount),
      reason: parsed.data.reason,
      actorId: access.user.id,
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "payroll.adjustment.created",
      entityType: "payroll_adjustment",
      entityId: parsed.data.runId,
    });
    refresh();
    return { success: true, message: "Adjustment posted." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not post adjustment." };
  }
}

export async function generatePayslipsAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payslip.generate");
  if (access.error || !access.user) return;
  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;
  const slips = await generatePayslipsForRun(access.user.organization.id, runId, access.user.id);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: slips.some((item) => item.regenerated_at) ? "payslip.regenerated" : "payslip.generated",
    entityType: "payroll_run",
    entityId: runId,
  });
  refresh();
}

export async function toggleStatutoryRuleAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payroll.settings");
  if (access.error || !access.user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const status = String(formData.get("status") ?? "DISABLED") === "ACTIVE" ? "DISABLED" : "ACTIVE";
  await updateStatutoryRule(id, { status, updated_by: access.user.id });
  refresh();
}
