import { addDays } from "@/lib/leave/dates";
import { assignmentForDate, calculateStructure, overlappingAssignment, roundMoney } from "@/lib/salary/engine";
import { previewFormula, validateFormula } from "@/lib/salary/formula";
import {
  insertAssignment,
  insertReimbursement,
  insertRevision,
  insertSalaryComponent,
  insertSalaryHistory,
  insertSalaryStructure,
  insertVariableEarning,
  listAssignments,
  listReimbursements,
  listRevisions,
  listSalaryComponents,
  listSalaryHistory,
  listSalaryStructures,
  listStructureItems,
  listVariableEarnings,
  replaceStructureItems,
  updateAssignment,
  updateReimbursement,
  updateRevision,
  updateSalaryComponent,
  updateSalaryStructure,
  updateVariableEarning,
} from "@/lib/salary/repository";
import { listAttendanceDays } from "@/lib/leave/attendance";
import { listRequests } from "@/lib/leave/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import type {
  AttendanceSalaryInputs,
  CompensationEntryStatus,
  EmployeeSalaryAssignment,
  EmployeeSalarySnapshot,
  ReimbursementEntry,
  SalaryChangeType,
  SalaryComponent,
  SalaryHistory,
  SalaryRevision,
  SalaryStructure,
  SalaryStructureItem,
  VariableEarning,
} from "@/types";

function stamp() {
  return new Date().toISOString();
}

export async function getEmployeeSalaryForDate(
  organizationId: string,
  employeeId: string,
  date: string
): Promise<EmployeeSalarySnapshot | null> {
  const [assignments, structures, items, components] = await Promise.all([
    listAssignments(organizationId),
    listSalaryStructures(organizationId),
    listStructureItems(organizationId),
    listSalaryComponents(organizationId),
  ]);
  const assignment = assignmentForDate(assignments, employeeId, date);
  if (!assignment) return null;
  const structure = structures.find((item) => item.id === assignment.structure_id);
  if (!structure) return null;
  const structureItems = items.filter((item) => item.structure_id === structure.id);
  const extras = await loadAttendanceInputs(organizationId, employeeId, date);
  const { snapshot, error } = calculateStructure(structure, structureItems, components, assignment.ctc_amount, extras);
  if (error) return null;
  return {
    ...snapshot,
    employeeId,
    assignmentId: assignment.id,
    effectiveFrom: assignment.effective_from,
    effectiveTo: assignment.effective_to,
    ctc: assignment.ctc_amount,
    gross: assignment.gross_amount || snapshot.gross,
  };
}

export async function loadAttendanceInputs(
  organizationId: string,
  employeeId: string,
  date: string
): Promise<AttendanceSalaryInputs> {
  const month = date.slice(0, 7);
  const from = `${month}-01`;
  const to = date;
  const [days, requests] = await Promise.all([
    listAttendanceDays(organizationId, from, to),
    listRequests(organizationId),
  ]);
  const mine = days.filter((item) => item.employee_id === employeeId);
  const workingDays = mine.filter((item) => item.status !== "WEEKLY_OFF" && item.status !== "HOLIDAY").length;
  const presentDays = mine.filter((item) => item.status === "PRESENT").length;
  const unpaidLeaveDays = mine.filter((item) => item.status === "UNPAID_LEAVE").length;
  const paidLeaveDays = mine.filter((item) => item.status === "PAID_LEAVE" || item.status === "HALF_DAY_LEAVE" || item.status === "COMP_OFF").length;
  const approvedLop = requests.filter(
    (item) =>
      item.employee_id === employeeId &&
      item.status === "APPROVED" &&
      item.from_date <= to &&
      item.to_date >= from
  ).length;
  return {
    workingDays,
    presentDays,
    unpaidLeaveDays: unpaidLeaveDays || approvedLop,
    paidLeaveDays,
    lateCount: 0,
    otMinutes: 0,
  };
}

export function previewComponentFormula(formula: string, codes: string[]) {
  return previewFormula(formula, {}, codes);
}

export async function saveComponentRow(row: SalaryComponent, existing: SalaryComponent[]) {
  if (row.calculation_method === "FORMULA" && row.formula) {
    const check = validateFormula(row.formula, existing.map((item) => item.code));
    if (!check.ok) throw new Error(check.error);
  }
  const found = existing.find((item) => item.id === row.id);
  if (found) return updateSalaryComponent(row.id, row);
  return insertSalaryComponent(row);
}

export async function saveStructureRow(
  structure: SalaryStructure,
  items: Omit<SalaryStructureItem, "id" | "created_at">[],
  existing: SalaryStructure[]
) {
  const found = existing.find((item) => item.id === structure.id);
  const saved = found ? await updateSalaryStructure(structure.id, structure) : await insertSalaryStructure(structure);
  const rows: SalaryStructureItem[] = items.map((item, index) => ({
    ...item,
    id: crypto.randomUUID(),
    structure_id: structure.id,
    sort_order: item.sort_order || index + 1,
    created_at: stamp(),
  }));
  await replaceStructureItems(structure.organization_id, structure.id, rows);
  return saved;
}

