"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors, optional } from "@/lib/form-errors";
import { type PermissionCode } from "@/lib/constants";
import { benefitTypeSchema, benefitPolicySchema, employeeBenefitSchema, claimTypeSchema, claimPolicySchema, claimSchema, claimDecisionSchema } from "@/lib/validations/benefits";
import { asBool, asNumber } from "@/lib/claims/engine";
import {
  assignEmployeeBenefit,
  cancelClaim,
  closeEmployeeBenefit,
  createClaim,
  decideClaim,
  saveBenefitPolicyRow,
  saveBenefitTypeRow,
  saveClaimAttachmentRow,
  saveClaimPolicyRow,
  saveClaimTypeRow,
  submitClaim,
} from "@/lib/claims/service";
import {
  listBenefitTypes,
  listClaimTypes,
  updateBenefitPolicy,
  updateBenefitType,
  updateClaimType,
  updateClaimPolicy,
} from "@/lib/claims/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import type { ActionResult, BenefitPolicy, BenefitType, ClaimAttachment, ClaimPolicy, ClaimType } from "@/types";

function stamp() {
  return new Date().toISOString();
}

function refresh() {
  revalidatePath("/benefits");
  revalidatePath("/benefits/components");
  revalidatePath("/benefits/policies");
  revalidatePath("/benefits/employee");
  revalidatePath("/benefits/reports");
  revalidatePath("/claims");
  revalidatePath("/claims/new");
  revalidatePath("/claims/pending");
  revalidatePath("/claims/approvals");
  revalidatePath("/claims/approved");
  revalidatePath("/claims/history");
  revalidatePath("/claims/policies");
  revalidatePath("/claims/reports");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

async function requireAccess(permission: PermissionCode) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." as const, user: null };
  if (!hasPermission(user, permission)) return { error: "You do not have permission for this action." as const, user: null };
  return { error: null, user };
}

async function selfEmployeeId(userId: string, organizationId: string) {
  const catalog = await loadOrgCatalog(organizationId);
  return catalog.employees.find((item) => item.user_id === userId)?.id ?? null;
}

export async function saveBenefitTypeAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAccess("benefits.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = benefitTypeSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    category: formData.get("category"),
    calculationMethod: formData.get("calculationMethod"),
    fixedAmount: optional(formData.get("fixedAmount")),
    percentage: optional(formData.get("percentage")),
    frequency: formData.get("frequency") ?? "MONTHLY",
    eligibility: optional(formData.get("eligibility")),
    taxTreatment: formData.get("taxTreatment") ?? "UNSET",
    includeInCtc: optional(formData.get("includeInCtc")),
    includeInGross: optional(formData.get("includeInGross")),
    effectiveFrom: optional(formData.get("effectiveFrom")),
    effectiveTo: optional(formData.get("effectiveTo")),
    status: optional(formData.get("status")) || "ACTIVE",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const orgId = access.user.organization.id;
  const id = optional(formData.get("id"));
  const existing = await listBenefitTypes(orgId);
  const row: BenefitType = {
    id: id || crypto.randomUUID(),
    organization_id: orgId,
    name: parsed.data.name,
    code: parsed.data.code,
    category: parsed.data.category,
    calculation_method: parsed.data.calculationMethod,
    fixed_amount: parsed.data.fixedAmount ? asNumber(parsed.data.fixedAmount) : null,
    percentage: parsed.data.percentage ? asNumber(parsed.data.percentage) : null,
    frequency: parsed.data.frequency,
    eligibility: parsed.data.eligibility || null,
    tax_treatment: parsed.data.taxTreatment,
    include_in_ctc: asBool(parsed.data.includeInCtc),
    include_in_gross: asBool(parsed.data.includeInGross),
    effective_from: parsed.data.effectiveFrom || null,
    effective_to: parsed.data.effectiveTo || null,
    status: parsed.data.status ?? "ACTIVE",
    created_by: access.user.id,
    updated_by: access.user.id,
    created_at: stamp(),
    updated_at: stamp(),
  };
  try {
    await saveBenefitTypeRow(row, existing);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save benefit type." };
  }
  await writeAudit({ organizationId: orgId, actorUserId: access.user.id, action: id ? "benefits.type.update" : "benefits.type.create", entityType: "benefit_type", entityId: row.id });
  refresh();
  return { success: true, message: id ? "Benefit type updated." : "Benefit type created." };
}

