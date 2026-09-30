import { todayInZone } from "@/lib/leave/dates";
import { assignmentForDate, calculateStructure } from "@/lib/salary/engine";
import { getEmployeeSalaryForDate } from "@/lib/salary/service";
import {
  listAssignments,
  listReimbursements,
  listRevisions,
  listSalaryComponents,
  listSalaryHistory,
  listSalaryStructures,
  listStructureItems,
  listVariableEarnings,
} from "@/lib/salary/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import type { EmployeeSalarySnapshot, SalaryHistory, SalaryRevision, VariableEarning, ReimbursementEntry } from "@/types";

export async function loadSalaryOverview(organizationId: string, timezone: string) {
  const today = todayInZone(timezone);
  const [catalog, assignments, structures, revisions, history, components] = await Promise.all([
    loadOrgCatalog(organizationId),
    listAssignments(organizationId),
    listSalaryStructures(organizationId),
    listRevisions(organizationId),
    listSalaryHistory(organizationId),
    listSalaryComponents(organizationId),
  ]);
  const withSalary = catalog.employees.filter((employee) => assignmentForDate(assignments, employee.id, today));
  const withoutSalary = catalog.employees.filter((employee) => !assignmentForDate(assignments, employee.id, today));
  const pendingRevisions = revisions.filter((item) => item.status === "PENDING" || item.status === "DRAFT");
  return {
    today,
    withSalary,
    withoutSalary,
    pendingRevisions,
    recentRevisions: revisions.slice(0, 8),
    recentHistory: history.slice(0, 8),
    activeStructures: structures.filter((item) => item.status === "ACTIVE"),
    componentCount: components.filter((item) => item.status === "ACTIVE").length,
    employees: catalog.employees,
    structures,
  };
}

export async function loadEmployeeCompensation(organizationId: string, employeeId: string, timezone: string) {
  const today = todayInZone(timezone);
  const [snapshot, assignments, revisions, history, variables, reimbursements, structures] = await Promise.all([
    getEmployeeSalaryForDate(organizationId, employeeId, today),
    listAssignments(organizationId),
    listRevisions(organizationId),
    listSalaryHistory(organizationId),
    listVariableEarnings(organizationId),
    listReimbursements(organizationId),
    listSalaryStructures(organizationId),
  ]);
  return {
    today,
    snapshot,
    assignments: assignments.filter((item) => item.employee_id === employeeId),
    revisions: revisions.filter((item) => item.employee_id === employeeId),
    history: history.filter((item) => item.employee_id === employeeId),
    variables: variables.filter((item) => item.employee_id === employeeId),
    reimbursements: reimbursements.filter((item) => item.employee_id === employeeId),
    structures,
  };
}

export async function loadEmployeeSnapshots(organizationId: string, timezone: string) {
  const today = todayInZone(timezone);
  const catalog = await loadOrgCatalog(organizationId);
  const rows: Array<{
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    departmentName: string | null;
    snapshot: EmployeeSalarySnapshot | null;
  }> = [];
  for (const employee of catalog.employees) {
    const snapshot = await getEmployeeSalaryForDate(organizationId, employee.id, today);
    rows.push({
      employeeId: employee.id,
      employeeName: employee.display_name,
      employeeCode: employee.employee_code,
      departmentName: null,
      snapshot,
    });
  }
  return rows;
}

export async function previewStructureCtc(organizationId: string, structureId: string, ctc: number) {
  const [structures, items, components] = await Promise.all([
    listSalaryStructures(organizationId),
    listStructureItems(organizationId, structureId),
    listSalaryComponents(organizationId),
  ]);
  const structure = structures.find((item) => item.id === structureId);
  if (!structure) return { error: "Structure not found.", snapshot: null };
  const { snapshot, error } = calculateStructure(structure, items, components, ctc);
  return { error: error ?? null, snapshot };
}

export type { SalaryHistory, SalaryRevision, VariableEarning, ReimbursementEntry };
