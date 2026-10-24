import { loadOrgCatalog } from "@/lib/org-data";
import { listEmployment, listRequests } from "@/lib/leave/repository";
import { listClaims } from "@/lib/claims/repository";
import { listLoanAccounts, listLoanSchedule } from "@/lib/loans/repository";
import { listPayrollItems, listPayrollRuns } from "@/lib/payroll/repository";
import { listNormalizedEvents, listRawEvents } from "@/lib/biometric/repository";
import { currentPeriod, periodLabel, roundMoney } from "@/lib/payroll/engine";
import { formatCurrency, lookupName } from "@/lib/utils";
import type {
  AnalyticsKpi,
  AnalyticsSeriesPoint,
  PayrollRun,
  PayrollVarianceRow,
} from "@/types";

const HISTORICAL_STATUSES = new Set(["FINALIZED", "LOCKED", "PROCESSED", "PAID"]);
const DRAFT_STATUSES = new Set(["DRAFT", "CALCULATED", "UNDER_REVIEW", "APPROVAL_PENDING", "APPROVED"]);

export function isHistoricalRun(status: string) {
  return HISTORICAL_STATUSES.has(status);
}

export function isDraftRun(status: string) {
  return DRAFT_STATUSES.has(status);
}

function previousPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function pickRun(runs: PayrollRun[], period: string) {
  const periodRuns = runs.filter((row) => row.period === period);
  const historical = periodRuns.find((row) => isHistoricalRun(row.status));
  if (historical) return { run: historical, draft: false };
  const draft = periodRuns.find((row) => row.status !== "CANCELLED");
  return { run: draft ?? null, draft: Boolean(draft) };
}

function employerCost(run: PayrollRun) {
  return roundMoney(run.total_net + run.employer_contributions);
}

