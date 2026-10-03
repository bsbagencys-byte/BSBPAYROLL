"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors, optional } from "@/lib/form-errors";
import { type PermissionCode } from "@/lib/constants";
import {
  loanAdjustmentSchema,
  loanApplicationSchema,
  loanDecisionSchema,
  loanDisburseSchema,
  loanPolicySchema,
  loanRepaymentSchema,
  loanTypeSchema,
} from "@/lib/validations/loans";
import { asBool, asNumber } from "@/lib/loans/engine";
import {
  adjustLoan,
  cancelLoanApplication,
  createLoanApplication,
  decideLoanApplication,
  disburseLoan,
  recordLoanRepayment,
  saveLoanPolicyRow,
  saveLoanTypeRow,
  submitLoanApplication,
} from "@/lib/loans/service";
import { listLoanPolicies, listLoanTypes, updateLoanPolicy, updateLoanType } from "@/lib/loans/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import type { ActionResult, LoanPolicy, LoanType } from "@/types";

function stamp() {
  return new Date().toISOString();
}

function refresh() {
  revalidatePath("/loans");
  revalidatePath("/loans/types");
  revalidatePath("/loans/applications");
  revalidatePath("/loans/active");
  revalidatePath("/loans/repayments");
  revalidatePath("/loans/history");
  revalidatePath("/loans/settings");
  revalidatePath("/dashboard");
  revalidatePath("/employees");
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

export async function saveLoanTypeAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("loans.settings");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = loanTypeSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    category: formData.get("category"),
    description: optional(formData.get("description")),
    maxAmount: optional(formData.get("maxAmount")),
    maxTenureMonths: optional(formData.get("maxTenureMonths")),
    interestMethod: formData.get("interestMethod") ?? "NONE",
    interestRate: optional(formData.get("interestRate")),
    processingFee: optional(formData.get("processingFee")),
    eligibility: optional(formData.get("eligibility")),
    allowMultipleActive: optional(formData.get("allowMultipleActive")),
    autoDeductPayroll: optional(formData.get("autoDeductPayroll")),
    workflowMode: formData.get("workflowMode") ?? "TWO_STEP",
    status: optional(formData.get("status")) || "ACTIVE",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const orgId = access.user.organization.id;
  const id = optional(formData.get("id"));
  const existing = await listLoanTypes(orgId);
  const row: LoanType = {
    id: id || crypto.randomUUID(),
    organization_id: orgId,
    name: parsed.data.name,
    code: parsed.data.code,
    category: parsed.data.category,
    description: parsed.data.description || null,
    max_amount: parsed.data.maxAmount ? asNumber(parsed.data.maxAmount) : null,
    max_tenure_months: parsed.data.maxTenureMonths ? Math.round(asNumber(parsed.data.maxTenureMonths)) : null,
    interest_method: parsed.data.interestMethod,
    interest_rate: parsed.data.interestRate ? asNumber(parsed.data.interestRate) : null,
    processing_fee: parsed.data.processingFee ? asNumber(parsed.data.processingFee) : null,
    eligibility: parsed.data.eligibility || null,
    allow_multiple_active: asBool(parsed.data.allowMultipleActive),
    auto_deduct_payroll: parsed.data.autoDeductPayroll === undefined ? true : asBool(parsed.data.autoDeductPayroll),
    workflow_mode: parsed.data.workflowMode,
    status: parsed.data.status ?? "ACTIVE",
    created_by: access.user.id,
    updated_by: access.user.id,
    created_at: stamp(),
    updated_at: stamp(),
  };
  try {
    await saveLoanTypeRow(row, existing);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save loan type." };
  }
  await writeAudit({
    organizationId: orgId,
    actorUserId: access.user.id,
    action: id ? "loans.type.update" : "loans.type.create",
    entityType: "loan_type",
    entityId: row.id,
  });
  refresh();
  return { success: true, message: "Loan type saved." };
}

export async function toggleLoanTypeAction(formData: FormData): Promise<void> {
  const access = await requireAccess("loans.settings");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  const status = optional(formData.get("status")) === "ACTIVE" ? "DISABLED" : "ACTIVE";
  if (!id) return;
  await updateLoanType(id, { status, updated_by: access.user.id });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: status === "ACTIVE" ? "loans.type.activate" : "loans.type.deactivate",
    entityType: "loan_type",
    entityId: id,
  });
  refresh();
}

