import { loadOrgCatalog } from "@/lib/org-data";
import { currentPeriod, periodLabel } from "@/lib/payroll/engine";
import {
  getPayrollRun,
  getPayslip,
  listComplianceFilings,
  listPayrollAdjustments,
  listPayrollApprovalHistory,
  listPayrollExceptions,
  listPayrollItems,
  listPayrollLines,
  listPayrollRuns,
  listPayslips,
  listStatutoryRules,
} from "@/lib/payroll/repository";
import { loadBank, loadOrganization, loadStatutory, netBeforeStatutory } from "@/lib/payroll/service";
import { listEmployment } from "@/lib/leave/repository";
import { lookupName } from "@/lib/utils";
import type { PayrollException, PayrollItemListItem, PayslipView } from "@/types";

export async function loadPayrollOverview(organizationId: string, timezone: string) {
  const [runs, catalog] = await Promise.all([listPayrollRuns(organizationId), loadOrgCatalog(organizationId)]);
  const latest = runs[0] ?? null;
  const items = latest ? await listPayrollItems(organizationId, latest.id) : [];
  return {
    period: currentPeriod(timezone),
    periodLabel: periodLabel(currentPeriod(timezone)),
    runs,
    latest,
    items,
    employees: catalog.employees,
    included: items.filter((item) => item.status === "INCLUDED"),
    held: items.filter((item) => item.status === "ON_HOLD"),
    excluded: items.filter((item) => item.status === "EXCLUDED" || item.status === "ERROR"),
  };
}

