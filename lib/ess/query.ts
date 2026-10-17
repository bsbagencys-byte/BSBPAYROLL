import { loadOrgCatalog } from "@/lib/org-data";
import { getEmployeeRecord } from "@/lib/employee-query";
import { listEmployment } from "@/lib/leave/repository";
import { listAttendanceDays } from "@/lib/leave/attendance";
import { loadEmployeeLeave, loadLeaveOverview } from "@/lib/leave/query";
import { loadPayslipViews } from "@/lib/payroll/query";
import { loadEmployeeCompensation } from "@/lib/salary/query";
import { loadClaimListItems } from "@/lib/claims/query";
import { loadAccountListItems, loadLoanListItems } from "@/lib/loans/query";
import { listTaxDeclarationItems, listTaxDeclarations, listTaxProofs } from "@/lib/statutory/repository";
import { loadChangeRequests, loadNotifications } from "@/lib/ess/service";
import { todayInZone } from "@/lib/leave/dates";
import type {
  AttendanceDay,
  ClaimListItem,
  EssChangeRequestListItem,
  EssNotification,
  LoanAccountListItem,
  LoanListItem,
} from "@/types";

export async function loadSelfIdentityContext(organizationId: string) {
  const [catalog, employment] = await Promise.all([loadOrgCatalog(organizationId), listEmployment(organizationId)]);
  return { catalog, employment };
}

export async function loadSelfNotifications(organizationId: string, userId: string): Promise<EssNotification[]> {
  return loadNotifications(organizationId, userId);
}

export async function loadSelfChangeRequests(organizationId: string, userId: string, employeeId: string) {
  const all = await loadChangeRequests(organizationId);
  return all.filter((item) => item.request.employee_id === employeeId || item.request.requested_by === userId);
}

export async function loadReviewChangeRequests(organizationId: string) {
  const all = await loadChangeRequests(organizationId);
  return {
    pending: all.filter((item) => item.request.status === "PENDING"),
    decided: all.filter((item) => item.request.status !== "PENDING"),
  };
}

export async function loadSelfPayslips(organizationId: string, employeeId: string) {
  return loadPayslipViews(organizationId, employeeId);
}

export async function loadSelfSalary(organizationId: string, employeeId: string, timezone: string) {
  return loadEmployeeCompensation(organizationId, employeeId, timezone);
}

export async function loadSelfLeave(organizationId: string, employeeId: string, timezone: string) {
  return loadEmployeeLeave(organizationId, employeeId, timezone);
}

export async function loadSelfAttendance(
  organizationId: string,
  employeeId: string,
  from: string,
  to: string
): Promise<AttendanceDay[]> {
  const days = await listAttendanceDays(organizationId, from, to);
  return days
    .filter((item) => item.employee_id === employeeId)
    .sort((a, b) => b.work_date.localeCompare(a.work_date));
}

export async function loadSelfClaims(organizationId: string, employeeId: string): Promise<ClaimListItem[]> {
  const claims = await loadClaimListItems(organizationId);
  return claims.filter((item) => item.claim.employee_id === employeeId);
}

export async function loadSelfLoans(organizationId: string, employeeId: string, timezone: string): Promise<{
  applications: LoanListItem[];
  accounts: LoanAccountListItem[];
}> {
  const [applications, accounts] = await Promise.all([
    loadLoanListItems(organizationId),
    loadAccountListItems(organizationId, timezone),
  ]);
  return {
    applications: applications.filter((item) => item.application.employee_id === employeeId),
    accounts: accounts.filter((item) => item.account.employee_id === employeeId),
  };
}

export async function loadSelfDocuments(organizationId: string, employeeId: string) {
  return getEmployeeRecord(organizationId, employeeId);
}

export async function loadSelfTaxDocuments(organizationId: string, employeeId: string) {
  const declarations = await listTaxDeclarations(organizationId, employeeId);
  const items = await listTaxDeclarationItems(organizationId);
  const proofs = await listTaxProofs(organizationId);
  const declarationIds = new Set(declarations.map((item) => item.id));
  return {
    declarations,
    items: items.filter((item) => declarationIds.has(item.declaration_id)),
    proofs: proofs.filter((item) => declarationIds.has(item.declaration_id)),
  };
}

export interface ConsolidatedRequest {
  id: string;
  kind: "LEAVE" | "CLAIM" | "LOAN" | "CHANGE_REQUEST";
  title: string;
  detail: string;
  status: string;
  createdAt: string;
  href: string;
}