export async function saveLoanPolicyAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("loans.settings");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = loanPolicySchema.safeParse({
    name: formData.get("name"),
    loanTypeId: formData.get("loanTypeId"),
    maxAmount: optional(formData.get("maxAmount")),
    maxTenureMonths: optional(formData.get("maxTenureMonths")),
    maxActiveLoans: optional(formData.get("maxActiveLoans")),
    minServiceMonths: optional(formData.get("minServiceMonths")),
    scope: formData.get("scope") ?? "ORGANIZATION",
    branchId: optional(formData.get("branchId")),
    departmentId: optional(formData.get("departmentId")),
    designationId: optional(formData.get("designationId")),
    employmentTypeId: optional(formData.get("employmentTypeId")),
    employeeId: optional(formData.get("employeeId")),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: optional(formData.get("effectiveTo")),
    status: optional(formData.get("status")) || "ACTIVE",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const orgId = access.user.organization.id;
  const id = optional(formData.get("id"));
  const existing = await listLoanPolicies(orgId);
  const row: LoanPolicy = {
    id: id || crypto.randomUUID(),
    organization_id: orgId,
    name: parsed.data.name,
    loan_type_id: parsed.data.loanTypeId,
    max_amount: parsed.data.maxAmount ? asNumber(parsed.data.maxAmount) : null,
    max_tenure_months: parsed.data.maxTenureMonths ? Math.round(asNumber(parsed.data.maxTenureMonths)) : null,
    max_active_loans: parsed.data.maxActiveLoans ? Math.round(asNumber(parsed.data.maxActiveLoans)) : null,
    min_service_months: parsed.data.minServiceMonths ? Math.round(asNumber(parsed.data.minServiceMonths)) : null,
    scope: parsed.data.scope,
    branch_id: parsed.data.branchId || null,
    department_id: parsed.data.departmentId || null,
    designation_id: parsed.data.designationId || null,
    employment_type_id: parsed.data.employmentTypeId || null,
    employee_id: parsed.data.employeeId || null,
    effective_from: parsed.data.effectiveFrom,
    effective_to: parsed.data.effectiveTo || null,
    status: parsed.data.status ?? "ACTIVE",
    created_by: access.user.id,
    updated_by: access.user.id,
    created_at: stamp(),
    updated_at: stamp(),
  };
  try {
    await saveLoanPolicyRow(row, existing);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save policy." };
  }
  await writeAudit({
    organizationId: orgId,
    actorUserId: access.user.id,
    action: id ? "loans.policy.update" : "loans.policy.create",
    entityType: "loan_policy",
    entityId: row.id,
  });
  refresh();
  return { success: true, message: "Loan policy saved." };
}

export async function toggleLoanPolicyAction(formData: FormData): Promise<void> {
  const access = await requireAccess("loans.settings");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  const status = optional(formData.get("status")) === "ACTIVE" ? "DISABLED" : "ACTIVE";
  if (!id) return;
  await updateLoanPolicy(id, { status, updated_by: access.user.id });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: status === "ACTIVE" ? "loans.policy.activate" : "loans.policy.deactivate",
    entityType: "loan_policy",
    entityId: id,
  });
  refresh();
}

