"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors, optional } from "@/lib/form-errors";
import { type PermissionCode } from "@/lib/constants";
import { defaultOrgStatutorySettings } from "@/lib/statutory/engine";
import {
  getOrgStatutorySettings,
  getStatutoryRuleVersion,
  getTaxDeclaration,
  insertStatutoryRuleVersion,
  insertTaxDeclaration,
  insertTaxDeclarationItem,
  updateStatutoryRuleVersion,
  updateTaxDeclaration,
  updateTaxProof,
  upsertOrgStatutorySettings,
} from "@/lib/statutory/repository";
import {
  orgStatutorySettingsSchema,
  statutoryRuleVersionSchema,
  taxDeclarationItemSchema,
  taxDeclarationReviewSchema,
  taxDeclarationSchema,
  taxProofReviewSchema,
} from "@/lib/validations/statutory";
import { asNumber } from "@/lib/payroll/engine";
import type { ActionResult, OrgStatutorySettings, StatutoryRuleVersion } from "@/types";

function stamp() {
  return new Date().toISOString();
}

function refresh() {
  revalidatePath("/compliance");
  revalidatePath("/compliance/rules");
  revalidatePath("/compliance/declarations");
  revalidatePath("/compliance/proofs");
  revalidatePath("/compliance/settings");
  revalidatePath("/compliance/forms");
  revalidatePath("/compliance/reports");
  revalidatePath("/payroll");
  revalidatePath("/employees");
}

function boolFromForm(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

async function requireAccess(permission: PermissionCode) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." as const, user: null };
  if (!hasPermission(user, permission)) return { error: "You do not have permission for this action." as const, user: null };
  return { error: null, user };
}

export async function saveStatutoryRuleVersionAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAccess("compliance.rules.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = statutoryRuleVersionSchema.safeParse({
    id: optional(formData.get("id")),
    head: formData.get("head"),
    versionCode: formData.get("versionCode"),
    name: formData.get("name"),
    jurisdiction: optional(formData.get("jurisdiction")),
    stateCode: optional(formData.get("stateCode")),
    taxYear: optional(formData.get("taxYear")),
    regime: optional(formData.get("regime")),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: optional(formData.get("effectiveTo")),
    status: formData.get("status") || "DRAFT",
    sourceName: optional(formData.get("sourceName")),
    sourceUrl: optional(formData.get("sourceUrl")),
    sourceCitation: optional(formData.get("sourceCitation")),
    configJson: formData.get("configJson"),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    JSON.parse(parsed.data.configJson);
  } catch {
    return { success: false, errors: { configJson: ["Enter valid JSON."] }, message: "Config JSON is invalid." };
  }
  const now = stamp();
  const orgId = access.user.organization.id;
  try {
    if (parsed.data.id) {
      const existing = await getStatutoryRuleVersion(orgId, parsed.data.id);
      if (!existing) return { success: false, message: "Rule version not found." };
      await updateStatutoryRuleVersion(existing.id, {
        head: parsed.data.head,
        version_code: parsed.data.versionCode,
        name: parsed.data.name,
        jurisdiction: parsed.data.jurisdiction || "INDIA",
        state_code: parsed.data.stateCode || null,
        tax_year: parsed.data.taxYear || null,
        regime: parsed.data.regime || null,
        effective_from: parsed.data.effectiveFrom,
        effective_to: parsed.data.effectiveTo || null,
        status: parsed.data.status || existing.status,
        source_name: parsed.data.sourceName || null,
        source_url: parsed.data.sourceUrl || null,
        source_citation: parsed.data.sourceCitation || null,
        config_json: parsed.data.configJson,
        notes: parsed.data.notes || null,
        updated_by: access.user.id,
        updated_at: now,
      });
    } else {
      const row: StatutoryRuleVersion = {
        id: crypto.randomUUID(),
        organization_id: orgId,
        head: parsed.data.head,
        version_code: parsed.data.versionCode,
        name: parsed.data.name,
        jurisdiction: parsed.data.jurisdiction || "INDIA",
        state_code: parsed.data.stateCode || null,
        tax_year: parsed.data.taxYear || null,
        regime: parsed.data.regime || null,
        effective_from: parsed.data.effectiveFrom,
        effective_to: parsed.data.effectiveTo || null,
        status: parsed.data.status || "DRAFT",
        verified: false,
        source_name: parsed.data.sourceName || null,
        source_url: parsed.data.sourceUrl || null,
        source_citation: parsed.data.sourceCitation || null,
        config_json: parsed.data.configJson,
        notes: parsed.data.notes || null,
        created_by: access.user.id,
        updated_by: access.user.id,
        created_at: now,
        updated_at: now,
      };
      await insertStatutoryRuleVersion(row);
    }
    await writeAudit({
      organizationId: orgId,
      actorUserId: access.user.id,
      action: parsed.data.id ? "statutory.rule.updated" : "statutory.rule.created",
      entityType: "statutory_rule_version",
      entityId: parsed.data.id || null,
    });
    refresh();
    return { success: true, message: "Rule version saved as unverified until a source is confirmed." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save rule version." };
  }
}