export function toPayrollItemList(input: {
  items: Awaited<ReturnType<typeof listPayrollItems>>;
  employees: { id: string; display_name: string; employee_code: string }[];
  departments: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  employment: { employee_id: string; department_id: string | null; branch_id: string | null }[];
}): PayrollItemListItem[] {
  return input.items
    .map((item) => {
      const employee = input.employees.find((row) => row.id === item.employee_id);
      const job = input.employment.find((row) => row.employee_id === item.employee_id);
      return {
        item,
        employeeName: employee?.display_name ?? "Unknown",
        employeeCode: employee?.employee_code ?? "—",
        departmentName: lookupName(input.departments, job?.department_id),
        branchName: lookupName(input.branches, job?.branch_id),
      } satisfies PayrollItemListItem;
    })
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export async function loadPayrollRunDetail(organizationId: string, runId: string) {
  const [run, items, lines, catalog, employment, payslips, filings, exceptions, history, adjustments] = await Promise.all([
    getPayrollRun(organizationId, runId),
    listPayrollItems(organizationId, runId),
    listPayrollLines(organizationId, runId),
    loadOrgCatalog(organizationId),
    listEmployment(organizationId),
    listPayslips(organizationId, runId),
    listComplianceFilings(organizationId, runId),
    listPayrollExceptions(organizationId, runId),
    listPayrollApprovalHistory(organizationId, runId),
    listPayrollAdjustments(organizationId, runId),
  ]);
  const listed = toPayrollItemList({
    items,
    employees: catalog.employees,
    departments: catalog.departments,
    branches: catalog.branches,
    employment,
  });
  return {
    run,
    items: listed,
    lines,
    payslips,
    filings,
    exceptions,
    history,
    adjustments,
    catalog,
    employment,
    summary: run
      ? {
          grossEarnings: run.total_earnings,
          reimbursements: run.total_reimbursements + run.total_claims,
          deductions: run.total_deductions,
          netBeforeStatutory: listed
            .filter((row) => row.item.status === "INCLUDED")
            .reduce((sum, row) => sum + netBeforeStatutory(row.item), 0),
          adjustments: adjustments.filter((item) => item.status === "POSTED").reduce((sum, item) => sum + item.amount, 0),
          totalCost: run.total_net + run.employer_contributions,
          errorEmployees: listed.filter((row) => exceptions.some((item) => item.employee_id === row.item.employee_id && item.severity === "ERROR" && item.status !== "RESOLVED")).length,
          warningEmployees: listed.filter((row) => exceptions.some((item) => item.employee_id === row.item.employee_id && item.severity === "WARNING" && item.status !== "RESOLVED")).length,
        }
      : null,
  };
}

export async function loadPayslipView(organizationId: string, payslipId: string): Promise<PayslipView | null> {
  const payslip = await getPayslip(organizationId, payslipId);
  if (!payslip) return null;
  const [run, items, lines, catalog, employment, org] = await Promise.all([
    getPayrollRun(organizationId, payslip.run_id),
    listPayrollItems(organizationId, payslip.run_id),
    listPayrollLines(organizationId, payslip.run_id, payslip.item_id),
    loadOrgCatalog(organizationId),
    listEmployment(organizationId),
    loadOrganization(organizationId),
  ]);
  if (!run) return null;
  const item = items.find((row) => row.id === payslip.item_id);
  if (!item) return null;
  const employee = catalog.employees.find((row) => row.id === payslip.employee_id);
  const job = employment.find((row) => row.employee_id === payslip.employee_id);
  const [bank, statutory] = await Promise.all([
    loadBank(organizationId, payslip.employee_id),
    loadStatutory(organizationId, payslip.employee_id),
  ]);
  return {
    payslip,
    run,
    item,
    lines,
    employeeName: employee?.display_name ?? "Unknown",
    employeeCode: employee?.employee_code ?? "—",
    departmentName: lookupName(catalog.departments, job?.department_id),
    designationName: lookupName(catalog.designations, job?.designation_id),
    branchName: lookupName(catalog.branches, job?.branch_id),
    bankName: bank?.bank_name ?? null,
    accountNumber: bank?.account_number ?? null,
    ifsc: bank?.ifsc ?? null,
    pan: statutory?.pan ?? null,
    uan: statutory?.uan ?? null,
    organizationName: org?.display_name || org?.name || "Organization",
  };
}

export async function loadPayslipViews(organizationId: string, employeeId?: string) {
  const [payslips, runs, items, catalog] = await Promise.all([
    listPayslips(organizationId),
    listPayrollRuns(organizationId),
    listPayrollItems(organizationId),
    loadOrgCatalog(organizationId),
  ]);
  const filtered = employeeId ? payslips.filter((item) => item.employee_id === employeeId) : payslips;
  return filtered
    .map((payslip) => {
      const run = runs.find((item) => item.id === payslip.run_id);
      const item = items.find((row) => row.id === payslip.item_id);
      const employee = catalog.employees.find((row) => row.id === payslip.employee_id);
      if (!run || !item) return null;
      return { payslip, run, item, employeeName: employee?.display_name ?? "Unknown", employeeCode: employee?.employee_code ?? "—" };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.run.period.localeCompare(a.run.period));
}

export async function loadComplianceOverview(organizationId: string) {
  const [runs, filings, rules] = await Promise.all([
    listPayrollRuns(organizationId),
    listComplianceFilings(organizationId),
    listStatutoryRules(organizationId),
  ]);
  const latest = runs.find((item) => item.status === "PROCESSED" || item.status === "PAID") ?? runs[0] ?? null;
  return {
    runs,
    latest,
    filings: latest ? filings.filter((item) => item.run_id === latest.id) : filings,
    allFilings: filings,
    rules,
  };
}

export function filterPayrollReview(input: {
  items: PayrollItemListItem[];
  exceptions: PayrollException[];
  branch?: string;
  department?: string;
  employee?: string;
  flag?: string;
  minNet?: number;
  maxNet?: number;
}) {
  return input.items.filter((row) => {
    if (input.branch && row.branchName !== input.branch) return false;
    if (input.department && row.departmentName !== input.department) return false;
    if (input.employee) {
      const q = input.employee.toLowerCase();
      if (!row.employeeName.toLowerCase().includes(q) && !row.employeeCode.toLowerCase().includes(q)) return false;
    }
    if (input.flag === "error") {
      const has = input.exceptions.some((item) => item.employee_id === row.item.employee_id && item.severity === "ERROR" && item.status !== "RESOLVED");
      if (!has) return false;
    }
    if (input.flag === "warning") {
      const has = input.exceptions.some((item) => item.employee_id === row.item.employee_id && item.severity === "WARNING" && item.status !== "RESOLVED");
      if (!has) return false;
    }
    if (input.minNet != null && row.item.net_pay < input.minNet) return false;
    if (input.maxNet != null && row.item.net_pay > input.maxNet) return false;
    return true;
  });
}

export async function loadPayrollExceptions(organizationId: string, runId?: string) {
  const [runs, exceptions, catalog, employment] = await Promise.all([
    listPayrollRuns(organizationId),
    listPayrollExceptions(organizationId, runId),
    loadOrgCatalog(organizationId),
    listEmployment(organizationId),
  ]);
  return exceptions
    .map((item) => {
      const run = runs.find((row) => row.id === item.run_id);
      const employee = catalog.employees.find((row) => row.id === item.employee_id);
      const job = employment.find((row) => row.employee_id === item.employee_id);
      return {
        exception: item,
        run,
        employeeName: employee?.display_name ?? "—",
        employeeCode: employee?.employee_code ?? "—",
        departmentName: lookupName(catalog.departments, job?.department_id),
      };
    })
    .sort((a, b) => b.exception.created_at.localeCompare(a.exception.created_at));
}

export async function loadEmployeePayrollReview(organizationId: string, runId: string, employeeId: string) {
  const detail = await loadPayrollRunDetail(organizationId, runId);
  if (!detail.run) return null;
  const row = detail.items.find((item) => item.item.employee_id === employeeId);
  if (!row) return null;
  const lines = detail.lines.filter((item) => item.item_id === row.item.id);
  const exceptions = detail.exceptions.filter((item) => item.employee_id === employeeId);
  const adjustments = detail.adjustments.filter((item) => item.employee_id === employeeId);
  return {
    run: detail.run,
    row,
    lines,
    exceptions,
    adjustments,
    sources: {
      salary: row.item.assignment_id,
      attendance: "attendance_days",
      leave: "leave_requests / attendance_days",
      claims: lines.filter((item) => item.kind === "CLAIM").map((item) => item.reference_id),
      loans: lines.filter((item) => item.kind === "LOAN").map((item) => item.notes),
    },
    netBeforeStatutory: netBeforeStatutory(row.item),
  };
}

export { periodLabel, netBeforeStatutory };