export async function toggleBenefitTypeAction(formData: FormData): Promise<void> {
  const access = await requireAccess("benefits.manage");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  if (!id) return;
  const status = optional(formData.get("status")) === "ACTIVE" ? "DISABLED" : "ACTIVE";
  await updateBenefitType(id, { status, updated_by: access.user.id });
  await writeAudit({ organizationId: access.user.organization.id, actorUserId: access.user.id, action: `benefits.type.${status === "ACTIVE" ? "activate" : "deactivate"}`, entityType: "benefit_type", entityId: id });
  refresh();
}

export async function saveBenefitPolicyAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAccess("benefits.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = benefitPolicySchema.safeParse({
    name: formData.get("name"),
    benefitTypeId: formData.get("benefitTypeId"),
    maxAmount: optional(formData.get("maxAmount")),
    scope: formData.get("scope") ?? "ORGANIZATION",
    branchId: optional(formData.get("branchId")),
    departmentId: optional(formData.get("departmentId")),
    designationId: optional(formData.get("designationId")),
    employmentTypeId: optional(formData.get("employmentTypeId")),
    employeeId: optional(formData.get("employeeId")),
    requireAssignment: optional(formData.get("requireAssignment")),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: optional(formData.get("effectiveTo")),
    status: optional(formData.get("status")) || "ACTIVE",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const orgId = access.user.organization.id;
  const id = optional(formData.get("id"));
  const row: BenefitPolicy = {
    id: id || crypto.randomUUID(),
    organization_id: orgId,
    name: parsed.data.name,
    benefit_type_id: parsed.data.benefitTypeId,
    max_amount: parsed.data.maxAmount ? asNumber(parsed.data.maxAmount) : null,
    scope: parsed.data.scope,
    branch_id: parsed.data.branchId || null,
    department_id: parsed.data.departmentId || null,
    designation_id: parsed.data.designationId || null,
    employment_type_id: parsed.data.employmentTypeId || null,
    employee_id: parsed.data.employeeId || null,
    require_assignment: asBool(parsed.data.requireAssignment),
    effective_from: parsed.data.effectiveFrom,
    effective_to: parsed.data.effectiveTo || null,
    status: parsed.data.status ?? "ACTIVE",
    created_by: access.user.id,
    updated_by: access.user.id,
    created_at: stamp(),
    updated_at: stamp(),
  };
  try {
    await saveBenefitPolicyRow(row);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save policy." };
  }
  await writeAudit({ organizationId: orgId, actorUserId: access.user.id, action: id ? "benefits.policy.update" : "benefits.policy.create", entityType: "benefit_policy", entityId: row.id });
  refresh();
  return { success: true, message: id ? "Policy updated." : "Policy created." };
}

export async function toggleBenefitPolicyAction(formData: FormData): Promise<void> {
  const access = await requireAccess("benefits.manage");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  if (!id) return;
  const status = optional(formData.get("status")) === "ACTIVE" ? "DISABLED" : "ACTIVE";
  await updateBenefitPolicy(id, { status, updated_by: access.user.id });
  await writeAudit({ organizationId: access.user.organization.id, actorUserId: access.user.id, action: `benefits.policy.${status === "ACTIVE" ? "activate" : "deactivate"}`, entityType: "benefit_policy", entityId: id });
  refresh();
}

export async function assignEmployeeBenefitAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAccess("benefits.assign");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = employeeBenefitSchema.safeParse({
    employeeId: formData.get("employeeId"),
    benefitTypeId: formData.get("benefitTypeId"),
    amount: formData.get("amount"),
    calculationMethod: formData.get("calculationMethod") ?? "FIXED",
    percentage: optional(formData.get("percentage")),
    effectiveFrom: formData.get("effectiveFrom"),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    const row = await assignEmployeeBenefit({
      organizationId: access.user.organization.id,
      employeeId: parsed.data.employeeId,
      benefitTypeId: parsed.data.benefitTypeId,
      amount: asNumber(parsed.data.amount),
      calculationMethod: parsed.data.calculationMethod,
      percentage: parsed.data.percentage ? asNumber(parsed.data.percentage) : null,
      effectiveFrom: parsed.data.effectiveFrom,
      notes: parsed.data.notes || null,
      actorId: access.user.id,
    });
    await writeAudit({ organizationId: access.user.organization.id, actorUserId: access.user.id, action: "benefits.assigned", entityType: "employee_benefit", entityId: row.id });
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not assign benefit." };
  }
  refresh();
  return { success: true, message: "Benefit assigned." };
}

