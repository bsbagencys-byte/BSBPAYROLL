"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors, optional } from "@/lib/form-errors";
import {
  COMPENSATION_ENTRY_STATUSES,
  type CompensationEntryStatus,
  type PermissionCode,
  type SalaryChangeType,
} from "@/lib/constants";
import {
  formulaPreviewSchema,
  reimbursementSchema,
  salaryAssignmentSchema,
  salaryComponentSchema,
  salaryRevisionSchema,
  salaryStructureSchema,
  variableEarningSchema,
} from "@/lib/validations/salary";
import { asBool, asNumber } from "@/lib/salary/engine";
import { previewFormula, validateFormula } from "@/lib/salary/formula";
import {
  assignSalary,
  decideCompensationEntry,
  decideRevision,
  saveComponentRow,
  saveReimbursementRow,
  saveRevisionRow,
  saveStructureRow,
  saveVariableRow,
} from "@/lib/salary/service";
import {
  listAssignments,
  listSalaryComponents,
  listSalaryStructures,
  updateSalaryComponent,
  updateSalaryStructure,
} from "@/lib/salary/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import type {
  ActionResult,
  SalaryComponent,
  SalaryRevision,
  SalaryStructure,
  SalaryStructureItem,
} from "@/types";

function stamp() {
  return new Date().toISOString();
}

function refresh() {
  revalidatePath("/salary");
  revalidatePath("/salary/components");
  revalidatePath("/salary/structures");
  revalidatePath("/salary/employee");
  revalidatePath("/salary/revisions");
  revalidatePath("/salary/history");
  revalidatePath("/salary/variable");
  revalidatePath("/salary/reimbursements");
  revalidatePath("/salary/reports");
  revalidatePath("/salary/settings");
  revalidatePath("/employees");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

async function requireSalary(permission: PermissionCode) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." as const, user: null };
  if (!hasPermission(user, permission)) return { error: "You do not have permission for this action." as const, user: null };
  return { error: null, user };
}

export async function previewFormulaAction(
  _prev: ActionResult<{ value: number }> | undefined,
  formData: FormData
): Promise<ActionResult<{ value: number }>> {
  const access = await requireSalary("salary.view");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = formulaPreviewSchema.safeParse({ formula: formData.get("formula") });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const components = await listSalaryComponents(access.user.organization.id);
  const result = previewFormula(parsed.data.formula, {}, components.map((item) => item.code));
  if (!result.ok) return { success: false, errors: { formula: [result.error] }, message: result.error };
  return { success: true, message: `Preview = ${result.value}`, data: { value: result.value ?? 0 } };
}

export async function saveSalaryComponentAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireSalary("salary.component.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = salaryComponentSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    componentType: formData.get("componentType"),
    category: formData.get("category"),
    calculationMethod: formData.get("calculationMethod"),
    formula: optional(formData.get("formula")),
    baseComponentId: optional(formData.get("baseComponentId")),
    fixedAmount: optional(formData.get("fixedAmount")),
    percentage: optional(formData.get("percentage")),
    frequency: formData.get("frequency"),
    taxable: optional(formData.get("taxable")),
    includeInCtc: optional(formData.get("includeInCtc")),
    includeInGross: optional(formData.get("includeInGross")),
    variable: optional(formData.get("variable")),
    sortOrder: optional(formData.get("sortOrder")),
    status: optional(formData.get("status")) || "ACTIVE",
    effectiveFrom: optional(formData.get("effectiveFrom")),
    effectiveTo: optional(formData.get("effectiveTo")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };

  const id = optional(formData.get("id"));
  const orgId = access.user.organization.id;
  const existing = await listSalaryComponents(orgId);
  const code = parsed.data.code.toUpperCase();
  if (existing.some((item) => item.code.toUpperCase() === code && item.id !== id)) {
    return { success: false, errors: { code: ["A component with this code already exists."] } };
  }
  if (parsed.data.calculationMethod === "FORMULA" && parsed.data.formula) {
    const check = validateFormula(parsed.data.formula, existing.map((item) => item.code));
    if (!check.ok) return { success: false, errors: { formula: [check.error] }, message: check.error };
  }

  const row: SalaryComponent = {
    id: id || crypto.randomUUID(),
    organization_id: orgId,
    name: parsed.data.name,
    code,
    component_type: parsed.data.componentType,
    category: parsed.data.category,
    calculation_method: parsed.data.calculationMethod,
    formula: parsed.data.formula || null,
    base_component_id: parsed.data.baseComponentId || null,
    fixed_amount: parsed.data.fixedAmount ? asNumber(parsed.data.fixedAmount) : null,
    percentage: parsed.data.percentage ? asNumber(parsed.data.percentage) : null,
    frequency: parsed.data.frequency,
    taxable: asBool(parsed.data.taxable, true),
    include_in_ctc: asBool(parsed.data.includeInCtc, true),
    include_in_gross: asBool(parsed.data.includeInGross, true),
    variable: asBool(parsed.data.variable),
    sort_order: parsed.data.sortOrder ? asNumber(parsed.data.sortOrder) : 10,
    status: parsed.data.status ?? "ACTIVE",
    effective_from: parsed.data.effectiveFrom || null,
    effective_to: parsed.data.effectiveTo || null,
    created_by: access.user.id,
    updated_by: access.user.id,
    created_at: stamp(),
    updated_at: stamp(),
  };

  try {
    await saveComponentRow(row, existing);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save component." };
  }
  await writeAudit({
    organizationId: orgId,
    actorUserId: access.user.id,
    action: id ? "salary.component.update" : "salary.component.create",
    entityType: "salary_component",
    entityId: row.id,
    metadata: { code },
  });
  refresh();
  return { success: true, message: id ? "Component updated." : "Component created." };
}