export async function loadConsolidatedRequests(
  organizationId: string,
  userId: string,
  employeeId: string,
  timezone: string
): Promise<ConsolidatedRequest[]> {
  const [leave, claims, loans, changeRequests] = await Promise.all([
    loadSelfLeave(organizationId, employeeId, timezone),
    loadSelfClaims(organizationId, employeeId),
    loadSelfLoans(organizationId, employeeId, timezone),
    loadSelfChangeRequests(organizationId, userId, employeeId),
  ]);

  const rows: ConsolidatedRequest[] = [];
  const typeName = (id: string) => leave.types.find((type) => type.id === id)?.name ?? "Leave request";
  for (const item of leave.requests) {
    rows.push({
      id: item.id,
      kind: "LEAVE",
      title: typeName(item.leave_type_id),
      detail: `${item.from_date}${item.to_date && item.to_date !== item.from_date ? ` – ${item.to_date}` : ""} · ${item.days}d`,
      status: item.status,
      createdAt: item.submitted_at ?? "",
      href: "/my/leave",
    });
  }
  for (const item of claims) {
    rows.push({
      id: item.claim.id,
      kind: "CLAIM",
      title: item.claimTypeName || "Claim",
      detail: item.claim.purpose || item.claim.reference_number || "Expense claim",
      status: item.claim.status,
      createdAt: item.claim.created_at,
      href: "/my/claims",
    });
  }
  for (const item of loans.applications) {
    rows.push({
      id: item.application.id,
      kind: "LOAN",
      title: item.loanTypeName || "Loan application",
      detail: item.application.purpose || `Amount requested`,
      status: item.application.status,
      createdAt: item.application.created_at,
      href: "/my/loans",
    });
  }
  for (const item of changeRequests) {
    rows.push({
      id: item.request.id,
      kind: "CHANGE_REQUEST",
      title: `Profile change · ${item.request.category}`,
      detail: `${item.request.field_key} → ${item.request.requested_value}`,
      status: item.request.status,
      createdAt: item.request.created_at,
      href: "/my/profile",
    });
  }
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function loadEssDashboard(organizationId: string, userId: string, employeeId: string, timezone: string) {
  const [leave, payslips, claims, loans, notifications, changeRequests, catalog, employment] = await Promise.all([
    loadSelfLeave(organizationId, employeeId, timezone),
    loadSelfPayslips(organizationId, employeeId),
    loadSelfClaims(organizationId, employeeId),
    loadSelfLoans(organizationId, employeeId, timezone),
    loadSelfNotifications(organizationId, userId),
    loadSelfChangeRequests(organizationId, userId, employeeId),
    loadOrgCatalog(organizationId),
    listEmployment(organizationId),
  ]);

  const self = catalog.employees.find((item) => item.id === employeeId) ?? null;
  const job = employment.find((item) => item.employee_id === employeeId) ?? null;
  const today = todayInZone(timezone);
  const upcomingHolidays = leave.holidays
    .filter((item) => item.status === "ACTIVE" && item.holiday_date >= today)
    .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));

  return {
    employee: self,
    departmentId: job?.department_id ?? null,
    pendingLeave: leave.requests.filter((item) => item.status === "PENDING"),
    approvedLeave: leave.requests.filter((item) => item.status === "APPROVED"),
    balances: leave.balances,
    upcomingHolidays,
    latestPayslip: payslips[0] ?? null,
    payslipCount: payslips.length,
    pendingClaims: claims.filter((item) => ["SUBMITTED", "PENDING_APPROVAL"].includes(item.claim.status)),
    claimCount: claims.length,
    activeLoanAccounts: loans.accounts.filter((item) => item.account.status === "ACTIVE"),
    pendingChangeRequests: changeRequests.filter((item) => item.request.status === "PENDING"),
    unreadNotifications: notifications.filter((item) => !item.read_at),
    notifications: notifications.slice(0, 5),
  };
}

export interface TeamApprovalRow {
  id: string;
  kind: "LEAVE" | "CLAIM" | "LOAN";
  employeeName: string;
  employeeCode: string;
  title: string;
  detail: string;
  status: string;
  createdAt: string;
  href: string;
}

/**
 * Pending approvals limited to the signed-in manager's direct reporting scope.
 * Reuses the existing leave/claims/loans services; no new approval engine.
 */
export async function loadTeamApprovals(
  organizationId: string,
  managerEmployeeId: string,
  timezone: string
): Promise<{ rows: TeamApprovalRow[]; reportCount: number }> {
  const { employment } = await loadSelfIdentityContext(organizationId);
  const reportIds = new Set(
    employment.filter((item) => item.reporting_manager_id === managerEmployeeId).map((item) => item.employee_id)
  );
  if (reportIds.size === 0) return { rows: [], reportCount: 0 };

  const [leaveOverview, claims, loans] = await Promise.all([
    loadLeaveOverview(organizationId, timezone),
    loadClaimListItems(organizationId),
    loadLoanListItems(organizationId),
  ]);

  const rows: TeamApprovalRow[] = [];
  for (const item of leaveOverview.requests) {
    if (!reportIds.has(item.employeeId) || item.status !== "PENDING") continue;
    rows.push({
      id: item.id,
      kind: "LEAVE",
      employeeName: item.employeeName,
      employeeCode: item.employeeCode,
      title: "Leave request",
      detail: `${item.fromDate}${item.toDate !== item.fromDate ? ` – ${item.toDate}` : ""} · ${item.days}d`,
      status: item.status,
      createdAt: item.submittedAt ?? "",
      href: "/leave/approvals",
    });
  }
  for (const item of claims) {
    if (!reportIds.has(item.claim.employee_id)) continue;
    if (!["SUBMITTED", "PENDING_APPROVAL"].includes(item.claim.status)) continue;
    rows.push({
      id: item.claim.id,
      kind: "CLAIM",
      employeeName: item.employeeName,
      employeeCode: item.employeeCode,
      title: item.claimTypeName || "Claim",
      detail: item.claim.purpose || item.claim.reference_number || "Expense claim",
      status: item.claim.status,
      createdAt: item.claim.created_at,
      href: "/claims/approvals",
    });
  }
  for (const item of loans) {
    if (!reportIds.has(item.application.employee_id)) continue;
    if (!["SUBMITTED", "PENDING_APPROVAL"].includes(item.application.status)) continue;
    rows.push({
      id: item.application.id,
      kind: "LOAN",
      employeeName: item.employeeName,
      employeeCode: item.employeeCode,
      title: item.loanTypeName || "Loan application",
      detail: item.application.purpose || "Loan request",
      status: item.application.status,
      createdAt: item.application.created_at,
      href: "/loans/applications",
    });
  }
  return { rows: rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), reportCount: reportIds.size };
}

export type EssChangeRequestRows = EssChangeRequestListItem[];