export async function toggleStatutoryRuleVersionAction(formData: FormData): Promise<void> {
  const access = await requireAccess("compliance.rules.manage");
  if (access.error || !access.user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const current = String(formData.get("status") ?? "DISABLED");
  const next = current === "ACTIVE" ? "DISABLED" : "ACTIVE";
  await updateStatutoryRuleVersion(id, { status: next, updated_by: access.user.id });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: next === "ACTIVE" ? "statutory.rule.activated" : "statutory.rule.disabled",
    entityType: "statutory_rule_version",
    entityId: id,
  });
  refresh();
}

export async function saveOrgStatutorySettingsAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAccess("compliance.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = orgStatutorySettingsSchema.safeParse({
    pfEnabled: boolFromForm(formData.get("pfEnabled")),
    esiEnabled: boolFromForm(formData.get("esiEnabled")),
    ptEnabled: boolFromForm(formData.get("ptEnabled")),
    lwfEnabled: boolFromForm(formData.get("lwfEnabled")),
    tdsEnabled: boolFromForm(formData.get("tdsEnabled")),
    pfRestrictToCeiling: boolFromForm(formData.get("pfRestrictToCeiling")),
    defaultStateCode: optional(formData.get("defaultStateCode")),
    tdsDefaultRegime: formData.get("tdsDefaultRegime") || "NEW_ACT_2025",
    showEmployerOnPayslip: boolFromForm(formData.get("showEmployerOnPayslip")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const now = stamp();
  const orgId = access.user.organization.id;
  const existing = await getOrgStatutorySettings(orgId);
  const base = existing ?? defaultOrgStatutorySettings(orgId, now);
  const row: OrgStatutorySettings = {
    ...base,
    pf_enabled: Boolean(parsed.data.pfEnabled),
    esi_enabled: Boolean(parsed.data.esiEnabled),
    pt_enabled: Boolean(parsed.data.ptEnabled),
    lwf_enabled: Boolean(parsed.data.lwfEnabled),
    tds_enabled: Boolean(parsed.data.tdsEnabled),
    pf_restrict_to_ceiling: parsed.data.pfRestrictToCeiling !== false,
    default_state_code: parsed.data.defaultStateCode || "KA",
    tds_default_regime: parsed.data.tdsDefaultRegime,
    show_employer_on_payslip: parsed.data.showEmployerOnPayslip !== false,
    updated_by: access.user.id,
    updated_at: now,
  };
  try {
    await upsertOrgStatutorySettings(row);
    await writeAudit({
      organizationId: orgId,
      actorUserId: access.user.id,
      action: "statutory.settings.updated",
      entityType: "org_statutory_settings",
      entityId: orgId,
    });
    refresh();
    return { success: true, message: "Compliance settings saved." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save settings." };
  }
}

export async function saveTaxDeclarationAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAccess("compliance.tax.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = taxDeclarationSchema.safeParse({
    id: optional(formData.get("id")),
    employeeId: formData.get("employeeId"),
    taxYear: formData.get("taxYear"),
    regime: formData.get("regime"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const now = stamp();
  const orgId = access.user.organization.id;
  try {
    if (parsed.data.id) {
      await updateTaxDeclaration(parsed.data.id, {
        tax_year: parsed.data.taxYear,
        regime: parsed.data.regime,
        updated_by: access.user.id,
        updated_at: now,
      });
    } else {
      await insertTaxDeclaration({
        id: crypto.randomUUID(),
        organization_id: orgId,
        employee_id: parsed.data.employeeId,
        tax_year: parsed.data.taxYear,
        regime: parsed.data.regime,
        status: "DRAFT",
        submitted_at: null,
        reviewed_by: null,
        reviewed_at: null,
        review_note: null,
        created_by: access.user.id,
        updated_by: access.user.id,
        created_at: now,
        updated_at: now,
      });
    }
    await writeAudit({
      organizationId: orgId,
      actorUserId: access.user.id,
      action: parsed.data.id ? "tax.declaration.updated" : "tax.declaration.created",
      entityType: "employee_tax_declaration",
      entityId: parsed.data.id || parsed.data.employeeId,
    });
    refresh();
    return { success: true, message: "Tax declaration saved." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save declaration." };
  }
}

export async function addTaxDeclarationItemAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAccess("compliance.tax.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = taxDeclarationItemSchema.safeParse({
    declarationId: formData.get("declarationId"),
    sectionCode: formData.get("sectionCode"),
    name: formData.get("name"),
    amount: formData.get("amount"),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const orgId = access.user.organization.id;
  const declaration = await getTaxDeclaration(orgId, parsed.data.declarationId);
  if (!declaration) return { success: false, message: "Declaration not found." };
  if (declaration.status !== "DRAFT") return { success: false, message: "Only draft declarations can be edited." };
  const now = stamp();
  try {
    await insertTaxDeclarationItem({
      id: crypto.randomUUID(),
      organization_id: orgId,
      declaration_id: declaration.id,
      section_code: parsed.data.sectionCode,
      name: parsed.data.name,
      amount: asNumber(parsed.data.amount),
      notes: parsed.data.notes || null,
      created_at: now,
      updated_at: now,
    });
    refresh();
    return { success: true, message: "Declaration item added." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not add item." };
  }
}

export async function submitTaxDeclarationAction(formData: FormData): Promise<void> {
  const access = await requireAccess("compliance.tax.manage");
  if (access.error || !access.user) return;
  const id = String(formData.get("declarationId") ?? "");
  if (!id) return;
  const now = stamp();
  await updateTaxDeclaration(id, { status: "SUBMITTED", submitted_at: now, updated_by: access.user.id, updated_at: now });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "tax.declaration.submitted",
    entityType: "employee_tax_declaration",
    entityId: id,
  });
  refresh();
}

export async function reviewTaxDeclarationFormAction(formData: FormData): Promise<void> {
  await reviewTaxDeclarationAction(undefined, formData);
}

export async function reviewTaxDeclarationAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAccess("compliance.tax.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = taxDeclarationReviewSchema.safeParse({
    declarationId: formData.get("declarationId"),
    decision: formData.get("decision"),
    note: optional(formData.get("note")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Review fields are required." };
  const now = stamp();
  try {
    await updateTaxDeclaration(parsed.data.declarationId, {
      status: parsed.data.decision,
      reviewed_by: access.user.id,
      reviewed_at: now,
      review_note: parsed.data.note || null,
      updated_by: access.user.id,
      updated_at: now,
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: parsed.data.decision === "APPROVED" ? "tax.declaration.approved" : "tax.declaration.rejected",
      entityType: "employee_tax_declaration",
      entityId: parsed.data.declarationId,
    });
    refresh();
    return { success: true, message: `Declaration ${parsed.data.decision.toLowerCase()}.` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not review declaration." };
  }
}

export async function reviewTaxProofFormAction(formData: FormData): Promise<void> {
  await reviewTaxProofAction(undefined, formData);
}

export async function reviewTaxProofAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAccess("compliance.proofs.review");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = taxProofReviewSchema.safeParse({
    proofId: formData.get("proofId"),
    status: formData.get("status"),
    note: optional(formData.get("note")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Proof review is required." };
  const now = stamp();
  try {
    await updateTaxProof(parsed.data.proofId, {
      status: parsed.data.status,
      reviewed_by: access.user.id,
      reviewed_at: now,
      review_note: parsed.data.note || null,
      updated_at: now,
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "tax.proof.reviewed",
      entityType: "employee_tax_proof",
      entityId: parsed.data.proofId,
    });
    refresh();
    return { success: true, message: "Proof reviewed." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not review proof." };
  }
}
