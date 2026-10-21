import { loadOrgCatalog } from "@/lib/org-data";
import { listEmployment } from "@/lib/leave/repository";
import { listAttendanceDays } from "@/lib/leave/attendance";
import { listBalances, listRequests } from "@/lib/leave/repository";
import { listPayrollRuns } from "@/lib/payroll/repository";
import { loadPayslipViews } from "@/lib/payroll/query";
import { lookupName } from "@/lib/utils";

export async function apiEmployees(organizationId: string) {
  const [catalog, employment] = await Promise.all([loadOrgCatalog(organizationId), listEmployment(organizationId)]);
  return catalog.employees.map((employee) => {
    const job = employment.find((item) => item.employee_id === employee.id);
    return {
      id: employee.id,
      employee_code: employee.employee_code,
      display_name: employee.display_name,
      status: employee.status,
      department: lookupName(catalog.departments, job?.department_id),
      designation: lookupName(catalog.designations, job?.designation_id),
      branch: lookupName(catalog.branches, job?.branch_id),
      joining_date: job?.joining_date ?? null,
    };
  });
}

export async function apiOrganization(organizationId: string) {
  const catalog = await loadOrgCatalog(organizationId);
  return {
    branches: catalog.branches.map((item) => ({ id: item.id, name: item.name, code: item.code, status: item.status })),
    departments: catalog.departments.map((item) => ({ id: item.id, name: item.name, code: item.code, status: item.status })),
    designations: catalog.designations.map((item) => ({ id: item.id, name: item.name, code: item.code, status: item.status })),
    locations: catalog.locations.map((item) => ({ id: item.id, name: item.name, status: item.status })),
  };
}

export async function apiAttendanceSummaries(organizationId: string, from?: string, to?: string) {
  const start = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const end = to || new Date().toISOString().slice(0, 10);
  const [days, catalog] = await Promise.all([listAttendanceDays(organizationId, start, end), loadOrgCatalog(organizationId)]);
  const byEmployee = new Map<string, { present: number; leave: number; unmarked: number }>();
  for (const day of days) {
    const row = byEmployee.get(day.employee_id) ?? { present: 0, leave: 0, unmarked: 0 };
    if (day.status === "PRESENT") row.present += 1;
    else if (String(day.status).includes("LEAVE") || day.status === "COMP_OFF") row.leave += 1;
    byEmployee.set(day.employee_id, row);
  }
  return catalog.employees.map((employee) => ({
    employee_id: employee.id,
    employee_code: employee.employee_code,
    display_name: employee.display_name,
    from: start,
    to: end,
    present_days: byEmployee.get(employee.id)?.present ?? 0,
    leave_days: byEmployee.get(employee.id)?.leave ?? 0,
    note: "Punch-based present/absent is not calculated until Phase 4.",
  }));
}

export async function apiLeave(organizationId: string) {
  const [catalog, balances, requests] = await Promise.all([
    loadOrgCatalog(organizationId),
    listBalances(organizationId),
    listRequests(organizationId),
  ]);
  return {
    balances: balances.map((item) => {
      const employee = catalog.employees.find((row) => row.id === item.employee_id);
      return {
        employee_id: item.employee_id,
        employee_code: employee?.employee_code ?? null,
        leave_type_id: item.leave_type_id,
        year: item.year,
        available: item.available,
        used: item.used,
        pending: item.pending,
      };
    }),
    requests: requests.slice(0, 100).map((item) => ({
      id: item.id,
      employee_id: item.employee_id,
      status: item.status,
      from_date: item.from_date,
      to_date: item.to_date,
      days: item.days,
    })),
  };
}

export async function apiPayrollRuns(organizationId: string) {
  const runs = await listPayrollRuns(organizationId);
  return runs.map((run) => ({
    id: run.id,
    period: run.period,
    status: run.status,
    period_from: run.period_from,
    period_to: run.period_to,
    employee_count: run.employee_count,
    total_net: run.total_net,
    finalized_at: run.finalized_at,
  }));
}

export async function apiPayslips(organizationId: string) {
  const views = await loadPayslipViews(organizationId);
  return views.map((item) => ({
    id: item.payslip.id,
    employee_id: item.payslip.employee_id,
    employee_name: item.employeeName,
    employee_code: item.employeeCode,
    period: item.payslip.period,
    status: item.payslip.status,
    payslip_number: item.payslip.payslip_number,
    issued_at: item.payslip.issued_at,
    document: "Payslip PDF is available to authenticated users at /api/payroll/payslips/{id}/pdf. No public URL is issued.",
  }));
}
