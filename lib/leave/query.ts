import { lookupName } from "@/lib/utils";
import { loadOrgCatalog } from "@/lib/org-data";
import { currentYear } from "@/lib/leave/dates";
import { emptyBalance, matchingPolicy } from "@/lib/leave/engine";
import {
  listApprovals,
  listBalances,
  listCompOff,
  listEmployment,
  listHolidays,
  listLedger,
  listLeaveTypes,
  listPolicies,
  listPolicyAssignments,
  listRequestDays,
  listRequests,
} from "@/lib/leave/repository";
import { listAttendanceDays } from "@/lib/leave/attendance";
import type {
  CompOffEarning,
  Employee,
  Holiday,
  LeaveBalanceView,
  LeaveRequest,
  LeaveRequestListItem,
  LeaveType,
} from "@/types";

export async function loadLeaveCatalog(organizationId: string) {
  const [types, policies, assignments, holidays, catalog] = await Promise.all([
    listLeaveTypes(organizationId),
    listPolicies(organizationId),
    listPolicyAssignments(organizationId),
    listHolidays(organizationId),
    loadOrgCatalog(organizationId),
  ]);
  return { types, policies, assignments, holidays, ...catalog };
}

export async function ensureBalanceViews(
  organizationId: string,
  timezone: string,
  year = currentYear(timezone)
): Promise<LeaveBalanceView[]> {
  const [types, policies, assignments, balances, catalog, employmentRows] = await Promise.all([
    listLeaveTypes(organizationId),
    listPolicies(organizationId),
    listPolicyAssignments(organizationId),
    listBalances(organizationId),
    loadOrgCatalog(organizationId),
    listEmployment(organizationId),
  ]);
  const views: LeaveBalanceView[] = [];
  for (const employee of catalog.employees) {
    const employment = employmentRows.find((item) => item.employee_id === employee.id) ?? null;
    for (const type of types.filter((item) => item.status === "ACTIVE")) {
      const policy = matchingPolicy(employee, employment, type.id, policies, assignments, `${year}-01-01`);
      const existing = balances.find(
        (item) => item.employee_id === employee.id && item.leave_type_id === type.id && item.year === year
      );
      const row = existing ?? emptyBalance({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        employee_id: employee.id,
        leave_type_id: type.id,
        year,
        opening: policy?.start_balance ?? 0,
        allocated: policy?.accrual_method === "ANNUAL" ? policy.annual_allocation : 0,
        accrued: 0,
        used: 0,
        pending: 0,
        carry_forward: 0,
        adjusted: 0,
      });
      views.push({
        employeeId: employee.id,
        employeeName: employee.display_name,
        employeeCode: employee.employee_code,
        leaveTypeId: type.id,
        leaveTypeName: type.name,
        leaveTypeCode: type.code,
        year,
        opening: row.opening,
        allocated: row.allocated,
        accrued: row.accrued,
        used: row.used,
        pending: row.pending,
        carryForward: row.carry_forward,
        adjusted: row.adjusted,
        available: row.available,
      });
    }
  }
  return views;
}

export function toRequestListItem(
  request: LeaveRequest,
  employees: Employee[],
  types: LeaveType[],
  departmentName: string | null,
  availableAfter: number | null
): LeaveRequestListItem {
  const employee = employees.find((item) => item.id === request.employee_id);
  const type = types.find((item) => item.id === request.leave_type_id);
  return {
    id: request.id,
    employeeId: request.employee_id,
    employeeName: employee?.display_name ?? "Unknown",
    employeeCode: employee?.employee_code ?? "—",
    departmentName,
    leaveTypeId: request.leave_type_id,
    leaveTypeName: type?.name ?? "Unknown",
    leaveTypeCode: type?.code ?? "—",
    paid: type?.paid ?? false,
    fromDate: request.from_date,
    toDate: request.to_date,
    session: request.session,
    days: request.days,
    reason: request.reason,
    status: request.status,
    availableAfter,
    submittedAt: request.submitted_at,
  };
}

export async function loadLeaveOverview(organizationId: string, timezone: string) {
  const [requests, types, holidays, balances, catalog, attendance, approvals, ledger, compOff, employmentRows] = await Promise.all([
    listRequests(organizationId),
    listLeaveTypes(organizationId),
    listHolidays(organizationId),
    ensureBalanceViews(organizationId, timezone),
    loadOrgCatalog(organizationId),
    listAttendanceDays(organizationId),
    listApprovals(organizationId),
    listLedger(organizationId),
    listCompOff(organizationId),
    listEmployment(organizationId),
  ]);
  const pending = requests.filter((item) => item.status === "PENDING");
  const approved = requests.filter((item) => item.status === "APPROVED");
  return {
    types,
    holidays,
    requests: requests.map((item) =>
      toRequestListItem(
        item,
        catalog.employees,
        types,
        lookupName(catalog.departments, employmentRows.find((row) => row.employee_id === item.employee_id)?.department_id),
        balances.find((row) => row.employeeId === item.employee_id && row.leaveTypeId === item.leave_type_id)?.available ?? null
      )
    ),
    pendingCount: pending.length,
    approvedCount: approved.length,
    onLeaveCount: attendance.filter((item) => ["PAID_LEAVE", "UNPAID_LEAVE", "HALF_DAY_LEAVE", "COMP_OFF"].includes(item.status)).length,
    lowBalances: balances.filter((item) => item.available <= 1).slice(0, 8),
    balances,
    catalog,
    approvals,
    ledger,
    attendance,
    compOff,
  };
}

export async function loadRequestItems(organizationId: string, timezone: string) {
  const [requests, types, catalog, balances, employmentRows] = await Promise.all([
    listRequests(organizationId),
    listLeaveTypes(organizationId),
    loadOrgCatalog(organizationId),
    ensureBalanceViews(organizationId, timezone),
    listEmployment(organizationId),
  ]);
  return requests.map((item) => {
    const employment = employmentRows.find((row) => row.employee_id === item.employee_id);
    return toRequestListItem(
      item,
      catalog.employees,
      types,
      lookupName(catalog.departments, employment?.department_id),
      balances.find((row) => row.employeeId === item.employee_id && row.leaveTypeId === item.leave_type_id)?.available ?? null
    );
  });
}

export async function loadEmployeeLeave(organizationId: string, employeeId: string, timezone: string) {
  const [requests, types, balances, holidays, days, ledger, catalog] = await Promise.all([
    listRequests(organizationId),
    listLeaveTypes(organizationId),
    ensureBalanceViews(organizationId, timezone),
    listHolidays(organizationId),
    listRequestDays(organizationId),
    listLedger(organizationId),
    loadOrgCatalog(organizationId),
  ]);
  const employee = catalog.employees.find((item) => item.id === employeeId) ?? null;
  return {
    employee,
    types,
    holidays,
    requests: requests.filter((item) => item.employee_id === employeeId),
    balances: balances.filter((item) => item.employeeId === employeeId),
    days: days.filter((item) => item.employee_id === employeeId),
    ledger: ledger.filter((item) => item.employee_id === employeeId),
  };
}

export type LeaveOverview = Awaited<ReturnType<typeof loadLeaveOverview>>;
export type EmployeeLeaveData = Awaited<ReturnType<typeof loadEmployeeLeave>>;
export type { Holiday, CompOffEarning };