export async function closeEmployeeBenefitAction(formData: FormData): Promise<void> {
  const access = await requireAccess("benefits.assign");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  if (!id) return;
  await closeEmployeeBenefit(access.user.organization.id, id, access.user.id);
  await writeAudit({ organizationId: access.user.organization.id, actorUserId: access.user.id, action: "benefits.closed", entityType: "employee_benefit", entityId: id });
  refresh();
}

export async function saveClaimTypeAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAccess("claims.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = claimTypeSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    category: formData.get("category"),
    requiresReceipt: optional(formData.get("requiresReceipt")),
    requiresTravelFields: optional(formData.get("requiresTravelFields")),
    maxAmount: optional(formData.get("maxAmount")),
    workflowMode: formData.get("workflowMode") ?? "TWO_STEP",
    includeInPayrollDefault: optional(formData.get("includeInPayrollDefault")),
    status: optional(formData.get("status")) || "ACTIVE",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const orgId = access.user.organization.id;
  const id = optional(formData.get("id"));
  const existing = await listClaimTypes(orgId);
  const row: ClaimType = {
    id: id || crypto.randomUUID(),
    organization_id: orgId,
    name: parsed.data.name,
    code: parsed.data.code,
    category: parsed.data.category,
    requires_receipt: asBool(parsed.data.requiresReceipt),
    requires_travel_fields: asBool(parsed.data.requiresTravelFields),
    max_amount: parsed.data.maxAmount ? asNumber(parsed.data.maxAmount) : null,
    workflow_mode: parsed.data.workflowMode,
    include_in_payroll_default: asBool(parsed.data.includeInPayrollDefault, true),
    status: parsed.data.status ?? "ACTIVE",
    created_by: access.user.id,
    updated_by: access.user.id,
    created_at: stamp(),
    updated_at: stamp(),
  };
  try {
    await saveClaimTypeRow(row, existing);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save claim type." };
  }
  await writeAudit({ organizationId: orgId, actorUserId: access.user.id, action: id ? "claims.type.update" : "claims.type.create", entityType: "claim_type", entityId: row.id });
  refresh();
  return { success: true, message: id ? "Claim type updated." : "Claim type created." };
}

export async function toggleClaimTypeAction(formData: FormData): Promise<void> {
  const access = await requireAccess("claims.manage");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  if (!id) return;
  const status = optional(formData.get("status")) === "ACTIVE" ? "DISABLED" : "ACTIVE";
  await updateClaimType(id, { status, updated_by: access.user.id });
  await writeAudit({ organizationId: access.user.organization.id, actorUserId: access.user.id, action: `claims.type.${status === "ACTIVE" ? "activate" : "deactivate"}`, entityType: "claim_type", entityId: id });
  refresh();
}

