"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors, optional } from "@/lib/form-errors";
import { type PermissionCode } from "@/lib/constants";
import {
  clearanceItemSchema,
  clearanceTaskSchema,
  contractorSchema,
  engagementSchema,
  exitDecisionSchema,
  exitSchema,
  invoiceDecisionSchema,
  invoicePaymentSchema,
  invoiceSchema,
  settlementAdjustmentSchema,
  settlementCreateSchema,
  settlementDecisionSchema,
  settlementPaymentSchema,
} from "@/lib/validations/exits";
import { asBool, asNumber } from "@/lib/exits/engine";
import {
  cancelEmployeeExit,
  decideEmployeeExit,
  saveClearanceItemRow,
  saveEmployeeExit,
  submitEmployeeExit,
  updateClearanceTaskStatus,
} from "@/lib/exits/service";
import {
  addSettlementAdjustment,
  calculateSettlement,
  cancelSettlement,
  createSettlement,
  decideSettlement,
  finalizeSettlement,
  recordSettlementPayment,
  submitSettlementReview,
} from "@/lib/exits/settlement";
import {
  cancelInvoice,
  decideInvoice,
  recordInvoicePayment,
  saveContractor,
  saveEngagement,
  saveInvoice,
  submitInvoice,
} from "@/lib/exits/contractors";
import type { ActionResult } from "@/types";

function refresh() {
  revalidatePath("/employees/exits");
  revalidatePath("/settlements");
  revalidatePath("/contractors");
  revalidatePath("/contractor-payments");
  revalidatePath("/dashboard");
  revalidatePath("/employees");
  revalidatePath("/payroll");
}

async function requireAccess(permission: PermissionCode) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." as const, user: null };
  if (!hasPermission(user, permission)) return { error: "You do not have permission for this action." as const, user: null };
  return { error: null, user };
}

export async function saveExitAction(_prev: ActionResult<{ exitId: string }> | undefined, formData: FormData): Promise<ActionResult<{ exitId: string }>> {
  const access = await requireAccess("exits.create");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = exitSchema.safeParse({
    employeeId: formData.get("employeeId"),
    exitType: formData.get("exitType"),
    noticeDate: formData.get("noticeDate"),
    lastWorkingDate: formData.get("lastWorkingDate"),
    noticePeriodDays: formData.get("noticePeriodDays"),
    noticeServedDays: optional(formData.get("noticeServedDays")),
    reason: optional(formData.get("reason")),
    remarks: optional(formData.get("remarks")),
    attachmentName: optional(formData.get("attachmentName")),
    approverId: optional(formData.get("approverId")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const id = optional(formData.get("id"));
  try {
    const row = await saveEmployeeExit({
      organizationId: access.user.organization.id,
      actorId: access.user.id,
      id: id || undefined,
      employeeId: parsed.data.employeeId,
      exitType: parsed.data.exitType,
      noticeDate: parsed.data.noticeDate,
      lastWorkingDate: parsed.data.lastWorkingDate,
      noticePeriodDays: Math.round(asNumber(parsed.data.noticePeriodDays)),
      noticeServedDays: Math.round(asNumber(parsed.data.noticeServedDays)),
      reason: parsed.data.reason,
      remarks: parsed.data.remarks,
      attachmentName: parsed.data.attachmentName,
      approverId: parsed.data.approverId || null,
    });
    if (asBool(formData.get("submit"))) {
      await submitEmployeeExit(access.user.organization.id, row.id, access.user.id);
    }
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: asBool(formData.get("submit")) ? "exits.submitted" : id ? "exits.updated" : "exits.created",
      entityType: "employee_exit",
      entityId: row.id,
    });
    refresh();
    return { success: true, message: asBool(formData.get("submit")) ? "Exit submitted." : "Exit saved.", data: { exitId: row.id } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save exit." };
  }
}

export async function submitExitAction(formData: FormData): Promise<void> {
  const access = await requireAccess("exits.create");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  if (!id) return;
  await submitEmployeeExit(access.user.organization.id, id, access.user.id);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "exits.submitted",
    entityType: "employee_exit",
    entityId: id,
  });
  refresh();
}