export async function toggleSalaryComponentAction(formData: FormData): Promise<void> {
  const access = await requireSalary("salary.component.manage");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  const status = optional(formData.get("status")) === "ACTIVE" ? "DISABLED" : "ACTIVE";
  if (!id) return;
  await updateSalaryComponent(id, { status, updated_by: access.user.id });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: status === "ACTIVE" ? "salary.component.activate" : "salary.component.deactivate",
    entityType: "salary_component",
    entityId: id,
  });
  refresh();
}

export async function saveSalaryStructureAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireSalary("salary.structure.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = salaryStructureSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    description: optional(formData.get("description")),
    ctcAmount: optional(formData.get("ctcAmount")),
    status: optional(formData.get("status")) || "ACTIVE",
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: optional(formData.get("effectiveTo")),
    items: optional(formData.get("items")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };

  const id = optional(formData.get("id")) || crypto.randomUUID();
  const orgId = access.user.organization.id;
  const existing = await listSalaryStructures(orgId);
  const code = parsed.data.code.toUpperCase();
  if (existing.some((item) => item.code.toUpperCase() === code && item.id !== id)) {
    return { success: false, errors: { code: ["A structure with this code already exists."] } };
  }
  const components = await listSalaryComponents(orgId);
  const selected = formData.getAll("componentId").map(String);
  const items: Omit<SalaryStructureItem, "id" | "created_at">[] = [];
  for (const componentId of selected) {
    const component = components.find((item) => item.id === componentId);
    if (!component) continue;
    const method = String(formData.get(`method_${componentId}`) || component.calculation_method);
    const formula = optional(formData.get(`formula_${componentId}`)) || component.formula;
    if (method === "FORMULA" && formula) {
      const check = validateFormula(formula, components.map((item) => item.code));
      if (!check.ok) return { success: false, errors: { items: [check.error] }, message: check.error };
    }
    items.push({
      organization_id: orgId,
      structure_id: id,
      component_id: componentId,
      calculation_method: method as SalaryStructureItem["calculation_method"],
      formula,
      base_component_id: optional(formData.get(`base_${componentId}`)) || component.base_component_id,
      fixed_amount: optional(formData.get(`fixed_${componentId}`)) ? asNumber(formData.get(`fixed_${componentId}`)) : component.fixed_amount,
      percentage: optional(formData.get(`pct_${componentId}`)) ? asNumber(formData.get(`pct_${componentId}`)) : component.percentage,
      include_in_ctc: asBool(optional(formData.get(`ctc_${componentId}`)), component.include_in_ctc),
      include_in_gross: asBool(optional(formData.get(`gross_${componentId}`)), component.include_in_gross),
      sort_order: asNumber(formData.get(`order_${componentId}`), component.sort_order),
    });
  }
  if (!items.length) return { success: false, errors: { items: ["Select at least one component."] }, message: "Select at least one component." };

  const structure: SalaryStructure = {
    id,
    organization_id: orgId,
    name: parsed.data.name,
    code,
    description: parsed.data.description || null,
    ctc_amount: parsed.data.ctcAmount ? asNumber(parsed.data.ctcAmount) : null,
    status: parsed.data.status ?? "ACTIVE",
    effective_from: parsed.data.effectiveFrom,
    effective_to: parsed.data.effectiveTo || null,
    created_by: access.user.id,
    updated_by: access.user.id,
    created_at: stamp(),
    updated_at: stamp(),
  };

  try {
    await saveStructureRow(structure, items, existing);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save structure." };
  }
  await writeAudit({
    organizationId: orgId,
    actorUserId: access.user.id,
    action: optional(formData.get("id")) ? "salary.structure.update" : "salary.structure.create",
    entityType: "salary_structure",
    entityId: id,
    metadata: { code },
  });
  refresh();
  return { success: true, message: optional(formData.get("id")) ? "Structure updated." : "Structure created." };
}