export async function saveClaimPolicyAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAccess("claims.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = claimPolicySchema.safeParse({
    name: formData.get("name"),
    claimTypeId: optional(formData.get("claimTypeId")),
    employeeCategory: optional(formData.get("employeeCategory")),
    designationId: optional(formData.get("designationId")),
    cityCategory: optional(formData.get("cityCategory")),
    travelType: optional(formData.get("travelType")),
    daPerDay: optional(formData.get("daPerDay")),
    mileageRate: optional(formData.get("mileageRate")),
    localConveyanceLimit: optional(formData.get("localConveyanceLimit")),
    hotelLimit: optional(formData.get("hotelLimit")),
    mealLimit: optional(formData.get("mealLimit")),
    maxAmount: optional(formData.get("maxAmount")),
    maxDays: optional(formData.get("maxDays")),
    requireReceipt: optional(formData.get("requireReceipt")),
    workflowMode: formData.get("workflowMode") ?? "TWO_STEP",
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: optional(formData.get("effectiveTo")),
    status: optional(formData.get("status")) || "ACTIVE",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const orgId = access.user.organization.id;
  const id = optional(formData.get("id"));
  const row: ClaimPolicy = {
    id: id || crypto.randomUUID(),
    organization_id: orgId,
    name: parsed.data.name,
    claim_type_id: parsed.data.claimTypeId || null,
    employee_category: parsed.data.employeeCategory || null,
    designation_id: parsed.data.designationId || null,
    city_category: parsed.data.cityCategory || null,
    travel_type: parsed.data.travelType || null,
    da_per_day: parsed.data.daPerDay ? asNumber(parsed.data.daPerDay) : null,
    mileage_rate: parsed.data.mileageRate ? asNumber(parsed.data.mileageRate) : null,
    local_conveyance_limit: parsed.data.localConveyanceLimit ? asNumber(parsed.data.localConveyanceLimit) : null,
    hotel_limit: parsed.data.hotelLimit ? asNumber(parsed.data.hotelLimit) : null,
    meal_limit: parsed.data.mealLimit ? asNumber(parsed.data.mealLimit) : null,
    max_amount: parsed.data.maxAmount ? asNumber(parsed.data.maxAmount) : null,
    max_days: parsed.data.maxDays ? asNumber(parsed.data.maxDays) : null,
    require_receipt: asBool(parsed.data.requireReceipt),
    workflow_mode: parsed.data.workflowMode,
    effective_from: parsed.data.effectiveFrom,
    effective_to: parsed.data.effectiveTo || null,
    status: parsed.data.status ?? "ACTIVE",
    created_by: access.user.id,
    updated_by: access.user.id,
    created_at: stamp(),
    updated_at: stamp(),
  };
  try {
    await saveClaimPolicyRow(row);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save claim policy." };
  }
  await writeAudit({ organizationId: orgId, actorUserId: access.user.id, action: id ? "claims.policy.update" : "claims.policy.create", entityType: "claim_policy", entityId: row.id });
  refresh();
  return { success: true, message: id ? "Claim policy updated." : "Claim policy created." };
}

export async function toggleClaimPolicyAction(formData: FormData): Promise<void> {
  const access = await requireAccess("claims.manage");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  if (!id) return;
  const status = optional(formData.get("status")) === "ACTIVE" ? "DISABLED" : "ACTIVE";
  await updateClaimPolicy(id, { status, updated_by: access.user.id });
  await writeAudit({ organizationId: access.user.organization.id, actorUserId: access.user.id, action: `claims.policy.${status === "ACTIVE" ? "activate" : "deactivate"}`, entityType: "claim_policy", entityId: id });
  refresh();
}