export async function saveLoanApplicationAction(
  _prev: ActionResult<{ applicationId: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ applicationId: string }>> {
  const access = await requireAccess("loans.create");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = loanApplicationSchema.safeParse({
    employeeId: formData.get("employeeId"),
    loanTypeId: formData.get("loanTypeId"),
    requestedAmount: formData.get("requestedAmount"),
    tenureMonths: formData.get("tenureMonths"),
    interestRate: optional(formData.get("interestRate")),
    purpose: optional(formData.get("purpose")),
    requestedDate: formData.get("requestedDate"),
    notes: optional(formData.get("notes")),
    autoDeductPayroll: optional(formData.get("autoDeductPayroll")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const orgId = access.user.organization.id;
  if (access.user.roleCode === "EMPLOYEE") {
    const self = await selfEmployeeId(access.user.id, orgId);
    if (!self || self !== parsed.data.employeeId) return { success: false, message: "You can only apply for your own loan." };
  }
  const id = optional(formData.get("id")) || crypto.randomUUID();
  try {
    const row = await createLoanApplication({
      id,
      organizationId: orgId,
      employeeId: parsed.data.employeeId,
      loanTypeId: parsed.data.loanTypeId,
      requestedAmount: asNumber(parsed.data.requestedAmount),
      tenureMonths: Math.round(asNumber(parsed.data.tenureMonths)),
      interestRate: parsed.data.interestRate ? asNumber(parsed.data.interestRate) : null,
      purpose: parsed.data.purpose || null,
      requestedDate: parsed.data.requestedDate,
      notes: parsed.data.notes || null,
      autoDeductPayroll: parsed.data.autoDeductPayroll === undefined ? true : asBool(parsed.data.autoDeductPayroll),
      actorId: access.user.id,
      submit: asBool(formData.get("submit")),
    });
    await writeAudit({
      organizationId: orgId,
      actorUserId: access.user.id,
      action: asBool(formData.get("submit")) ? "loans.submitted" : "loans.saved",
      entityType: "loan_application",
      entityId: row.id,
    });
    refresh();
    return { success: true, message: asBool(formData.get("submit")) ? "Application submitted." : "Application saved.", data: { applicationId: row.id } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save application." };
  }
}

export async function submitLoanApplicationAction(formData: FormData): Promise<void> {
  const access = await requireAccess("loans.create");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  if (!id) return;
  await submitLoanApplication(access.user.organization.id, id, access.user.id);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "loans.submitted",
    entityType: "loan_application",
    entityId: id,
  });
  refresh();
}

export async function decideLoanAction(formData: FormData): Promise<void> {
  const access = await requireAccess("loans.approve");
  if (access.error || !access.user) return;
  const parsed = loanDecisionSchema.safeParse({
    applicationId: formData.get("applicationId"),
    decision: formData.get("decision"),
    amount: optional(formData.get("amount")),
    tenureMonths: optional(formData.get("tenureMonths")),
    reason: optional(formData.get("reason")),
  });
  if (!parsed.success) return;
  await decideLoanApplication({
    organizationId: access.user.organization.id,
    applicationId: parsed.data.applicationId,
    decision: parsed.data.decision,
    amount: parsed.data.amount ? asNumber(parsed.data.amount) : null,
    tenureMonths: parsed.data.tenureMonths ? Math.round(asNumber(parsed.data.tenureMonths)) : null,
    reason: parsed.data.reason || null,
    actorId: access.user.id,
  });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: `loans.${parsed.data.decision.toLowerCase()}`,
    entityType: "loan_application",
    entityId: parsed.data.applicationId,
  });
  refresh();
}

export async function cancelLoanApplicationAction(formData: FormData): Promise<void> {
  const access = await requireAccess("loans.create");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  if (!id) return;
  await cancelLoanApplication(access.user.organization.id, id, access.user.id);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "loans.cancelled",
    entityType: "loan_application",
    entityId: id,
  });
  refresh();
}

export async function disburseLoanAction(formData: FormData): Promise<void> {
  const access = await requireAccess("loans.disburse");
  if (access.error || !access.user) return;
  const parsed = loanDisburseSchema.safeParse({
    applicationId: formData.get("applicationId"),
    startDate: formData.get("startDate"),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return;
  const account = await disburseLoan({
    organizationId: access.user.organization.id,
    applicationId: parsed.data.applicationId,
    startDate: parsed.data.startDate,
    notes: parsed.data.notes || null,
    actorId: access.user.id,
  });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "loans.disbursed",
    entityType: "loan_account",
    entityId: account.id,
  });
  refresh();
}

export async function recordLoanRepaymentAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("loans.repayment.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = loanRepaymentSchema.safeParse({
    accountId: formData.get("accountId"),
    paymentDate: formData.get("paymentDate"),
    amount: formData.get("amount"),
    paymentMethod: formData.get("paymentMethod") ?? "CASH",
    reference: optional(formData.get("reference")),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    const repayment = await recordLoanRepayment({
      organizationId: access.user.organization.id,
      accountId: parsed.data.accountId,
      paymentDate: parsed.data.paymentDate,
      amount: asNumber(parsed.data.amount),
      paymentMethod: parsed.data.paymentMethod,
      reference: parsed.data.reference || null,
      notes: parsed.data.notes || null,
      actorId: access.user.id,
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "loans.repayment",
      entityType: "loan_repayment",
      entityId: repayment.id,
    });
    refresh();
    return { success: true, message: "Repayment recorded." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not record repayment." };
  }
}

export async function adjustLoanAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const access = await requireAccess("loans.adjust");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = loanAdjustmentSchema.safeParse({
    accountId: formData.get("accountId"),
    scheduleId: optional(formData.get("scheduleId")),
    kind: formData.get("kind"),
    amount: optional(formData.get("amount")),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    await adjustLoan({
      organizationId: access.user.organization.id,
      accountId: parsed.data.accountId,
      scheduleId: parsed.data.scheduleId || null,
      kind: parsed.data.kind,
      amount: parsed.data.amount ? asNumber(parsed.data.amount) : null,
      reason: parsed.data.reason,
      actorId: access.user.id,
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: `loans.${parsed.data.kind.toLowerCase()}`,
      entityType: "loan_account",
      entityId: parsed.data.accountId,
    });
    refresh();
    return { success: true, message: "Adjustment saved." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not adjust loan." };
  }
}