export async function assignSalary(input: {
  organizationId: string;
  employeeId: string;
  structureId: string;
  ctc: number;
  effectiveFrom: string;
  notes?: string | null;
  actorId: string | null;
  changeType?: SalaryChangeType;
}) {
  const [assignments, structures, items, components] = await Promise.all([
    listAssignments(input.organizationId),
    listSalaryStructures(input.organizationId),
    listStructureItems(input.organizationId),
    listSalaryComponents(input.organizationId),
  ]);
  const overlap = overlappingAssignment(assignments, input.employeeId, input.effectiveFrom, null);
  if (overlap) {
    if (overlap.effective_from < input.effectiveFrom) {
      await updateAssignment(overlap.id, { effective_to: addDays(input.effectiveFrom, -1), status: "CLOSED" });
    } else {
      throw new Error("This employee already has an active salary covering that date.");
    }
  }
  const structure = structures.find((item) => item.id === input.structureId);
  if (!structure) throw new Error("Salary structure not found.");
  const structureItems = items.filter((item) => item.structure_id === structure.id);
  const { snapshot, error } = calculateStructure(structure, structureItems, components, input.ctc);
  if (error) throw new Error(error);
  const current = assignments.find(
    (item) => item.employee_id === input.employeeId && item.status === "CLOSED" && item.effective_to === addDays(input.effectiveFrom, -1)
  ) ?? overlap;
  const assignment: EmployeeSalaryAssignment = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    employee_id: input.employeeId,
    structure_id: input.structureId,
    ctc_amount: roundMoney(input.ctc),
    gross_amount: snapshot.gross,
    effective_from: input.effectiveFrom,
    effective_to: null,
    status: "ACTIVE",
    notes: input.notes ?? null,
    created_by: input.actorId,
    updated_by: input.actorId,
    created_at: stamp(),
    updated_at: stamp(),
  };
  await insertAssignment(assignment);
  await insertSalaryHistory(historyRow({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    assignmentId: assignment.id,
    changeType: input.changeType ?? "NEW_JOINER",
    oldValue: current ? String(current.ctc_amount) : null,
    newValue: String(assignment.ctc_amount),
    reason: input.notes ?? "Salary assigned",
    approvedBy: input.actorId,
    effectiveFrom: input.effectiveFrom,
    createdBy: input.actorId,
  }));
  return assignment;
}

export async function saveRevisionRow(row: SalaryRevision) {
  const existing = await listRevisions(row.organization_id);
  const found = existing.find((item) => item.id === row.id);
  if (found) return updateRevision(row.id, row);
  return insertRevision(row);
}

export async function decideRevision(input: {
  organizationId: string;
  revisionId: string;
  action: "APPROVED" | "REJECTED";
  actorId: string | null;
}) {
  const revisions = await listRevisions(input.organizationId);
  const revision = revisions.find((item) => item.id === input.revisionId);
  if (!revision) throw new Error("Revision not found.");
  if (revision.status !== "PENDING" && revision.status !== "DRAFT") {
    throw new Error("Only pending revisions can be decided.");
  }
  if (input.action === "REJECTED") {
    await updateRevision(revision.id, { status: "REJECTED", decided_at: stamp(), decided_by: input.actorId });
    return;
  }
  await assignSalary({
    organizationId: input.organizationId,
    employeeId: revision.employee_id,
    structureId: revision.new_structure_id,
    ctc: revision.new_ctc,
    effectiveFrom: revision.effective_from,
    notes: revision.notes,
    actorId: input.actorId,
    changeType: revision.reason,
  });
  await updateRevision(revision.id, {
    status: "APPLIED",
    decided_at: stamp(),
    applied_at: stamp(),
    decided_by: input.actorId,
  });
}

export async function saveVariableRow(row: VariableEarning) {
  const existing = await listVariableEarnings(row.organization_id);
  const found = existing.find((item) => item.id === row.id);
  if (found) return updateVariableEarning(row.id, row);
  return insertVariableEarning(row);
}

export async function saveReimbursementRow(row: ReimbursementEntry) {
  const existing = await listReimbursements(row.organization_id);
  const found = existing.find((item) => item.id === row.id);
  if (found) return updateReimbursement(row.id, row);
  return insertReimbursement(row);
}

export async function decideCompensationEntry(
  kind: "variable" | "reimbursement",
  id: string,
  status: CompensationEntryStatus
) {
  if (kind === "variable") return updateVariableEarning(id, { status });
  return updateReimbursement(id, { status });
}

function historyRow(input: {
  organizationId: string;
  employeeId: string;
  assignmentId?: string | null;
  revisionId?: string | null;
  changeType: SalaryChangeType;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  approvedBy: string | null;
  effectiveFrom: string;
  createdBy: string | null;
}): SalaryHistory {
  return {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    employee_id: input.employeeId,
    assignment_id: input.assignmentId ?? null,
    revision_id: input.revisionId ?? null,
    change_type: input.changeType,
    old_value: input.oldValue,
    new_value: input.newValue,
    reason: input.reason,
    approved_by: input.approvedBy,
    effective_from: input.effectiveFrom,
    applied_at: stamp(),
    created_by: input.createdBy,
    created_at: stamp(),
  };
}

export async function loadSalaryCatalog(organizationId: string) {
  const [components, structures, items, catalog] = await Promise.all([
    listSalaryComponents(organizationId),
    listSalaryStructures(organizationId),
    listStructureItems(organizationId),
    loadOrgCatalog(organizationId),
  ]);
  return { components, structures, items, ...catalog };
}

export { listSalaryHistory };