export async function decideExitAction(formData: FormData): Promise<void> {
  const access = await requireAccess("exits.approve");
  if (access.error || !access.user) return;
  const parsed = exitDecisionSchema.safeParse({
    exitId: formData.get("exitId"),
    decision: formData.get("decision"),
    reason: optional(formData.get("reason")),
  });
  if (!parsed.success) return;
  await decideEmployeeExit({
    organizationId: access.user.organization.id,
    organization: access.user.organization,
    exitId: parsed.data.exitId,
    actorId: access.user.id,
    decision: parsed.data.decision,
    reason: parsed.data.reason,
  });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: `exits.${parsed.data.decision.toLowerCase()}`,
    entityType: "employee_exit",
    entityId: parsed.data.exitId,
  });
  refresh();
}

export async function cancelExitAction(formData: FormData): Promise<void> {
  const access = await requireAccess("exits.cancel");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  const reason = optional(formData.get("reason")) || "Cancelled";
  if (!id) return;
  await cancelEmployeeExit({
    organizationId: access.user.organization.id,
    exitId: id,
    actorId: access.user.id,
    reason,
  });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "exits.cancelled",
    entityType: "employee_exit",
    entityId: id,
  });
  refresh();
}

export async function saveClearanceItemAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("exits.edit");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = clearanceItemSchema.safeParse({
    department: formData.get("department"),
    code: formData.get("code"),
    name: formData.get("name"),
    description: optional(formData.get("description")),
    required: optional(formData.get("required")),
    defaultDueDays: optional(formData.get("defaultDueDays")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    const row = await saveClearanceItemRow({
      organizationId: access.user.organization.id,
      actorId: access.user.id,
      id: optional(formData.get("id")) || undefined,
      department: parsed.data.department,
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description,
      required: asBool(parsed.data.required),
      defaultDueDays: Math.round(asNumber(parsed.data.defaultDueDays) || 7),
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "exits.clearance.saved",
      entityType: "exit_clearance_item",
      entityId: row.id,
    });
    refresh();
    return { success: true, message: "Clearance item saved." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save clearance item." };
  }
}

export async function updateClearanceTaskAction(formData: FormData): Promise<void> {
  const access = await requireAccess("exits.edit");
  if (access.error || !access.user) return;
  const parsed = clearanceTaskSchema.safeParse({
    taskId: formData.get("taskId"),
    status: formData.get("status"),
    remarks: optional(formData.get("remarks")),
  });
  if (!parsed.success) return;
  await updateClearanceTaskStatus({
    organizationId: access.user.organization.id,
    taskId: parsed.data.taskId,
    actorId: access.user.id,
    status: parsed.data.status,
    remarks: parsed.data.remarks,
    timezone: access.user.organization.timezone,
  });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "exits.clearance.updated",
    entityType: "exit_clearance_task",
    entityId: parsed.data.taskId,
  });
  refresh();
}

export async function createSettlementAction(_prev: ActionResult<{ settlementId: string }> | undefined, formData: FormData): Promise<ActionResult<{ settlementId: string }>> {
  const access = await requireAccess("settlements.calculate");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = settlementCreateSchema.safeParse({ exitId: formData.get("exitId") });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    const row = await createSettlement({
      organizationId: access.user.organization.id,
      actorId: access.user.id,
      exitId: parsed.data.exitId,
    });
    await calculateSettlement({
      organizationId: access.user.organization.id,
      organization: access.user.organization,
      settlementId: row.id,
      actorId: access.user.id,
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "settlements.created",
      entityType: "final_settlement",
      entityId: row.id,
    });
    refresh();
    return { success: true, message: "Settlement created and calculated.", data: { settlementId: row.id } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not create settlement." };
  }
}