export async function toggleSalaryStructureAction(formData: FormData): Promise<void> {
  const access = await requireSalary("salary.structure.manage");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  const status = optional(formData.get("status")) === "ACTIVE" ? "DISABLED" : "ACTIVE";
  if (!id) return;
  await updateSalaryStructure(id, { status, updated_by: access.user.id });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: status === "ACTIVE" ? "salary.structure.activate" : "salary.structure.deactivate",
    entityType: "salary_structure",
    entityId: id,
  });
  refresh();
}

export async function assignSalaryAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireSalary("salary.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = salaryAssignmentSchema.safeParse({
    employeeId: formData.get("employeeId"),
    structureId: formData.get("structureId"),
    ctcAmount: formData.get("ctcAmount"),
    effectiveFrom: formData.get("effectiveFrom"),
    notes: optional(formData.get("notes")),
    changeType: optional(formData.get("changeType")) || "NEW_JOINER",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  try {
    const assignment = await assignSalary({
      organizationId: access.user.organization.id,
      employeeId: parsed.data.employeeId,
      structureId: parsed.data.structureId,
      ctc: asNumber(parsed.data.ctcAmount),
      effectiveFrom: parsed.data.effectiveFrom,
      notes: parsed.data.notes || null,
      actorId: access.user.id,
      changeType: (parsed.data.changeType as SalaryChangeType) ?? "NEW_JOINER",
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "salary.assigned",
      entityType: "employee_salary_assignment",
      entityId: assignment.id,
      metadata: { employeeId: parsed.data.employeeId, ctc: parsed.data.ctcAmount },
    });
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not assign salary." };
  }
  refresh();
  return { success: true, message: "Salary assigned." };
}

export async function saveSalaryRevisionAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireSalary("salary.revision.create");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = salaryRevisionSchema.safeParse({
    employeeId: formData.get("employeeId"),
    newStructureId: formData.get("newStructureId"),
    newCtc: formData.get("newCtc"),
    effectiveFrom: formData.get("effectiveFrom"),
    reason: formData.get("reason"),
    notes: optional(formData.get("notes")),
    status: optional(formData.get("status")) || "PENDING",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const assignments = await listAssignments(access.user.organization.id);
  const current = assignments.find((item) => item.employee_id === parsed.data.employeeId && item.status === "ACTIVE") ?? null;
  const id = optional(formData.get("id")) || crypto.randomUUID();
  const row: SalaryRevision = {
    id,
    organization_id: access.user.organization.id,
    employee_id: parsed.data.employeeId,
    previous_assignment_id: current?.id ?? null,
    previous_structure_id: current?.structure_id ?? null,
    new_structure_id: parsed.data.newStructureId,
    previous_ctc: current?.ctc_amount ?? null,
    new_ctc: asNumber(parsed.data.newCtc),
    effective_from: parsed.data.effectiveFrom,
    reason: parsed.data.reason,
    notes: parsed.data.notes || null,
    status: parsed.data.status ?? "PENDING",
    decided_at: null,
    applied_at: null,
    created_by: access.user.id,
    decided_by: null,
    created_at: stamp(),
    updated_at: stamp(),
  };
  await saveRevisionRow(row);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "salary.revision.create",
    entityType: "salary_revision",
    entityId: row.id,
    metadata: { employeeId: row.employee_id, newCtc: row.new_ctc },
  });
  refresh();
  return { success: true, message: "Revision submitted." };
}

