"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors, optional } from "@/lib/form-errors";
import type { PermissionCode } from "@/lib/constants";
import { asNumber } from "@/lib/payroll/engine";
import { DEFAULT_BANK_COLUMNS } from "@/lib/payments/columns";
import {
  approvePaymentBatch,
  cancelPaymentBatch,
  confirmReconciliation,
  createPaymentBatch,
  excludePaymentItem,
  exportPaymentBatch,
  includePaymentItem,
  previewReconciliation,
  recordPaymentOutcome,
  savePaymentSettings,
  validatePaymentBatch,
} from "@/lib/payments/service";
import {
  paymentBatchIdSchema,
  paymentBatchSchema,
  paymentCancelSchema,
  paymentExcludeSchema,
  paymentIncludeSchema,
  paymentOutcomeSchema,
  paymentSettingsSchema,
  reconciliationConfirmSchema,
  reconciliationPreviewSchema,
} from "@/lib/validations/payments";
import type { ActionResult } from "@/types";

function refresh(batchId?: string) {
  revalidatePath("/payments");
  revalidatePath("/payments/new");
  revalidatePath("/payments/history");
  revalidatePath("/payments/settings");
  if (batchId) revalidatePath(`/payments/${batchId}`);
}

async function requireAccess(permission: PermissionCode) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." as const, user: null };
  if (!hasPermission(user, permission)) return { error: "You do not have permission for this action." as const, user: null };
  return { error: null, user };
}

function truthy(value: unknown) {
  return value === true || value === "on" || value === "true";
}

export async function createPaymentBatchAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("payments.create");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = paymentBatchSchema.safeParse({
    runId: formData.get("runId"),
    paymentDate: formData.get("paymentDate"),
    paymentMethod: formData.get("paymentMethod"),
    bankAccountReference: optional(formData.get("bankAccountReference")),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    const result = await createPaymentBatch(
      access.user.organization.id,
      {
        runId: parsed.data.runId,
        paymentDate: parsed.data.paymentDate,
        paymentMethod: parsed.data.paymentMethod,
        bankAccountReference: parsed.data.bankAccountReference || null,
        notes: parsed.data.notes || null,
      },
      access.user.id
    );
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "payments.batch.create",
      entityType: "payment_batch",
      entityId: result.batch.id,
      metadata: { runId: parsed.data.runId, issues: result.issues.length },
    });
    refresh(result.batch.id);
    return {
      success: true,
      message: result.issues.some((item) => item.severity === "ERROR")
        ? "Batch created with employee-level bank errors. Exclude with a reason or fix bank details."
        : "Payment batch created from the finalized payroll run.",
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not create payment batch." };
  }
}

export async function validatePaymentBatchAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payments.create");
  if (access.error || !access.user) return;
  const batchId = String(formData.get("batchId") ?? "");
  if (!batchId) return;
  await validatePaymentBatch(access.user.organization.id, batchId);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "payments.batch.validate",
    entityType: "payment_batch",
    entityId: batchId,
  });
  refresh(batchId);
}

export async function excludePaymentItemAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("payments.create");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = paymentExcludeSchema.safeParse({
    batchId: formData.get("batchId"),
    itemId: formData.get("itemId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "A reason is required to exclude an employee." };
  try {
    await excludePaymentItem(access.user.organization.id, parsed.data.batchId, parsed.data.itemId, parsed.data.reason);
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "payments.item.exclude",
      entityType: "payment_batch_item",
      entityId: parsed.data.itemId,
      metadata: { batchId: parsed.data.batchId },
    });
    refresh(parsed.data.batchId);
    return { success: true, message: "Employee excluded from this payment batch. Finalized net salary was not changed." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not exclude employee." };
  }
}

export async function includePaymentItemAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payments.create");
  if (access.error || !access.user) return;
  const parsed = paymentIncludeSchema.safeParse({
    batchId: formData.get("batchId"),
    itemId: formData.get("itemId"),
  });
  if (!parsed.success) return;
  await includePaymentItem(access.user.organization.id, parsed.data.batchId, parsed.data.itemId);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "payments.item.include",
    entityType: "payment_batch_item",
    entityId: parsed.data.itemId,
    metadata: { batchId: parsed.data.batchId },
  });
  refresh(parsed.data.batchId);
}

export async function approvePaymentBatchAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payments.approve");
  if (access.error || !access.user) return;
  const batchId = String(formData.get("batchId") ?? "");
  if (!batchId) return;
  await approvePaymentBatch(access.user.organization.id, batchId, access.user.id);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "payments.batch.approve",
    entityType: "payment_batch",
    entityId: batchId,
  });
  refresh(batchId);
}