export async function calculateSettlementAction(formData: FormData): Promise<void> {
  const access = await requireAccess("settlements.calculate");
  if (access.error || !access.user) return;
  const id = optional(formData.get("settlementId"));
  if (!id) return;
  await calculateSettlement({
    organizationId: access.user.organization.id,
    organization: access.user.organization,
    settlementId: id,
    actorId: access.user.id,
  });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "settlements.calculated",
    entityType: "final_settlement",
    entityId: id,
  });
  refresh();
}

export async function submitSettlementAction(formData: FormData): Promise<void> {
  const access = await requireAccess("settlements.review");
  if (access.error || !access.user) return;
  const id = optional(formData.get("settlementId"));
  if (!id) return;
  await submitSettlementReview(access.user.organization.id, id, access.user.id);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "settlements.reviewed",
    entityType: "final_settlement",
    entityId: id,
  });
  refresh();
}

export async function decideSettlementAction(formData: FormData): Promise<void> {
  const access = await requireAccess("settlements.approve");
  if (access.error || !access.user) return;
  const parsed = settlementDecisionSchema.safeParse({
    settlementId: formData.get("settlementId"),
    decision: formData.get("decision"),
    reason: optional(formData.get("reason")),
  });
  if (!parsed.success) return;
  await decideSettlement({
    organizationId: access.user.organization.id,
    settlementId: parsed.data.settlementId,
    actorId: access.user.id,
    decision: parsed.data.decision,
    reason: parsed.data.reason,
  });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: `settlements.${parsed.data.decision.toLowerCase()}`,
    entityType: "final_settlement",
    entityId: parsed.data.settlementId,
  });
  refresh();
}

export async function finalizeSettlementAction(formData: FormData): Promise<void> {
  const access = await requireAccess("settlements.finalize");
  if (access.error || !access.user) return;
  const id = optional(formData.get("settlementId"));
  if (!id) return;
  await finalizeSettlement({
    organizationId: access.user.organization.id,
    settlementId: id,
    actorId: access.user.id,
  });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "settlements.finalized",
    entityType: "final_settlement",
    entityId: id,
  });
  refresh();
}

