"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors, optional } from "@/lib/form-errors";
import type { PermissionCode } from "@/lib/constants";
import {
  generateJournalSchema,
  journalIdSchema,
  ledgerAccountSchema,
  payrollMappingSchema,
} from "@/lib/validations/accounting";
import { exportJournal, generateJournal, saveAccount, saveMapping, validateJournal } from "@/lib/accounting/service";
import type { ActionResult } from "@/types";

function refresh() {
  revalidatePath("/accounting");
  revalidatePath("/accounting/mappings");
  revalidatePath("/accounting/journals");
  revalidatePath("/accounting/exports");
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

export async function saveAccountAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("accounting.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = ledgerAccountSchema.safeParse({
    id: optional(formData.get("id")),
    code: formData.get("code"),
    name: formData.get("name"),
    accountType: formData.get("accountType"),
    description: optional(formData.get("description")),
    status: optional(formData.get("status")) || "ACTIVE",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    const saved = await saveAccount(
      access.user.organization.id,
      {
        id: parsed.data.id || null,
        code: parsed.data.code,
        name: parsed.data.name,
        accountType: parsed.data.accountType,
        description: parsed.data.description || null,
        status: parsed.data.status ?? "ACTIVE",
      },
      access.user.id
    );
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: parsed.data.id ? "accounting.account.update" : "accounting.account.create",
      entityType: "accounting_account",
      entityId: saved.id,
      metadata: { code: saved.code },
    });
    refresh();
    return { success: true, message: parsed.data.id ? "Ledger account updated." : "Ledger account saved." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save ledger account." };
  }
}

export async function saveMappingAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("accounting.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = payrollMappingSchema.safeParse({
    id: optional(formData.get("id")),
    category: formData.get("category"),
    componentCode: optional(formData.get("componentCode")),
    ledgerAccountId: formData.get("ledgerAccountId"),
    treatment: formData.get("treatment"),
    branchId: optional(formData.get("branchId")),
    departmentId: optional(formData.get("departmentId")),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: optional(formData.get("effectiveTo")),
    active: optional(formData.get("active")),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    const saved = await saveMapping(
      access.user.organization.id,
      {
        id: parsed.data.id || null,
        category: parsed.data.category,
        componentCode: parsed.data.componentCode || null,
        ledgerAccountId: parsed.data.ledgerAccountId,
        treatment: parsed.data.treatment,
        branchId: parsed.data.branchId || null,
        departmentId: parsed.data.departmentId || null,
        effectiveFrom: parsed.data.effectiveFrom,
        effectiveTo: parsed.data.effectiveTo || null,
        active: parsed.data.active === undefined ? true : truthy(parsed.data.active),
        notes: parsed.data.notes || null,
      },
      access.user.id
    );
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: parsed.data.id ? "accounting.mapping.update" : "accounting.mapping.create",
      entityType: "payroll_account_mapping",
      entityId: saved.id,
      metadata: { category: saved.category, treatment: saved.treatment },
    });
    refresh();
    return { success: true, message: parsed.data.id ? "Mapping updated." : "Mapping saved." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save mapping." };
  }
}

export async function generateJournalAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("accounting.journal.view");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  if (!hasPermission(access.user, "accounting.manage") && !hasPermission(access.user, "accounting.journal.export")) {
    return { success: false, message: "You do not have permission for this action." };
  }
  const parsed = generateJournalSchema.safeParse({
    runId: formData.get("runId"),
    journalDate: optional(formData.get("journalDate")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    const result = await generateJournal(access.user.organization.id, parsed.data.runId, access.user.id, {
      journalDate: parsed.data.journalDate || undefined,
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: result.existed ? "accounting.journal.open" : "accounting.journal.generate",
      entityType: "payroll_journal",
      entityId: result.journal.id,
      metadata: { runId: parsed.data.runId, issues: result.issues.length },
    });
    refresh();
    revalidatePath(`/accounting/${result.journal.id}`);
    return {
      success: true,
      message: result.existed
        ? "An active journal already exists for this run."
        : result.issues.length
          ? `Journal drafted with ${result.issues.length} unmapped component${result.issues.length === 1 ? "" : "s"}.`
          : "Journal generated from the finalized payroll snapshot.",
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not generate journal." };
  }
}

export async function validateJournalAction(formData: FormData): Promise<void> {
  const access = await requireAccess("accounting.journal.view");
  if (access.error || !access.user) return;
  const journalId = String(formData.get("journalId") ?? "");
  if (!journalId) return;
  await validateJournal(access.user.organization.id, journalId);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "accounting.journal.validate",
    entityType: "payroll_journal",
    entityId: journalId,
  });
  refresh();
  revalidatePath(`/accounting/${journalId}`);
}

export async function exportJournalAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("accounting.journal.export");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = journalIdSchema.safeParse({
    journalId: formData.get("journalId"),
    duplicate: formData.get("duplicate"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Journal is required." };
  try {
    const result = await exportJournal(access.user.organization.id, parsed.data.journalId, access.user.id, {
      duplicate: truthy(parsed.data.duplicate),
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "accounting.journal.export",
      entityType: "payroll_journal",
      entityId: result.journal.id,
      metadata: { exportId: result.export.id, duplicate: Boolean(result.export.duplicate_of), rowCount: result.export.row_count },
    });
    refresh();
    revalidatePath(`/accounting/${result.journal.id}`);
    return { success: true, message: result.export.duplicate_of ? "Duplicate journal export recorded." : "Journal exported as CSV." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not export journal." };
  }
}