export async function decideSalaryRevisionAction(formData: FormData): Promise<void> {
  const action = optional(formData.get("decision")) as "APPROVED" | "REJECTED";
  const permission = action === "APPROVED" || action === "REJECTED" ? "salary.revision.approve" : "salary.revision.create";
  const access = await requireSalary(permission);
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  if (!id || (action !== "APPROVED" && action !== "REJECTED")) return;
  await decideRevision({
    organizationId: access.user.organization.id,
    revisionId: id,
    action,
    actorId: access.user.id,
  });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: action === "APPROVED" ? "salary.revision.approved" : "salary.revision.rejected",
    entityType: "salary_revision",
    entityId: id,
  });
  refresh();
}

export async function saveVariableEarningAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireSalary("salary.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = variableEarningSchema.safeParse({
    employeeId: formData.get("employeeId"),
    componentId: formData.get("componentId"),
    amount: formData.get("amount"),
    quantity: optional(formData.get("quantity")),
    rate: optional(formData.get("rate")),
    periodFrom: formData.get("periodFrom"),
    periodTo: formData.get("periodTo"),
    source: optional(formData.get("source")) || "MANUAL",
    reference: optional(formData.get("reference")),
    notes: optional(formData.get("notes")),
    status: optional(formData.get("status")) || "PENDING",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const catalog = await loadOrgCatalog(access.user.organization.id);
  if (access.user.roleCode === "EMPLOYEE") {
    const self = catalog.employees.find((item) => item.user_id === access.user.id);
    if (!self || self.id !== parsed.data.employeeId) return { success: false, message: "You can only record your own entries." };
  }
  const id = optional(formData.get("id")) || crypto.randomUUID();
  await saveVariableRow({
    id,
    organization_id: access.user.organization.id,
    employee_id: parsed.data.employeeId,
    component_id: parsed.data.componentId,
    amount: asNumber(parsed.data.amount),
    quantity: parsed.data.quantity ? asNumber(parsed.data.quantity) : null,
    rate: parsed.data.rate ? asNumber(parsed.data.rate) : null,
    period_from: parsed.data.periodFrom,
    period_to: parsed.data.periodTo,
    source: parsed.data.source || "MANUAL",
    reference: parsed.data.reference || null,
    notes: parsed.data.notes || null,
    status: parsed.data.status ?? "PENDING",
    created_by: access.user.id,
    updated_by: access.user.id,
    created_at: stamp(),
    updated_at: stamp(),
  });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "salary.variable.save",
    entityType: "variable_earning",
    entityId: id,
  });
  refresh();
  return { success: true, message: "Variable earning saved." };
}

export async function saveReimbursementAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireSalary("salary.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = reimbursementSchema.safeParse({
    employeeId: formData.get("employeeId"),
    componentId: formData.get("componentId"),
    entryDate: formData.get("entryDate"),
    amount: formData.get("amount"),
    description: optional(formData.get("description")),
    reference: optional(formData.get("reference")),
    includeInPayroll: optional(formData.get("includeInPayroll")),
    status: optional(formData.get("status")) || "PENDING",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const id = optional(formData.get("id")) || crypto.randomUUID();
  await saveReimbursementRow({
    id,
    organization_id: access.user.organization.id,
    employee_id: parsed.data.employeeId,
    component_id: parsed.data.componentId,
    entry_date: parsed.data.entryDate,
    amount: asNumber(parsed.data.amount),
    description: parsed.data.description || null,
    reference: parsed.data.reference || null,
    include_in_payroll: asBool(parsed.data.includeInPayroll, true),
    status: parsed.data.status ?? "PENDING",
    created_by: access.user.id,
    updated_by: access.user.id,
    created_at: stamp(),
    updated_at: stamp(),
  });
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "salary.reimbursement.save",
    entityType: "reimbursement_entry",
    entityId: id,
  });
  refresh();
  return { success: true, message: "Reimbursement saved." };
}

export async function decideCompensationAction(formData: FormData): Promise<void> {
  const access = await requireSalary("salary.manage");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  const kind = optional(formData.get("kind")) as "variable" | "reimbursement";
  const status = optional(formData.get("status")) as CompensationEntryStatus;
  if (!id || (kind !== "variable" && kind !== "reimbursement") || !COMPENSATION_ENTRY_STATUSES.includes(status)) {
    return;
  }
  await decideCompensationEntry(kind, id, status);
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: kind === "variable" ? "salary.variable.decide" : "salary.reimbursement.decide",
    entityType: kind === "variable" ? "variable_earning" : "reimbursement_entry",
    entityId: id,
    metadata: { status },
  });
  refresh();
}