export async function cancelPaymentBatchAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("payments.create");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = paymentCancelSchema.safeParse({
    batchId: formData.get("batchId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "A cancel reason is required." };
  try {
    await cancelPaymentBatch(access.user.organization.id, parsed.data.batchId, parsed.data.reason);
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "payments.batch.cancel",
      entityType: "payment_batch",
      entityId: parsed.data.batchId,
    });
    refresh(parsed.data.batchId);
    return { success: true, message: "Payment batch cancelled." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not cancel payment batch." };
  }
}

export async function exportPaymentBatchAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("payments.export");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = paymentBatchIdSchema.safeParse({
    batchId: formData.get("batchId"),
    duplicate: formData.get("duplicate"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Payment batch is required." };
  try {
    const result = await exportPaymentBatch(access.user.organization.id, parsed.data.batchId, access.user.id, {
      duplicate: truthy(parsed.data.duplicate),
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "payments.batch.export",
      entityType: "payment_batch",
      entityId: result.batch.id,
      metadata: { exportId: result.export.id, rowCount: result.export.row_count, duplicate: truthy(parsed.data.duplicate) },
    });
    refresh(result.batch.id);
    return {
      success: true,
      message: "Bank file exported as an instruction only. Exporting does not mean salaries were paid.",
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not export bank file." };
  }
}

export async function recordPaymentOutcomeAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("payments.reconcile");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = paymentOutcomeSchema.safeParse({
    batchId: formData.get("batchId"),
    itemId: formData.get("itemId"),
    status: formData.get("status"),
    paymentDate: formData.get("paymentDate"),
    amount: optional(formData.get("amount")),
    reference: optional(formData.get("reference")),
    bankReference: optional(formData.get("bankReference")),
    failureReason: optional(formData.get("failureReason")),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    const txn = await recordPaymentOutcome(
      access.user.organization.id,
      {
        batchId: parsed.data.batchId,
        itemId: parsed.data.itemId,
        status: parsed.data.status,
        paymentDate: parsed.data.paymentDate,
        amount: parsed.data.amount ? asNumber(parsed.data.amount) : undefined,
        reference: parsed.data.reference || null,
        bankReference: parsed.data.bankReference || null,
        failureReason: parsed.data.failureReason || null,
        notes: parsed.data.notes || null,
        source: "MANUAL",
      },
      access.user.id
    );
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "payments.outcome.record",
      entityType: "payment_transaction",
      entityId: txn.id,
      metadata: { batchId: parsed.data.batchId, itemId: parsed.data.itemId, status: parsed.data.status },
    });
    refresh(parsed.data.batchId);
    return { success: true, message: "Payment outcome recorded. History is appended, not overwritten." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not record payment outcome." };
  }
}

export async function savePaymentSettingsAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("payments.create");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const selected = formData.getAll("columns").map(String);
  const parsed = paymentSettingsSchema.safeParse({
    defaultMethod: formData.get("defaultMethod"),
    bankAccountReference: optional(formData.get("bankAccountReference")),
    filePrefix: formData.get("filePrefix"),
    includeHeader: optional(formData.get("includeHeader")),
    columns: selected.length ? selected : DEFAULT_BANK_COLUMNS.map((col) => col.key),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    await savePaymentSettings(
      access.user.organization.id,
      {
        defaultMethod: parsed.data.defaultMethod,
        bankAccountReference: parsed.data.bankAccountReference || null,
        filePrefix: parsed.data.filePrefix,
        includeHeader: parsed.data.includeHeader === undefined ? true : truthy(parsed.data.includeHeader),
        columns: parsed.data.columns.map((key) => {
          const def = DEFAULT_BANK_COLUMNS.find((col) => col.key === key);
          return { key, header: def?.header ?? key };
        }),
      },
      access.user.id
    );
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "payments.settings.update",
      entityType: "payment_settings",
      entityId: access.user.organization.id,
    });
    refresh();
    return { success: true, message: "Generic bank-file mapping saved. No bank-specific formats or APIs are claimed." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save payment settings." };
  }
}

export async function previewReconciliationAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("payments.reconcile");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = reconciliationPreviewSchema.safeParse({ batchId: formData.get("batchId") });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Payment batch is required." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false, message: "Upload a bank-result CSV to preview." };
  try {
    const text = await file.text();
    const result = await previewReconciliation(access.user.organization.id, parsed.data.batchId, text, file.name);
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "payments.reconciliation.preview",
      entityType: "payment_reconciliation",
      entityId: result.reconciliation.id,
      metadata: { batchId: parsed.data.batchId, ...result.summary },
    });
    refresh(parsed.data.batchId);
    return {
      success: true,
      message: `Preview ready: ${result.summary.matched_count} matched, ${result.summary.unmatched_count} unmatched, ${result.summary.duplicate_count} duplicate, ${result.summary.mismatch_count} amount mismatch. Confirm to post matched rows only.`,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not preview reconciliation." };
  }
}

export async function confirmReconciliationAction(formData: FormData): Promise<void> {
  const access = await requireAccess("payments.reconcile");
  if (access.error || !access.user) return;
  const parsed = reconciliationConfirmSchema.safeParse({
    reconciliationId: formData.get("reconciliationId"),
    batchId: formData.get("batchId"),
  });
  if (!parsed.success) return;
  await confirmReconciliation(access.user.organization.id, parsed.data.reconciliationId, access.user.id);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "payments.reconciliation.confirm",
    entityType: "payment_reconciliation",
    entityId: parsed.data.reconciliationId,
    metadata: { batchId: parsed.data.batchId },
  });
  refresh(parsed.data.batchId);
}