export async function saveClaimAction(
  _prev: ActionResult<{ claimId: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ claimId: string }>> {
  const access = await requireAccess("claims.create");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = claimSchema.safeParse({
    employeeId: formData.get("employeeId"),
    claimTypeId: formData.get("claimTypeId"),
    claimDate: formData.get("claimDate"),
    periodFrom: optional(formData.get("periodFrom")),
    periodTo: optional(formData.get("periodTo")),
    purpose: optional(formData.get("purpose")),
    amount: optional(formData.get("amount")),
    notes: optional(formData.get("notes")),
    referenceNumber: optional(formData.get("referenceNumber")),
    overrideReason: optional(formData.get("overrideReason")),
    distance: optional(formData.get("distance")),
    ratePerKm: optional(formData.get("ratePerKm")),
    travelMode: optional(formData.get("travelMode")),
    travelDays: optional(formData.get("travelDays")),
    cityCategory: optional(formData.get("cityCategory")),
    travelType: optional(formData.get("travelType")),
    includeInPayroll: optional(formData.get("includeInPayroll")),
    submit: optional(formData.get("submit")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };

  const orgId = access.user.organization.id;
  if (access.user.roleCode === "EMPLOYEE") {
    const self = await selfEmployeeId(access.user.id, orgId);
    if (!self || self !== parsed.data.employeeId) return { success: false, message: "You can only raise your own claims." };
  }
  const id = optional(formData.get("id")) || crypto.randomUUID();
  try {
    const { claim } = await createClaim({
      id,
      organizationId: orgId,
      employeeId: parsed.data.employeeId,
      claimTypeId: parsed.data.claimTypeId,
      claimDate: parsed.data.claimDate,
      periodFrom: parsed.data.periodFrom || null,
      periodTo: parsed.data.periodTo || null,
      purpose: parsed.data.purpose || null,
      amount: parsed.data.amount ? asNumber(parsed.data.amount) : null,
      notes: parsed.data.notes || null,
      referenceNumber: parsed.data.referenceNumber || null,
      overrideReason: parsed.data.overrideReason || null,
      distance: parsed.data.distance ? asNumber(parsed.data.distance) : null,
      ratePerKm: parsed.data.ratePerKm ? asNumber(parsed.data.ratePerKm) : null,
      travelMode: parsed.data.travelMode || null,
      travelDays: parsed.data.travelDays ? asNumber(parsed.data.travelDays) : null,
      cityCategory: parsed.data.cityCategory || null,
      travelType: parsed.data.travelType || null,
      includeInPayroll: asBool(parsed.data.includeInPayroll, true),
      items: [],
      actorId: access.user.id,
      submit: asBool(parsed.data.submit),
    });
    await writeAudit({ organizationId: orgId, actorUserId: access.user.id, action: "claims.saved", entityType: "claim", entityId: claim.id });
    refresh();
    return { success: true, message: "Claim saved.", data: { claimId: claim.id } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save claim." };
  }
}

export async function submitClaimAction(formData: FormData): Promise<void> {
  const access = await requireAccess("claims.create");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  if (!id) return;
  await submitClaim(access.user.organization.id, id, access.user.id);
  await writeAudit({ organizationId: access.user.organization.id, actorUserId: access.user.id, action: "claims.submitted", entityType: "claim", entityId: id });
  refresh();
}

export async function decideClaimAction(formData: FormData): Promise<void> {
  const access = await requireAccess("claims.approve");
  if (access.error || !access.user) return;
  const parsed = claimDecisionSchema.safeParse({
    claimId: formData.get("claimId"),
    decision: formData.get("decision"),
    amount: optional(formData.get("amount")),
    reason: optional(formData.get("reason")),
  });
  if (!parsed.success) return;
  await decideClaim({
    organizationId: access.user.organization.id,
    claimId: parsed.data.claimId,
    decision: parsed.data.decision,
    amount: parsed.data.amount ? asNumber(parsed.data.amount) : null,
    reason: parsed.data.reason || null,
    actorId: access.user.id,
  });
  await writeAudit({ organizationId: access.user.organization.id, actorUserId: access.user.id, action: `claims.${parsed.data.decision.toLowerCase()}`, entityType: "claim", entityId: parsed.data.claimId });
  refresh();
}

export async function cancelClaimAction(formData: FormData): Promise<void> {
  const access = await requireAccess("claims.create");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  if (!id) return;
  await cancelClaim(access.user.organization.id, id, access.user.id);
  await writeAudit({ organizationId: access.user.organization.id, actorUserId: access.user.id, action: "claims.cancelled", entityType: "claim", entityId: id });
  refresh();
}

export async function uploadClaimAttachmentAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const create = await requireAccess("claims.create");
  const edit = await requireAccess("claims.edit");
  const access = create.user ? create : edit;
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const claimId = optional(formData.get("claimId"));
  const file = formData.get("file");
  if (!claimId) return { success: false, message: "Claim is required." };
  if (!(file instanceof File) || file.size === 0) return { success: false, message: "Choose a file to upload." };
  if (file.size > 5 * 1024 * 1024) return { success: false, message: "Receipts must be 5MB or smaller." };
  const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
  if (file.type && !allowed.includes(file.type)) return { success: false, message: "Only PDF, PNG, JPG or WEBP receipts are allowed." };

  const orgId = access.user.organization.id;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${orgId}/${claimId}/${crypto.randomUUID()}-${safeName}`;
  if (hasSupabaseConfig() && !isDemoMode()) {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Storage is not configured." };
    const { error } = await admin.storage.from("claim-receipts").upload(path, file, { contentType: file.type || undefined });
    if (error) return { success: false, message: error.message };
  }
  const row: ClaimAttachment = {
    id: crypto.randomUUID(),
    organization_id: orgId,
    claim_id: claimId,
    employee_id: optional(formData.get("employeeId")) || "",
    file_name: file.name,
    file_path: path,
    mime_type: file.type || null,
    file_size: file.size,
    uploaded_by: access.user.id,
    created_at: stamp(),
  };
  await saveClaimAttachmentRow(row);
  await writeAudit({ organizationId: orgId, actorUserId: access.user.id, action: "claims.attachment.upload", entityType: "claim_attachment", entityId: row.id });
  refresh();
  return { success: true, message: "Receipt uploaded." };
}
