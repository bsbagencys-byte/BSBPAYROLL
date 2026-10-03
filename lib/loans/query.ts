import { loadOrgCatalog } from "@/lib/org-data";
import { listEmployment } from "@/lib/leave/repository";
import { todayInZone } from "@/lib/leave/dates";
import { lookupName } from "@/lib/utils";
import { roundMoney } from "@/lib/loans/engine";
import {
  listLoanAccounts,
  listLoanAdjustments,
  listLoanApplications,
  listLoanApprovals,
  listLoanLedger,
  listLoanPolicies,
  listLoanRepayments,
  listLoanSchedule,
  listLoanTypes,
} from "@/lib/loans/repository";
import { refreshInstallmentStatuses } from "@/lib/loans/service";
import type { LoanAccountListItem, LoanListItem } from "@/types";

export async function loadLoansCatalog(organizationId: string) {
  const [types, policies, applications, accounts, schedule, repayments, catalog, employment] = await Promise.all([
    listLoanTypes(organizationId),
    listLoanPolicies(organizationId),
    listLoanApplications(organizationId),
    listLoanAccounts(organizationId),
    listLoanSchedule(organizationId),
    listLoanRepayments(organizationId),
    loadOrgCatalog(organizationId),
    listEmployment(organizationId),
  ]);
  return { types, policies, applications, accounts, schedule, repayments, employment, ...catalog };
}

export function toLoanListItem(input: {
  applications: Awaited<ReturnType<typeof listLoanApplications>>;
  types: Awaited<ReturnType<typeof listLoanTypes>>;
  employees: { id: string; display_name: string; employee_code: string }[];
  departments: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  employment: { employee_id: string; department_id: string | null; branch_id: string | null }[];
}): LoanListItem[] {
  return input.applications
    .map((application) => {
      const employee = input.employees.find((item) => item.id === application.employee_id);
      const type = input.types.find((item) => item.id === application.loan_type_id);
      const job = input.employment.find((item) => item.employee_id === application.employee_id);
      return {
        application,
        employeeName: employee?.display_name ?? "Unknown",
        employeeCode: employee?.employee_code ?? "—",
        departmentName: lookupName(input.departments, job?.department_id),
        branchName: lookupName(input.branches, job?.branch_id),
        loanTypeName: type?.name ?? "Unknown",
        loanTypeCode: type?.code ?? "—",
        category: type?.category ?? "OTHER",
      } satisfies LoanListItem;
    })
    .sort((a, b) => b.application.requested_date.localeCompare(a.application.requested_date));
}

export function toAccountListItem(input: {
  accounts: Awaited<ReturnType<typeof listLoanAccounts>>;
  types: Awaited<ReturnType<typeof listLoanTypes>>;
  schedule: Awaited<ReturnType<typeof listLoanSchedule>>;
  employees: { id: string; display_name: string; employee_code: string }[];
  departments: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  employment: { employee_id: string; department_id: string | null; branch_id: string | null }[];
}): LoanAccountListItem[] {
  return input.accounts
    .map((account) => {
      const employee = input.employees.find((item) => item.id === account.employee_id);
      const type = input.types.find((item) => item.id === account.loan_type_id);
      const job = input.employment.find((item) => item.employee_id === account.employee_id);
      const overdueCount = input.schedule.filter((item) => item.account_id === account.id && item.status === "OVERDUE").length;
      return {
        account,
        employeeName: employee?.display_name ?? "Unknown",
        employeeCode: employee?.employee_code ?? "—",
        departmentName: lookupName(input.departments, job?.department_id),
        branchName: lookupName(input.branches, job?.branch_id),
        loanTypeName: type?.name ?? "Unknown",
        loanTypeCode: type?.code ?? "—",
        category: type?.category ?? "OTHER",
        overdueCount,
      } satisfies LoanAccountListItem;
    })
    .sort((a, b) => b.account.start_date.localeCompare(a.account.start_date));
}

export async function loadLoanListItems(organizationId: string) {
  const catalog = await loadLoansCatalog(organizationId);
  return toLoanListItem(catalog);
}

export async function loadAccountListItems(organizationId: string, timezone: string) {
  const today = todayInZone(timezone);
  await refreshInstallmentStatuses(organizationId, today);
  const catalog = await loadLoansCatalog(organizationId);
  return toAccountListItem(catalog);
}

export async function loadLoansOverview(organizationId: string, timezone: string) {
  const today = todayInZone(timezone);
  await refreshInstallmentStatuses(organizationId, today);
  const catalog = await loadLoansCatalog(organizationId);
  const applications = toLoanListItem(catalog);
  const accounts = toAccountListItem(catalog);
  const active = accounts.filter((item) => item.account.status === "ACTIVE" || item.account.status === "PAUSED");
  const pending = applications.filter(
    (item) => item.application.status === "SUBMITTED" || item.application.status === "PENDING_APPROVAL"
  );
  const advances = active.filter((item) => item.category === "SALARY_ADVANCE" || item.category === "FESTIVAL_ADVANCE");
  const overdue = catalog.schedule.filter((item) => item.status === "OVERDUE");
  const monthKey = today.slice(0, 7);
  const monthlyEmi = catalog.schedule
    .filter((item) => item.due_date.startsWith(monthKey) && item.status !== "PAID" && item.status !== "WAIVED")
    .reduce((sum, item) => sum + item.outstanding_amount, 0);
  return {
    ...catalog,
    applications,
    accounts,
    active,
    pending,
    advances,
    overdue,
    monthlyEmi: roundMoney(monthlyEmi),
    outstanding: roundMoney(active.reduce((sum, item) => sum + item.account.outstanding_principal + item.account.outstanding_interest, 0)),
    recentApplications: applications.slice(0, 8),
    recentAccounts: accounts.slice(0, 8),
  };
}

export async function loadApplicationDetail(organizationId: string, id: string) {
  const catalog = await loadLoansCatalog(organizationId);
  const items = toLoanListItem(catalog);
  const row = items.find((item) => item.application.id === id) ?? null;
  const [approvals, account] = await Promise.all([
    listLoanApprovals(organizationId, id),
    Promise.resolve(catalog.accounts.find((item) => item.application_id === id) ?? null),
  ]);
  return { row, approvals, account, types: catalog.types, policies: catalog.policies };
}

export async function loadAccountDetail(organizationId: string, id: string, timezone: string) {
  const today = todayInZone(timezone);
  await refreshInstallmentStatuses(organizationId, today);
  const catalog = await loadLoansCatalog(organizationId);
  const items = toAccountListItem(catalog);
  const row = items.find((item) => item.account.id === id) ?? null;
  const [schedule, repayments, ledger, adjustments, application] = await Promise.all([
    listLoanSchedule(organizationId, id),
    listLoanRepayments(organizationId, id),
    listLoanLedger(organizationId, id),
    listLoanAdjustments(organizationId, id),
    Promise.resolve(catalog.applications.find((item) => item.id === row?.account.application_id) ?? null),
  ]);
  return { row, schedule, repayments, ledger, adjustments, application, today };
}

export type LoansOverview = Awaited<ReturnType<typeof loadLoansOverview>>;
export type LoanApplicationDetail = Awaited<ReturnType<typeof loadApplicationDetail>>;
export type LoanAccountDetail = Awaited<ReturnType<typeof loadAccountDetail>>;