export async function addSettlementAdjustmentAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("settlements.adjust");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = settlementAdjustmentSchema.safeParse({
    settlementId: formData.get("settlementId"),
    kind: formData.get("kind"),
    direction: formData.get("direction"),
    name: formData.get("name"),
    amount: formData.get("amount"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    await addSettlementAdjustment({
      organizationId: access.user.organization.id,
      settlementId: parsed.data.settlementId,
      actorId: access.user.id,
      kind: parsed.data.kind,
      direction: parsed.data.direction,
      name: parsed.data.name,
      amount: asNumber(parsed.data.amount),
      notes: parsed.data.notes,
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "settlements.adjusted",
      entityType: "final_settlement",
      entityId: parsed.data.settlementId,
    });
    refresh();
    return { success: true, message: "Adjustment recorded." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not add adjustment." };
  }
}

export async function recordSettlementPaymentAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("settlements.pay");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = settlementPaymentSchema.safeParse({
    settlementId: formData.get("settlementId"),
    amount: formData.get("amount"),
    paymentDate: formData.get("paymentDate"),
    method: formData.get("method"),
    reference: optional(formData.get("reference")),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    await recordSettlementPayment({
      organizationId: access.user.organization.id,
      settlementId: parsed.data.settlementId,
      actorId: access.user.id,
      amount: asNumber(parsed.data.amount),
      paymentDate: parsed.data.paymentDate,
      method: parsed.data.method,
      reference: parsed.data.reference,
      notes: parsed.data.notes,
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "settlements.paid",
      entityType: "final_settlement",
      entityId: parsed.data.settlementId,
    });
    refresh();
    return { success: true, message: "Payment recorded." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not record payment." };
  }
}

export async function cancelSettlementAction(formData: FormData): Promise<void> {
  const access = await requireAccess("settlements.approve");
  if (access.error || !access.user) return;
  const id = optional(formData.get("settlementId"));
  const reason = optional(formData.get("reason")) || "Cancelled";
  if (!id) return;
  await cancelSettlement({
    organizationId: access.user.organization.id,
    settlementId: id,
    actorId: access.user.id,
    reason,
  });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "settlements.cancelled",
    entityType: "final_settlement",
    entityId: id,
  });
  refresh();
}

export async function saveContractorAction(_prev: ActionResult<{ contractorId: string }> | undefined, formData: FormData): Promise<ActionResult<{ contractorId: string }>> {
  const access = await requireAccess("contractors.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = contractorSchema.safeParse({
    contractorCode: formData.get("contractorCode"),
    legalName: formData.get("legalName"),
    displayName: formData.get("displayName"),
    businessType: formData.get("businessType"),
    pan: optional(formData.get("pan")),
    gstin: optional(formData.get("gstin")),
    email: optional(formData.get("email")),
    phone: optional(formData.get("phone")),
    addressLine1: optional(formData.get("addressLine1")),
    addressLine2: optional(formData.get("addressLine2")),
    city: optional(formData.get("city")),
    state: optional(formData.get("state")),
    pin: optional(formData.get("pin")),
    bankName: optional(formData.get("bankName")),
    accountNumber: optional(formData.get("accountNumber")),
    ifsc: optional(formData.get("ifsc")),
    reportingManagerId: optional(formData.get("reportingManagerId")),
    status: optional(formData.get("status")) || "ACTIVE",
    notes: optional(formData.get("notes")),
    documentName: optional(formData.get("documentName")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    const row = await saveContractor({
      organizationId: access.user.organization.id,
      actorId: access.user.id,
      id: optional(formData.get("id")) || undefined,
      ...parsed.data,
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: optional(formData.get("id")) ? "contractors.updated" : "contractors.created",
      entityType: "contractor",
      entityId: row.id,
    });
    refresh();
    return { success: true, message: "Contractor saved.", data: { contractorId: row.id } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save contractor." };
  }
}

export async function saveEngagementAction(_prev: ActionResult<{ engagementId: string }> | undefined, formData: FormData): Promise<ActionResult<{ engagementId: string }>> {
  const access = await requireAccess("contractors.engagements.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = engagementSchema.safeParse({
    contractorId: formData.get("contractorId"),
    scope: formData.get("scope"),
    startDate: formData.get("startDate"),
    endDate: optional(formData.get("endDate")),
    feeAmount: formData.get("feeAmount"),
    rateUnit: formData.get("rateUnit"),
    paymentFrequency: formData.get("paymentFrequency"),
    invoiceTerms: optional(formData.get("invoiceTerms")),
    notes: optional(formData.get("notes")),
    status: optional(formData.get("status")) || "ACTIVE",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    const row = await saveEngagement({
      organizationId: access.user.organization.id,
      actorId: access.user.id,
      id: optional(formData.get("id")) || undefined,
      contractorId: parsed.data.contractorId,
      scope: parsed.data.scope,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      feeAmount: asNumber(parsed.data.feeAmount),
      rateUnit: parsed.data.rateUnit,
      paymentFrequency: parsed.data.paymentFrequency,
      invoiceTerms: parsed.data.invoiceTerms,
      notes: parsed.data.notes,
      status: parsed.data.status,
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "contractors.engagement.saved",
      entityType: "contractor_engagement",
      entityId: row.id,
    });
    refresh();
    return { success: true, message: "Engagement saved.", data: { engagementId: row.id } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save engagement." };
  }
}

export async function saveInvoiceAction(_prev: ActionResult<{ invoiceId: string }> | undefined, formData: FormData): Promise<ActionResult<{ invoiceId: string }>> {
  const access = await requireAccess("contractors.invoices.create");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = invoiceSchema.safeParse({
    contractorId: formData.get("contractorId"),
    engagementId: optional(formData.get("engagementId")),
    invoiceNumber: formData.get("invoiceNumber"),
    invoiceDate: formData.get("invoiceDate"),
    serviceFrom: formData.get("serviceFrom"),
    serviceTo: formData.get("serviceTo"),
    dueDate: optional(formData.get("dueDate")),
    grossAmount: formData.get("grossAmount"),
    adjustmentAmount: optional(formData.get("adjustmentAmount")),
    duplicateOverrideReason: optional(formData.get("duplicateOverrideReason")),
    attachmentName: optional(formData.get("attachmentName")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    const row = await saveInvoice({
      organizationId: access.user.organization.id,
      actorId: access.user.id,
      id: optional(formData.get("id")) || undefined,
      contractorId: parsed.data.contractorId,
      engagementId: parsed.data.engagementId || null,
      invoiceNumber: parsed.data.invoiceNumber,
      invoiceDate: parsed.data.invoiceDate,
      serviceFrom: parsed.data.serviceFrom,
      serviceTo: parsed.data.serviceTo,
      dueDate: parsed.data.dueDate,
      grossAmount: asNumber(parsed.data.grossAmount),
      adjustmentAmount: asNumber(parsed.data.adjustmentAmount),
      duplicateOverrideReason: parsed.data.duplicateOverrideReason,
      attachmentName: parsed.data.attachmentName,
    });
    if (asBool(formData.get("submit"))) {
      await submitInvoice(access.user.organization.id, row.id, access.user.id);
    }
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: asBool(formData.get("submit")) ? "contractors.invoice.submitted" : "contractors.invoice.saved",
      entityType: "contractor_invoice",
      entityId: row.id,
    });
    refresh();
    return { success: true, message: asBool(formData.get("submit")) ? "Invoice submitted." : "Invoice saved.", data: { invoiceId: row.id } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save invoice." };
  }
}

export async function submitInvoiceAction(formData: FormData): Promise<void> {
  const access = await requireAccess("contractors.invoices.create");
  if (access.error || !access.user) return;
  const id = optional(formData.get("invoiceId"));
  if (!id) return;
  await submitInvoice(access.user.organization.id, id, access.user.id);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "contractors.invoice.submitted",
    entityType: "contractor_invoice",
    entityId: id,
  });
  refresh();
}

export async function decideInvoiceAction(formData: FormData): Promise<void> {
  const access = await requireAccess("contractors.invoices.approve");
  if (access.error || !access.user) return;
  const parsed = invoiceDecisionSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    decision: formData.get("decision"),
    reason: optional(formData.get("reason")),
  });
  if (!parsed.success) return;
  await decideInvoice({
    organizationId: access.user.organization.id,
    invoiceId: parsed.data.invoiceId,
    actorId: access.user.id,
    decision: parsed.data.decision,
    reason: parsed.data.reason,
  });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: `contractors.invoice.${parsed.data.decision.toLowerCase()}`,
    entityType: "contractor_invoice",
    entityId: parsed.data.invoiceId,
  });
  refresh();
}

export async function recordInvoicePaymentAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("contractors.pay");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = invoicePaymentSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    amount: formData.get("amount"),
    paymentDate: formData.get("paymentDate"),
    method: formData.get("method"),
    reference: optional(formData.get("reference")),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    await recordInvoicePayment({
      organizationId: access.user.organization.id,
      invoiceId: parsed.data.invoiceId,
      actorId: access.user.id,
      amount: asNumber(parsed.data.amount),
      paymentDate: parsed.data.paymentDate,
      method: parsed.data.method,
      reference: parsed.data.reference,
      notes: parsed.data.notes,
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "contractors.invoice.paid",
      entityType: "contractor_invoice",
      entityId: parsed.data.invoiceId,
    });
    refresh();
    return { success: true, message: "Payment recorded." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not record payment." };
  }
}

export async function cancelInvoiceAction(formData: FormData): Promise<void> {
  const access = await requireAccess("contractors.invoices.create");
  if (access.error || !access.user) return;
  const id = optional(formData.get("invoiceId"));
  if (!id) return;
  await cancelInvoice(access.user.organization.id, id, access.user.id);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "contractors.invoice.cancelled",
    entityType: "contractor_invoice",
    entityId: id,
  });
  refresh();
}