export async function loadAnalyticsSnapshot(organizationId: string, timezone: string, period?: string) {
  const selected = period || currentPeriod(timezone);
  const prior = previousPeriod(selected);
  const [runs, catalog, employment, requests, claims, accounts, schedule, rawEvents, normalized] = await Promise.all([
    listPayrollRuns(organizationId),
    loadOrgCatalog(organizationId),
    listEmployment(organizationId),
    listRequests(organizationId),
    listClaims(organizationId),
    listLoanAccounts(organizationId),
    listLoanSchedule(organizationId),
    listRawEvents(organizationId),
    listNormalizedEvents(organizationId),
  ]);

  const current = pickRun(runs, selected);
  const previous = pickRun(runs, prior);
  const currentItems = current.run ? await listPayrollItems(organizationId, current.run.id) : [];
  const previousItems = previous.run ? await listPayrollItems(organizationId, previous.run.id) : [];

  const activeEmployees = catalog.employees.filter((row) => row.status === "ACTIVE" || row.status === "ON_NOTICE");
  const pendingLeave = requests.filter((row) => row.status === "PENDING" || row.status === "DRAFT");
  const pendingClaims = claims.filter((row) => row.status === "SUBMITTED" || row.status === "PENDING_APPROVAL");
  const overdueLoans = schedule.filter((row) => row.status === "OVERDUE");
  const outstandingLoans = accounts
    .filter((row) => row.status === "ACTIVE" || row.status === "PAUSED")
    .reduce((sum, row) => sum + row.outstanding_principal + row.outstanding_interest, 0);
  const unmapped = normalized.filter((row) => row.status === "UNMAPPED");
  const failed = rawEvents.filter((row) => row.status === "REJECTED");
  const holdCount = currentItems.filter((row) => row.status === "ON_HOLD").length;
  const includedCount = currentItems.filter((row) => row.status === "INCLUDED").length;
  const holdRate = currentItems.length ? (holdCount / currentItems.length) * 100 : 0;
  const lopDays = currentItems.reduce((sum, row) => sum + row.lop_days, 0);
  const previousLop = previousItems.reduce((sum, row) => sum + row.lop_days, 0);

  const currency = "INR";
  const kpis: AnalyticsKpi[] = [
    {
      key: "headcount",
      label: "Active headcount",
      value: activeEmployees.length,
      display: String(activeEmployees.length),
      unit: "count",
      source: "Employee master (ACTIVE / ON_NOTICE)",
      draft: false,
    },
    {
      key: "payroll_cost",
      label: "Payroll cost",
      value: current.run ? employerCost(current.run) : 0,
      display: current.run ? formatCurrency(employerCost(current.run), currency) : "—",
      unit: "currency",
      source: current.run ? `Payroll run ${current.run.period} (${current.run.status}) net + employer contributions` : "No payroll run for period",
      draft: current.draft,
      note: current.draft ? "Draft or in-progress run. Not a historical total." : undefined,
    },
    {
      key: "net_pay",
      label: "Net pay",
      value: current.run?.total_net ?? 0,
      display: current.run ? formatCurrency(current.run.total_net, currency) : "—",
      unit: "currency",
      source: current.run ? `Stored payroll run total_net (${current.run.status})` : "No payroll run for period",
      draft: current.draft,
    },
    {
      key: "employer_cost",
      label: "Employer contributions",
      value: current.run?.employer_contributions ?? 0,
      display: current.run ? formatCurrency(current.run.employer_contributions, currency) : "—",
      unit: "currency",
      source: "Stored payroll run employer_contributions",
      draft: current.draft,
    },
    {
      key: "lop_days",
      label: "LOP days",
      value: lopDays,
      display: String(lopDays),
      unit: "days",
      source: "Stored payroll item lop_days. Punch-based LOP waits for Phase 4.",
      draft: current.draft,
    },
    {
      key: "hold_rate",
      label: "Hold rate",
      value: roundMoney(holdRate),
      display: `${roundMoney(holdRate)}%`,
      unit: "percent",
      source: "ON_HOLD items / items in selected run",
      draft: current.draft,
    },
    {
      key: "pending_leave",
      label: "Pending leave",
      value: pendingLeave.length,
      display: String(pendingLeave.length),
      unit: "count",
      source: "Leave requests in PENDING or DRAFT",
      draft: false,
    },
    {
      key: "pending_claims",
      label: "Pending claims",
      value: pendingClaims.length,
      display: String(pendingClaims.length),
      unit: "count",
      source: "Claims in SUBMITTED or PENDING_APPROVAL",
      draft: false,
    },
    {
      key: "loan_outstanding",
      label: "Loan outstanding",
      value: roundMoney(outstandingLoans),
      display: formatCurrency(outstandingLoans, currency),
      unit: "currency",
      source: "Active and paused loan accounts",
      draft: false,
    },
    {
      key: "loan_overdue",
      label: "Overdue installments",
      value: overdueLoans.length,
      display: String(overdueLoans.length),
      unit: "count",
      source: "Loan schedule status OVERDUE",
      draft: false,
    },
    {
      key: "unmapped_punches",
      label: "Unmapped punches",
      value: unmapped.length,
      display: String(unmapped.length),
      unit: "count",
      source: "Normalized biometric events without employee mapping",
      draft: false,
    },
    {
      key: "failed_ingest",
      label: "Failed ingest",
      value: failed.length,
      display: String(failed.length),
      unit: "count",
      source: "Raw biometric events REJECTED",
      draft: false,
    },
  ];

  const historicalRuns = runs
    .filter((row) => isHistoricalRun(row.status) || isDraftRun(row.status))
    .slice()
    .sort((a, b) => a.period.localeCompare(b.period));
  const costSeries: AnalyticsSeriesPoint[] = historicalRuns.map((row) => ({
    period: row.period,
    label: periodLabel(row.period),
    value: employerCost(row),
    draft: !isHistoricalRun(row.status),
  }));
  const netSeries: AnalyticsSeriesPoint[] = historicalRuns.map((row) => ({
    period: row.period,
    label: periodLabel(row.period),
    value: row.total_net,
    draft: !isHistoricalRun(row.status),
  }));

  const variance: PayrollVarianceRow[] = currentItems.map((item) => {
    const prev = previousItems.find((row) => row.employee_id === item.employee_id) ?? null;
    const employee = catalog.employees.find((row) => row.id === item.employee_id);
    const job = employment.find((row) => row.employee_id === item.employee_id);
    const delta = prev ? roundMoney(item.net_pay - prev.net_pay) : null;
    const deltaPercent = prev && prev.net_pay !== 0 ? roundMoney((delta! / prev.net_pay) * 100) : null;
    return {
      employeeId: item.employee_id,
      employeeName: employee?.display_name ?? "Unknown",
      employeeCode: employee?.employee_code ?? "—",
      departmentName: lookupName(catalog.departments, job?.department_id),
      currentNet: item.net_pay,
      previousNet: prev?.net_pay ?? null,
      delta,
      deltaPercent,
      currentGross: item.earnings,
      previousGross: prev?.earnings ?? null,
      currentLop: item.lop_days,
      previousLop: prev?.lop_days ?? null,
      currentStatus: item.status,
      previousStatus: prev?.status ?? null,
      draft: current.draft,
    };
  });

  return {
    period: selected,
    previousPeriod: prior,
    periodLabel: periodLabel(selected),
    previousLabel: periodLabel(prior),
    current,
    previous,
    currentItems,
    previousItems,
    kpis,
    costSeries,
    netSeries,
    variance,
    catalog,
    employment,
    pendingLeaveCount: pendingLeave.length,
    pendingClaimCount: pendingClaims.length,
    overdueLoanCount: overdueLoans.length,
    unmappedCount: unmapped.length,
    failedCount: failed.length,
    holdCount,
    includedCount,
    holdRate,
    lopDays,
    previousLop,
    activeHeadcount: activeEmployees.length,
    currency,
  };
}

export type AnalyticsSnapshot = Awaited<ReturnType<typeof loadAnalyticsSnapshot>>;
