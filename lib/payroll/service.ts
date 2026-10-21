import { emitSafe } from "@/lib/events/emit";
import { getApprovedPayrollClaimLines } from "@/lib/claims/service";
import { employeeExcludedFromOrdinaryPayroll } from "@/lib/exits/service";
import { listAttendanceDays } from "@/lib/leave/attendance";
import { listEmployment, listHolidays } from "@/lib/leave/repository";
import { getEmployeeLoanDeductions, recordLoanRepayment } from "@/lib/loans/service";
import { loadOrgCatalog } from "@/lib/org-data";
import {
  eligibleEmployee,
  lineKindFromSalary,
  overlapsPeriod,
  periodBounds,
  periodLabel,
  prorate,
  roundMoney,
  summarizeAttendance,
} from "@/lib/payroll/engine";
import {
  calculateStatutoryBreakdown,
  defaultOrgStatutorySettings,
  indianFinancialYear,
  statutoryPayrollLines,
} from "@/lib/statutory/engine";
import {
  getOrgStatutorySettings,
  listStatutoryRuleVersions,
  listTaxDeclarationItems,
  listTaxDeclarations,
  replacePayrollStatutoryResults,
} from "@/lib/statutory/repository";
import {
  getPayrollException,
  getPayrollItem,
  getPayrollRun,
  getPayrollRunByPeriod,
  getPayrollSnapshot,
  insertPayrollAdjustment,
  insertPayrollApprovalHistory,
  insertPayrollFinalizationLog,
  insertPayrollLine,
  insertPayrollRun,
  insertPayrollSnapshot,
  insertStatutoryRule,
  listComplianceFilings,
  listPayrollAdjustments,
  listPayrollApprovalHistory,
  listPayrollExceptions,
  listPayrollItems,
  listPayrollLines,
  listPayrollRuns,
  listPayslips,
  listStatutoryRules,
  nextPayslipSequence,
  replaceComplianceFilings,
  replacePayrollExceptions,
  replacePayrollItems,
  replacePayrollLines,
  replacePayslipLineItems,
  replacePayslips,
  updatePayrollException,
  updatePayrollItem,
  updatePayrollRun,
  updatePayslip,
  updateStatutoryRule,
} from "@/lib/payroll/repository";
import { getEmployeeSalaryForDate } from "@/lib/salary/service";
import { listReimbursements, listVariableEarnings } from "@/lib/salary/repository";
import { updateClaim } from "@/lib/claims/repository";
import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { exceptionCounts, scanPayrollExceptions } from "@/lib/payroll/exceptions";
import { formatPayslipNumber, orgPayslipPrefix, payslipPeriodMeta } from "@/lib/payroll/numbering";
import { buildPayslipPdf } from "@/lib/payroll/pdf";
import {
  assertMutable,
  canApprove,
  canCancelRun,
  canFinalize,
  canHoldOrInclude,
  canLockRun,
  canRecalculate,
  canReject,
  canReturnDraft,
  canSubmitReview,
  canUnlockRun,
  isPayrollImmutable,
  nextApproveStatus,
} from "@/lib/payroll/workflow";
import type {
  ComplianceFiling,
  EmployeeBankAccount,
  EmployeeStatutory,
  Organization,
  PayrollAdjustment,
  PayrollApprovalHistory,
  PayrollException,
  PayrollFinalizationLog,
  PayrollItem,
  PayrollLine,
  PayrollRun,
  PayrollSnapshot,
  Payslip,
  PayslipLineItem,
  PayrollStatutoryLine,
  PayrollStatutoryResult,
  StatutoryRule,
} from "@/types";
import type { PayrollApprovalAction, PayrollRunStatus } from "@/lib/constants";

function stamp() {
  return new Date().toISOString();
}

export async function loadStatutory(organizationId: string, employeeId: string): Promise<EmployeeStatutory | null> {
  if (!hasSupabaseConfig() || isDemoMode()) {
    return getDemoStore().employeeStatutory.find((item) => item.employee_id === employeeId) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("employee_statutory").select("*").eq("employee_id", employeeId).maybeSingle();
  return (data as EmployeeStatutory | null) ?? null;
}

async function loadBank(organizationId: string, employeeId: string): Promise<EmployeeBankAccount | null> {
  if (!hasSupabaseConfig() || isDemoMode()) {
    return getDemoStore().employeeBank.find((item) => item.employee_id === employeeId) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("employee_bank_accounts").select("*").eq("employee_id", employeeId).maybeSingle();
  return (data as EmployeeBankAccount | null) ?? null;
}

async function loadOrganization(organizationId: string): Promise<Organization | null> {
  if (!hasSupabaseConfig() || isDemoMode()) {
    const org = getDemoStore().org;
    return org.id === organizationId ? org : null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("organizations").select("*").eq("id", organizationId).maybeSingle();
  return (data as Organization | null) ?? null;
}

function totalsFromItems(items: PayrollItem[]) {
  const included = items.filter((item) => item.status === "INCLUDED");
  return {
    employee_count: items.length,
    included_count: included.length,
    hold_count: items.filter((item) => item.status === "ON_HOLD").length,
    error_count: items.filter((item) => item.status === "ERROR" || item.status === "EXCLUDED").length,
    total_gross: roundMoney(included.reduce((sum, item) => sum + item.monthly_gross, 0)),
    total_earnings: roundMoney(included.reduce((sum, item) => sum + item.earnings + item.variable_earnings, 0)),
    total_deductions: roundMoney(included.reduce((sum, item) => sum + item.deductions, 0)),
    total_statutory: roundMoney(included.reduce((sum, item) => sum + item.statutory_total, 0)),
    total_reimbursements: roundMoney(included.reduce((sum, item) => sum + item.reimbursements, 0)),
    total_claims: roundMoney(included.reduce((sum, item) => sum + item.claims, 0)),
    total_loans: roundMoney(included.reduce((sum, item) => sum + item.loan_deductions, 0)),
    total_net: roundMoney(included.reduce((sum, item) => sum + item.net_pay, 0)),
    employer_contributions: roundMoney(
      included.reduce((sum, item) => sum + item.pf_employer + item.esi_employer + item.lwf_employer, 0)
    ),
  };
}

export async function saveStatutoryRuleRow(row: StatutoryRule, existing: StatutoryRule[]) {
  const found = existing.find((item) => item.id === row.id);
  if (found) return updateStatutoryRule(row.id, row);
  return insertStatutoryRule(row);
}

export async function createPayrollRun(input: {
  organizationId: string;
  period: string;
  payDate?: string | null;
  notes?: string | null;
  actorId: string | null;
}) {
  const existing = await getPayrollRunByPeriod(input.organizationId, input.period);
  if (existing) throw new Error("A payroll run already exists for this period.");
  const { from, to } = periodBounds(input.period);
  const now = stamp();
  const run: PayrollRun = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    period: input.period,
    period_from: from,
    period_to: to,
    pay_date: input.payDate || to,
    status: "DRAFT",
    run_type: "MONTHLY",
    employee_count: 0,
    included_count: 0,
    hold_count: 0,
    error_count: 0,
    warning_count: 0,
    total_gross: 0,
    total_earnings: 0,
    total_deductions: 0,
    total_statutory: 0,
    total_reimbursements: 0,
    total_claims: 0,
    total_loans: 0,
    total_net: 0,
    employer_contributions: 0,
    notes: input.notes || null,
    snapshot_id: null,
    calculated_at: null,
    submitted_at: null,
    reviewed_at: null,
    approved_at: null,
    finalized_at: null,
    locked_at: null,
    processed_at: null,
    paid_at: null,
    cancelled_at: null,
    cancel_reason: null,
    created_by: input.actorId,
    updated_by: input.actorId,
    created_at: now,
    updated_at: now,
  };
  await insertPayrollRun(run);
  return calculatePayrollRun(input.organizationId, run.id, input.actorId);
}

export async function calculatePayrollRun(organizationId: string, runId: string, actorId: string | null) {
  const run = await getPayrollRun(organizationId, runId);
  if (!run) throw new Error("Payroll run not found.");
  if (!canRecalculate(run.status)) {
    throw new Error("Locked or processed payroll cannot be recalculated.");
  }
  const org = await loadOrganization(organizationId);
  if (!org) throw new Error("Organization not found.");
  const [catalog, employment, holidays, days, rules, versions, settingsRow, declarations, declarationItems, variables, reimbursements, claims] = await Promise.all([
    loadOrgCatalog(organizationId),
    listEmployment(organizationId),
    listHolidays(organizationId),
    listAttendanceDays(organizationId, run.period_from, run.period_to),
    listStatutoryRules(organizationId),
    listStatutoryRuleVersions(organizationId),
    getOrgStatutorySettings(organizationId),
    listTaxDeclarations(organizationId),
    listTaxDeclarationItems(organizationId),
    listVariableEarnings(organizationId),
    listReimbursements(organizationId),
    getApprovedPayrollClaimLines(organizationId, run.period),
  ]);
  const settings = settingsRow ?? defaultOrgStatutorySettings(organizationId, stamp());
  const taxYear = indianFinancialYear(run.period_to);
  const items: PayrollItem[] = [];
  const lines: PayrollLine[] = [];
  const statutoryResults: PayrollStatutoryResult[] = [];
  const statutoryDetailLines: PayrollStatutoryLine[] = [];

  for (const employee of catalog.employees) {
    const job = employment.find((item) => item.employee_id === employee.id);
    const excluded = await employeeExcludedFromOrdinaryPayroll(organizationId, employee.id, run.period_from);
    const check = excluded
      ? { ok: false, reason: "Employee last working date is before this payroll period." }
      : eligibleEmployee(employee, job, run.period_to);
    const itemId = crypto.randomUUID();
    const attendance = summarizeAttendance({
      from: run.period_from,
      to: run.period_to,
      weeklyOff: org.weekly_off,
      holidays,
      days: days.filter((item) => item.employee_id === employee.id),
      joiningDate: job?.joining_date ?? null,
    });
    const snapshot = await getEmployeeSalaryForDate(organizationId, employee.id, run.period_to);
    if (!check.ok || !snapshot) {
      items.push({
        id: itemId,
        organization_id: organizationId,
        run_id: run.id,
        employee_id: employee.id,
        assignment_id: snapshot?.assignmentId ?? null,
        structure_id: snapshot?.structureId ?? null,
        status: "EXCLUDED",
        hold_reason: null,
        error_message: check.reason ?? "No active salary assignment covering this period.",
        working_days: attendance.workingDays,
        present_days: attendance.presentDays,
        paid_days: attendance.paidDays,
        lop_days: attendance.lopDays,
        paid_leave_days: attendance.paidLeaveDays,
        ctc: snapshot?.ctc ?? 0,
        monthly_gross: 0,
        earnings: 0,
        variable_earnings: 0,
        reimbursements: 0,
        claims: 0,
        deductions: 0,
        loan_deductions: 0,
        pf_employee: 0,
        pf_employer: 0,
        esi_employee: 0,
        esi_employer: 0,
        pt_amount: 0,
        tds_amount: 0,
        lwf_employee: 0,
        lwf_employer: 0,
        statutory_total: 0,
        net_pay: 0,
        employer_cost: 0,
        created_at: stamp(),
        updated_at: stamp(),
      });
      continue;
    }

    let sort = 10;
    let earnings = 0;
    for (const line of snapshot.lines.filter((item) => item.componentType === "EARNING" && !item.variable)) {
      const amount = prorate(line.amount, attendance.paidDays, attendance.workingDays || 1);
      earnings = roundMoney(earnings + amount);
      lines.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        run_id: run.id,
        item_id: itemId,
        employee_id: employee.id,
        kind: lineKindFromSalary(line),
        code: line.code,
        name: line.name,
        amount,
        taxable: true,
        reference_id: line.componentId,
        notes: attendance.lopDays > 0 ? `Prorated for ${attendance.paidDays}/${attendance.workingDays} paid days` : null,
        sort_order: sort,
        created_at: stamp(),
      });
      sort += 1;
    }

    const variableRows = variables.filter(
      (item) =>
        item.employee_id === employee.id &&
        item.status === "APPROVED" &&
        overlapsPeriod(item.period_from, item.period_to, run.period_from, run.period_to)
    );
    let variableTotal = 0;
    for (const row of variableRows) {
      variableTotal = roundMoney(variableTotal + row.amount);
      const component = snapshot.lines.find((line) => line.componentId === row.component_id);
      lines.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        run_id: run.id,
        item_id: itemId,
        employee_id: employee.id,
        kind: "EARNING",
        code: component?.code ?? "VAR",
        name: component?.name ?? "Variable earning",
        amount: row.amount,
        taxable: true,
        reference_id: row.id,
        notes: row.reference,
        sort_order: sort,
        created_at: stamp(),
      });
      sort += 1;
    }

    const reimbursementRows = reimbursements.filter(
      (item) =>
        item.employee_id === employee.id &&
        item.status === "APPROVED" &&
        item.include_in_payroll &&
        item.entry_date >= run.period_from &&
        item.entry_date <= run.period_to
    );
    let reimbursementTotal = 0;
    for (const row of reimbursementRows) {
      reimbursementTotal = roundMoney(reimbursementTotal + row.amount);
      lines.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        run_id: run.id,
        item_id: itemId,
        employee_id: employee.id,
        kind: "REIMBURSEMENT",
        code: "REIMB",
        name: row.description || "Reimbursement",
        amount: row.amount,
        taxable: false,
        reference_id: row.id,
        notes: row.reference,
        sort_order: sort,
        created_at: stamp(),
      });
      sort += 1;
    }

    const claimRows = claims.filter((item) => item.employeeId === employee.id);
    let claimTotal = 0;
    for (const row of claimRows) {
      claimTotal = roundMoney(claimTotal + row.amount);
      lines.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        run_id: run.id,
        item_id: itemId,
        employee_id: employee.id,
        kind: "CLAIM",
        code: row.source,
        name: `${row.source} claim`,
        amount: row.amount,
        taxable: false,
        reference_id: row.claimId,
        notes: null,
        sort_order: sort,
        created_at: stamp(),
      });
      sort += 1;
    }

    const loanRows = await getEmployeeLoanDeductions(organizationId, employee.id, run.period);
    let loanTotal = 0;
    for (const row of loanRows) {
      loanTotal = roundMoney(loanTotal + row.emiDue);
      lines.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        run_id: run.id,
        item_id: itemId,
        employee_id: employee.id,
        kind: "LOAN",
        code: "LOAN_EMI",
        name: `Loan EMI ${row.installmentNumber}`,
        amount: row.emiDue,
        taxable: false,
        reference_id: row.installmentId,
        notes: row.loanId,
        sort_order: 80,
        created_at: stamp(),
      });
    }

    const statutoryRow = await loadStatutory(organizationId, employee.id);
    const declaration = declarations.find((item) => item.employee_id === employee.id && item.tax_year === taxYear) ?? null;
    const statutory = calculateStatutoryBreakdown({
      snapshot,
      proratedEarnings: earnings,
      taxableEarnings: earnings + variableTotal,
      statutory: statutoryRow,
      legacyRules: rules,
      versions,
      settings,
      onDate: run.period_to,
      stateCode: statutoryRow?.pt_state_code || org.state || "KA",
      declaration,
      declarationItems: declaration ? declarationItems.filter((item) => item.declaration_id === declaration.id) : [],
    });
    const nowStamp = stamp();
    lines.push(
      ...statutoryPayrollLines({
        organizationId,
        runId: run.id,
        itemId,
        employeeId: employee.id,
        breakdown: statutory,
        createdAt: nowStamp,
      })
    );
    const resultId = crypto.randomUUID();
    statutoryResults.push({
      id: resultId,
      organization_id: organizationId,
      run_id: run.id,
      item_id: itemId,
      employee_id: employee.id,
      period: run.period,
      rule_versions_json: JSON.stringify(statutory.ruleVersions),
      pf_wage: statutory.pfWage,
      pf_employee: statutory.pfEmployee,
      pf_employer: statutory.pfEmployer,
      pf_eps: statutory.pfEps,
      pf_epf: statutory.pfEpf,
      esi_wage: statutory.esiWage,
      esi_employee: statutory.esiEmployee,
      esi_employer: statutory.esiEmployer,
      pt_amount: statutory.ptAmount,
      pt_state_code: statutory.ptStateCode,
      lwf_employee: statutory.lwfEmployee,
      lwf_employer: statutory.lwfEmployer,
      tds_amount: statutory.tdsAmount,
      tds_regime: statutory.tdsRegime,
      taxable_income: statutory.taxableIncome,
      employee_total: statutory.employeeTotal,
      employer_total: statutory.employerTotal,
      notes_json: JSON.stringify(statutory.warnings),
      created_at: nowStamp,
    });
    statutoryDetailLines.push(
      ...statutoryPayrollLines({
        organizationId,
        runId: run.id,
        itemId,
        employeeId: employee.id,
        breakdown: statutory,
        createdAt: nowStamp,
      }).map((line, index) => ({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        result_id: resultId,
        run_id: run.id,
        employee_id: employee.id,
        head: (line.code.replace("_ER", "") as "PF" | "ESI" | "PT" | "TDS" | "LWF"),
        party: line.kind === "EMPLOYER" ? "EMPLOYER" as const : "EMPLOYEE" as const,
        code: line.code,
        name: line.name,
        amount: line.amount,
        wage_base: line.code.startsWith("PF") ? statutory.pfWage : line.code.startsWith("ESI") ? statutory.esiWage : earnings,
        rate: null,
        rule_version_id: statutory.ruleVersions.find((item) => item.head === line.code.replace("_ER", ""))?.versionId ?? null,
        sort_order: index,
        created_at: nowStamp,
      }))
    );

    const net = roundMoney(
      earnings + variableTotal + reimbursementTotal + claimTotal - loanTotal - statutory.employeeTotal
    );
    items.push({
      id: itemId,
      organization_id: organizationId,
      run_id: run.id,
      employee_id: employee.id,
      assignment_id: snapshot.assignmentId,
      structure_id: snapshot.structureId,
      status: "INCLUDED",
      hold_reason: null,
      error_message: null,
      working_days: attendance.workingDays,
      present_days: attendance.presentDays,
      paid_days: attendance.paidDays,
      lop_days: attendance.lopDays,
      paid_leave_days: attendance.paidLeaveDays,
      ctc: snapshot.ctc,
      monthly_gross: snapshot.gross,
      earnings,
      variable_earnings: variableTotal,
      reimbursements: reimbursementTotal,
      claims: claimTotal,
      deductions: loanTotal,
      loan_deductions: loanTotal,
      pf_employee: statutory.pfEmployee,
      pf_employer: statutory.pfEmployer,
      esi_employee: statutory.esiEmployee,
      esi_employer: statutory.esiEmployer,
      pt_amount: statutory.ptAmount,
      tds_amount: statutory.tdsAmount,
      lwf_employee: statutory.lwfEmployee,
      lwf_employer: statutory.lwfEmployer,
      statutory_total: statutory.employeeTotal,
      net_pay: net,
      employer_cost: roundMoney(earnings + variableTotal + statutory.employerTotal),
      created_at: nowStamp,
      updated_at: nowStamp,
    });
  }

  await replacePayrollItems(organizationId, run.id, items);
  await replacePayrollLines(organizationId, run.id, lines);
  await replacePayrollStatutoryResults(organizationId, run.id, statutoryResults, statutoryDetailLines);
  const exceptions = await scanPayrollExceptions(organizationId, { ...run, status: "CALCULATED" });
  await replacePayrollExceptions(organizationId, run.id, exceptions);
  const counts = exceptionCounts(exceptions);
  const totals = totalsFromItems(items);
  const calculated = await updatePayrollRun(run.id, {
    ...totals,
    error_count: Math.max(totals.error_count, counts.errorCount),
    warning_count: counts.warningCount,
    status: "CALCULATED",
    calculated_at: stamp(),
    updated_by: actorId,
  });
  await emitSafe({
    organizationId,
    eventType: "payroll.run.calculated",
    entityType: "payroll_run",
    entityId: run.id,
    actorId,
    payload: { period: run.period, status: "CALCULATED", href: "/payroll/runs" },
    idempotencyKey: `payroll.run.calculated:${run.id}:${run.period}`,
  });
  return calculated;
}

export async function holdPayrollItem(organizationId: string, itemId: string, reason: string | null, actorId: string | null) {
  const item = await getPayrollItem(organizationId, itemId);
  if (!item) throw new Error("Payroll item not found.");
  const run = await getPayrollRun(organizationId, item.run_id);
  if (!run) throw new Error("Payroll run not found.");
  if (!canHoldOrInclude(run.status)) {
    throw new Error("Locked payroll cannot be changed.");
  }
  await updatePayrollItem(itemId, {
    status: "ON_HOLD",
    hold_reason: reason || "Held from payroll",
    updated_at: stamp(),
  });
  const items = await listPayrollItems(organizationId, run.id);
  return updatePayrollRun(run.id, { ...totalsFromItems(items), updated_by: actorId });
}

export async function includePayrollItem(organizationId: string, itemId: string, actorId: string | null) {
  const item = await getPayrollItem(organizationId, itemId);
  if (!item) throw new Error("Payroll item not found.");
  const run = await getPayrollRun(organizationId, item.run_id);
  if (!run) throw new Error("Payroll run not found.");
  if (!canHoldOrInclude(run.status)) {
    throw new Error("Locked payroll cannot be changed.");
  }
  if (item.status === "ERROR" || item.status === "EXCLUDED") throw new Error("Excluded employees cannot be included without salary.");
  await updatePayrollItem(itemId, { status: "INCLUDED", hold_reason: null, updated_at: stamp() });
  const items = await listPayrollItems(organizationId, run.id);
  return updatePayrollRun(run.id, { ...totalsFromItems(items), updated_by: actorId });
}

export async function lockPayrollRun(organizationId: string, runId: string, actorId: string | null, actorRole?: string | null) {
  const run = await getPayrollRun(organizationId, runId);
  if (!run) throw new Error("Payroll run not found.");
  if (!canLockRun(run.status)) throw new Error("Only a calculated or finalized run can be locked.");
  const updated = await updatePayrollRun(runId, { status: "LOCKED", locked_at: stamp(), updated_by: actorId });
  await recordApprovalStep({
    organizationId,
    run,
    action: "LOCK",
    previous: run.status,
    next: "LOCKED",
    actorId,
    actorRole,
  });
  return updated;
}

export async function unlockPayrollRun(organizationId: string, runId: string, actorId: string | null, actorRole?: string | null) {
  const run = await getPayrollRun(organizationId, runId);
  if (!run) throw new Error("Payroll run not found.");
  if (!canUnlockRun(run.status)) throw new Error("Only a locked run can be unlocked.");
  if (run.finalized_at) throw new Error("Finalized payroll cannot be unlocked. Create an adjustment run.");
  const updated = await updatePayrollRun(runId, { status: "CALCULATED", locked_at: null, updated_by: actorId });
  await recordApprovalStep({
    organizationId,
    run,
    action: "UNLOCK",
    previous: run.status,
    next: "CALCULATED",
    actorId,
    actorRole,
  });
  return updated;
}

export async function processPayrollRun(organizationId: string, runId: string, actorId: string | null) {
  const run = await getPayrollRun(organizationId, runId);
  if (!run) throw new Error("Payroll run not found.");
  if (run.status !== "LOCKED") throw new Error("Lock the run before processing.");
  const [items, lines] = await Promise.all([listPayrollItems(organizationId, runId), listPayrollLines(organizationId, runId)]);
  const included = items.filter((item) => item.status === "INCLUDED");
  const now = stamp();
  const existingPayslips = await listPayslips(organizationId, runId);
  if (!existingPayslips.length) {
    await generatePayslipsForRun(organizationId, runId, actorId);
  }

  for (const item of included) {
    const loanLines = lines.filter((line) => line.item_id === item.id && line.kind === "LOAN");
    for (const line of loanLines) {
      if (!line.notes) continue;
      await recordLoanRepayment({
        organizationId,
        accountId: line.notes,
        paymentDate: run.pay_date || run.period_to,
        amount: line.amount,
        paymentMethod: "PAYROLL",
        reference: run.period,
        notes: `Payroll ${run.period}`,
        actorId,
        source: "PAYROLL",
        payrollPeriod: run.period,
      });
    }
    const claimLines = lines.filter((line) => line.item_id === item.id && line.kind === "CLAIM" && line.reference_id);
    for (const line of claimLines) {
      await updateClaim(line.reference_id as string, {
        status: "INCLUDED_IN_PAYROLL",
        payroll_period: run.period,
        paid_at: now,
        updated_by: actorId,
      });
    }
  }

  const draftFilings: ComplianceFiling[] = [
    {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      run_id: runId,
      head: "PF",
      period: run.period,
      employee_count: included.filter((item) => item.pf_employee > 0).length,
      employee_amount: roundMoney(included.reduce((sum, item) => sum + item.pf_employee, 0)),
      employer_amount: roundMoney(included.reduce((sum, item) => sum + item.pf_employer, 0)),
      total_amount: 0,
      status: "READY",
      notes: null,
      created_by: actorId,
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      run_id: runId,
      head: "ESI",
      period: run.period,
      employee_count: included.filter((item) => item.esi_employee > 0).length,
      employee_amount: roundMoney(included.reduce((sum, item) => sum + item.esi_employee, 0)),
      employer_amount: roundMoney(included.reduce((sum, item) => sum + item.esi_employer, 0)),
      total_amount: 0,
      status: "READY",
      notes: null,
      created_by: actorId,
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      run_id: runId,
      head: "PT",
      period: run.period,
      employee_count: included.filter((item) => item.pt_amount > 0).length,
      employee_amount: roundMoney(included.reduce((sum, item) => sum + item.pt_amount, 0)),
      employer_amount: 0,
      total_amount: 0,
      status: "READY",
      notes: null,
      created_by: actorId,
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      run_id: runId,
      head: "TDS",
      period: run.period,
      employee_count: included.filter((item) => item.tds_amount > 0).length,
      employee_amount: roundMoney(included.reduce((sum, item) => sum + item.tds_amount, 0)),
      employer_amount: 0,
      total_amount: 0,
      status: "READY",
      notes: null,
      created_by: actorId,
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      run_id: runId,
      head: "LWF",
      period: run.period,
      employee_count: included.filter((item) => item.lwf_employee > 0 || item.lwf_employer > 0).length,
      employee_amount: roundMoney(included.reduce((sum, item) => sum + item.lwf_employee, 0)),
      employer_amount: roundMoney(included.reduce((sum, item) => sum + item.lwf_employer, 0)),
      total_amount: 0,
      status: "READY",
      notes: null,
      created_by: actorId,
      created_at: now,
      updated_at: now,
    },
  ];
  const filings = draftFilings.map((item) => ({
    ...item,
    total_amount: roundMoney(item.employee_amount + item.employer_amount),
  }));
  await replaceComplianceFilings(organizationId, runId, filings);

  await recordApprovalStep({
    organizationId,
    run,
    action: "PROCESS",
    previous: run.status,
    next: "PROCESSED",
    actorId,
  });
  return updatePayrollRun(runId, { status: "PROCESSED", processed_at: now, updated_by: actorId });
}

export async function markPayrollPaid(organizationId: string, runId: string, actorId: string | null) {
  const run = await getPayrollRun(organizationId, runId);
  if (!run) throw new Error("Payroll run not found.");
  if (run.status !== "PROCESSED") throw new Error("Process the run before marking paid.");
  const payslips = await listPayslips(organizationId, runId);
  for (const slip of payslips) {
    if (slip.status === "ISSUED") await updatePayslip(slip.id, { status: "ISSUED" });
  }
  const items = await listPayrollItems(organizationId, runId);
  const lines = await listPayrollLines(organizationId, runId);
  for (const item of items.filter((row) => row.status === "INCLUDED")) {
    const claimLines = lines.filter((line) => line.item_id === item.id && line.kind === "CLAIM" && line.reference_id);
    for (const line of claimLines) {
      await updateClaim(line.reference_id as string, { status: "PAID", paid_at: stamp(), updated_by: actorId });
    }
  }
  await recordApprovalStep({
    organizationId,
    run,
    action: "PAID",
    previous: run.status,
    next: "PAID",
    actorId,
  });
  return updatePayrollRun(runId, { status: "PAID", paid_at: stamp(), updated_by: actorId });
}

async function recordApprovalStep(input: {
  organizationId: string;
  run: PayrollRun;
  action: PayrollApprovalAction;
  previous: PayrollRunStatus;
  next: PayrollRunStatus;
  actorId: string | null;
  actorRole?: string | null;
  reason?: string | null;
}) {
  const row: PayrollApprovalHistory = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    run_id: input.run.id,
    action: input.action,
    previous_status: input.previous,
    new_status: input.next,
    actor_id: input.actorId,
    actor_role: input.actorRole ?? null,
    reason: input.reason ?? null,
    created_at: stamp(),
  };
  await insertPayrollApprovalHistory(row);
  return row;
}

export async function refreshPayrollExceptions(organizationId: string, runId: string) {
  const run = await getPayrollRun(organizationId, runId);
  if (!run) throw new Error("Payroll run not found.");
  const exceptions = await scanPayrollExceptions(organizationId, run);
  await replacePayrollExceptions(organizationId, runId, exceptions);
  const counts = exceptionCounts(exceptions);
  await updatePayrollRun(runId, { error_count: counts.errorCount, warning_count: counts.warningCount });
  return exceptions;
}

export async function submitPayrollForReview(
  organizationId: string,
  runId: string,
  actorId: string | null,
  actorRole?: string | null
) {
  const run = await getPayrollRun(organizationId, runId);
  if (!run) throw new Error("Payroll run not found.");
  if (!canSubmitReview(run.status)) throw new Error("Only a calculated run can be submitted for review.");
  const exceptions = await refreshPayrollExceptions(organizationId, runId);
  const counts = exceptionCounts(exceptions);
  if (counts.errorCount > 0) throw new Error("Open ERROR exceptions block review. Resolve them first.");
  const updated = await updatePayrollRun(runId, {
    status: "UNDER_REVIEW",
    submitted_at: stamp(),
    updated_by: actorId,
  });
  await recordApprovalStep({
    organizationId,
    run,
    action: "SUBMIT_REVIEW",
    previous: run.status,
    next: "UNDER_REVIEW",
    actorId,
    actorRole,
  });
  return updated;
}

export async function approvePayrollRun(
  organizationId: string,
  runId: string,
  actorId: string | null,
  actorRole?: string | null,
  reason?: string | null
) {
  const run = await getPayrollRun(organizationId, runId);
  if (!run) throw new Error("Payroll run not found.");
  if (!canApprove(run.status)) throw new Error("This run is not waiting for approval.");
  const exceptions = await listPayrollExceptions(organizationId, runId);
  const counts = exceptionCounts(exceptions);
  if (counts.errorCount > 0) throw new Error("ERROR exceptions block approval.");
  if (counts.unackedWarnings > 0) throw new Error("All WARNING exceptions must be acknowledged before approval.");
  const next = nextApproveStatus(run.status);
  const patch: Partial<PayrollRun> = {
    status: next,
    updated_by: actorId,
  };
  if (next === "APPROVAL_PENDING") patch.reviewed_at = stamp();
  if (next === "APPROVED") patch.approved_at = stamp();
  const updated = await updatePayrollRun(runId, patch);
  await recordApprovalStep({
    organizationId,
    run,
    action: "APPROVE",
    previous: run.status,
    next,
      actorId,
      actorRole,
      reason,
    });
    if (next === "APPROVED") {
      await emitSafe({
        organizationId,
        eventType: "payroll.run.approved",
        entityType: "payroll_run",
        entityId: run.id,
        actorId,
        payload: { period: run.period, status: next, href: "/payroll/runs" },
        idempotencyKey: `payroll.run.approved:${run.id}`,
      });
    }
    return updated;
  }

  export async function rejectPayrollRun(
  organizationId: string,
  runId: string,
  actorId: string | null,
  actorRole: string | null,
  reason: string
) {
  const run = await getPayrollRun(organizationId, runId);
  if (!run) throw new Error("Payroll run not found.");
  if (!canReject(run.status)) throw new Error("This run cannot be rejected.");
  if (!reason.trim()) throw new Error("A reason is required.");
  const updated = await updatePayrollRun(runId, { status: "CALCULATED", updated_by: actorId });
  await recordApprovalStep({
    organizationId,
    run,
    action: "REJECT",
    previous: run.status,
    next: "CALCULATED",
    actorId,
    actorRole,
    reason,
  });
  return updated;
}

export async function returnPayrollToDraft(
  organizationId: string,
  runId: string,
  actorId: string | null,
  actorRole: string | null,
  reason: string
) {
  const run = await getPayrollRun(organizationId, runId);
  if (!run) throw new Error("Payroll run not found.");
  if (!canReturnDraft(run.status)) throw new Error("This run cannot be returned to draft.");
  if (isPayrollImmutable(run.status)) throw new Error("Finalized payroll cannot be returned to draft.");
  if (!reason.trim()) throw new Error("A reason is required.");
  const updated = await updatePayrollRun(runId, { status: "DRAFT", updated_by: actorId });
  await recordApprovalStep({
    organizationId,
    run,
    action: "RETURN_DRAFT",
    previous: run.status,
    next: "DRAFT",
    actorId,
    actorRole,
    reason,
  });
  return updated;
}

export async function cancelPayrollRun(
  organizationId: string,
  runId: string,
  actorId: string | null,
  actorRole: string | null,
  reason: string
) {
  const run = await getPayrollRun(organizationId, runId);
  if (!run) throw new Error("Payroll run not found.");
  if (!canCancelRun(run.status)) throw new Error("This run cannot be cancelled.");
  if (run.status === "PROCESSED" || run.status === "PAID") throw new Error("Processed payroll cannot be cancelled.");
  if (!reason.trim()) throw new Error("A reason is required.");
  const updated = await updatePayrollRun(runId, {
    status: "CANCELLED",
    cancelled_at: stamp(),
    cancel_reason: reason,
    updated_by: actorId,
  });
  await recordApprovalStep({
    organizationId,
    run,
    action: "CANCEL",
    previous: run.status,
    next: "CANCELLED",
    actorId,
    actorRole,
    reason,
  });
  return updated;
}

export async function acknowledgePayrollException(
  organizationId: string,
  exceptionId: string,
  actorId: string | null,
  note?: string | null
) {
  const row = await getPayrollException(organizationId, exceptionId);
  if (!row) throw new Error("Exception not found.");
  if (row.severity !== "WARNING") throw new Error("Only WARNING exceptions can be acknowledged.");
  if (row.status === "RESOLVED") throw new Error("Resolved exceptions cannot be acknowledged.");
  return updatePayrollException(exceptionId, {
    status: "ACKNOWLEDGED",
    acknowledged_by: actorId,
    acknowledged_at: stamp(),
    acknowledge_note: note || null,
  });
}

export async function resolvePayrollException(organizationId: string, exceptionId: string) {
  const row = await getPayrollException(organizationId, exceptionId);
  if (!row) throw new Error("Exception not found.");
  return updatePayrollException(exceptionId, { status: "RESOLVED", resolved_at: stamp() });
}

function validateFinalization(input: {
  run: PayrollRun;
  items: PayrollItem[];
  lines: PayrollLine[];
  exceptions: PayrollException[];
}) {
  const issues: string[] = [];
  const counts = exceptionCounts(input.exceptions);
  if (counts.errorCount > 0) issues.push(`${counts.errorCount} ERROR exception(s) remain open.`);
  if (!input.items.length) issues.push("No employees were processed.");
  const included = input.items.filter((item) => item.status === "INCLUDED");
  if (!included.length) issues.push("No included employees to finalize.");
  for (const item of included) {
    if (!item.assignment_id) issues.push(`Employee ${item.employee_id} has no salary assignment.`);
    if (item.net_pay < 0) issues.push(`Employee ${item.employee_id} has a negative net.`);
  }
  const seen = new Map<string, number>();
  for (const line of input.lines) {
    if (!line.reference_id) continue;
    const key = `${line.kind}:${line.reference_id}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [key, count] of seen) {
    if (count > 1) issues.push(`Duplicate source ${key}.`);
  }
  const loanMismatch = input.lines.some((line) => line.kind === "LOAN" && line.amount > 0 && !line.notes);
  if (loanMismatch) issues.push("Loan EMI line is missing an account reference.");
  return issues;
}

export async function finalizePayrollRun(
  organizationId: string,
  runId: string,
  actorId: string | null,
  actorRole?: string | null
) {
  const run = await getPayrollRun(organizationId, runId);
  if (!run) throw new Error("Payroll run not found.");
  if (!canFinalize(run.status)) throw new Error("Only an approved run can be finalized.");
  const [items, lines, exceptions] = await Promise.all([
    listPayrollItems(organizationId, runId),
    listPayrollLines(organizationId, runId),
    listPayrollExceptions(organizationId, runId),
  ]);
  const issues = validateFinalization({ run, items, lines, exceptions });
  if (issues.length) throw new Error(issues[0]);
  const snapshot: PayrollSnapshot = {
    id: crypto.randomUUID(),
    organization_id: organizationId,
    run_id: runId,
    period: run.period,
    payload_json: JSON.stringify({
      run,
      items,
      lines,
      exceptions,
      totals: totalsFromItems(items),
    }),
    created_by: actorId,
    created_at: stamp(),
  };
  await insertPayrollSnapshot(snapshot);
  const log: PayrollFinalizationLog = {
    id: crypto.randomUUID(),
    organization_id: organizationId,
    run_id: runId,
    snapshot_id: snapshot.id,
    validation_json: JSON.stringify({ ok: true, issues: [] }),
    actor_id: actorId,
    created_at: stamp(),
  };
  await insertPayrollFinalizationLog(log);
  const updated = await updatePayrollRun(runId, {
    status: "FINALIZED",
    snapshot_id: snapshot.id,
    finalized_at: stamp(),
    updated_by: actorId,
  });
  await recordApprovalStep({
    organizationId,
    run,
    action: "FINALIZE",
    previous: run.status,
    next: "FINALIZED",
    actorId,
    actorRole,
  });
  await emitSafe({
    organizationId,
    eventType: "payroll.run.finalized",
    entityType: "payroll_run",
    entityId: runId,
    actorId,
    payload: { period: run.period, status: "FINALIZED", href: "/payroll/runs" },
    idempotencyKey: `payroll.run.finalized:${runId}`,
  });
  return updated;
}

function netBeforeStatutory(item: PayrollItem) {
  return roundMoney(item.earnings + item.variable_earnings + item.reimbursements + item.claims - item.deductions);
}

export async function createPayrollAdjustment(input: {
  organizationId: string;
  runId: string;
  itemId: string;
  kind: "EARNING" | "DEDUCTION";
  name: string;
  amount: number;
  reason: string;
  actorId: string | null;
}) {
  const run = await getPayrollRun(input.organizationId, input.runId);
  if (!run) throw new Error("Payroll run not found.");
  if (isPayrollImmutable(run.status) && run.status !== "FINALIZED" && run.status !== "LOCKED") {
    assertMutable(run.status);
  }
  if (run.status === "PROCESSED" || run.status === "PAID") {
    throw new Error("Processed payroll cannot be adjusted in place. Create an adjustment run.");
  }
  if (!input.reason.trim()) throw new Error("A reason is required.");
  const item = await getPayrollItem(input.organizationId, input.itemId);
  if (!item) throw new Error("Payroll item not found.");
  const amount = roundMoney(Math.abs(input.amount));
  if (amount <= 0) throw new Error("Adjustment amount must be greater than zero.");
  const line: PayrollLine = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    run_id: run.id,
    item_id: item.id,
    employee_id: item.employee_id,
    kind: "ADJUSTMENT",
    code: input.kind === "EARNING" ? "ADJ_EARN" : "ADJ_DED",
    name: input.name,
    amount,
    taxable: input.kind === "EARNING",
    reference_id: null,
    notes: input.reason,
    sort_order: 70,
    created_at: stamp(),
  };
  await insertPayrollLine(line);
  const nextEarnings = input.kind === "EARNING" ? roundMoney(item.earnings + amount) : item.earnings;
  const nextDeductions = input.kind === "DEDUCTION" ? roundMoney(item.deductions + amount) : item.deductions;
  const nextNet = roundMoney(
    nextEarnings + item.variable_earnings + item.reimbursements + item.claims - nextDeductions - item.statutory_total
  );
  await updatePayrollItem(item.id, {
    earnings: nextEarnings,
    deductions: nextDeductions,
    net_pay: nextNet,
    updated_at: stamp(),
  });
  const row: PayrollAdjustment = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    run_id: run.id,
    item_id: item.id,
    employee_id: item.employee_id,
    kind: input.kind,
    code: line.code,
    name: input.name,
    amount,
    reason: input.reason,
    status: "POSTED",
    posted_line_id: line.id,
    created_by: input.actorId,
    posted_at: stamp(),
    reversed_at: null,
    created_at: stamp(),
    updated_at: stamp(),
  };
  await insertPayrollAdjustment(row);
  const items = await listPayrollItems(input.organizationId, run.id);
  await updatePayrollRun(run.id, { ...totalsFromItems(items), updated_by: input.actorId });
  return row;
}

function payslipSectionsFromLines(lines: PayrollLine[]) {
  const earnings = lines.filter((item) => item.kind === "EARNING");
  const reimbursements = lines.filter((item) => item.kind === "REIMBURSEMENT" || item.kind === "CLAIM");
  const deductions = lines.filter((item) => item.kind === "DEDUCTION" || item.kind === "LOAN" || item.kind === "ADJUSTMENT");
  const statutory = lines.filter((item) => item.kind === "STATUTORY");
  const employer = lines.filter((item) => item.kind === "EMPLOYER");
  return { earnings, reimbursements, deductions, statutory, employer };
}

export async function generatePayslipsForRun(
  organizationId: string,
  runId: string,
  actorId: string | null
) {
  const run = await getPayrollRun(organizationId, runId);
  if (!run) throw new Error("Payroll run not found.");
  if (run.status !== "FINALIZED" && run.status !== "LOCKED" && run.status !== "PROCESSED" && run.status !== "PAID") {
    throw new Error("Payslips can be generated only after finalization.");
  }
  const org = await loadOrganization(organizationId);
  const catalog = await loadOrgCatalog(organizationId);
  const [items, lines, existing, settingsRow] = await Promise.all([
    listPayrollItems(organizationId, runId),
    listPayrollLines(organizationId, runId),
    listPayslips(organizationId, runId),
    getOrgStatutorySettings(organizationId),
  ]);
  const showEmployer = settingsRow?.show_employer_on_payslip !== false;
  const included = items.filter((item) => item.status === "INCLUDED");
  const now = stamp();
  const meta = payslipPeriodMeta(run.period);
  const prefix = orgPayslipPrefix(org?.display_name || org?.name || "BSB");
  const address = [org?.address_line1, org?.address_line2, org?.city, org?.state, org?.pin].filter(Boolean).join(", ");
  const nextSlips: Payslip[] = [];

  for (const item of included) {
    const found = existing.find((row) => row.item_id === item.id);
    const sequence = found?.payslip_number
      ? 0
      : await nextPayslipSequence(organizationId, meta.fiscalYear, meta.monthCode);
    const number = found?.payslip_number || formatPayslipNumber({
      prefix,
      fiscalYear: meta.fiscalYear,
      monthCode: meta.monthCode,
      sequence,
    });
    const slip: Payslip = found
      ? {
          ...found,
          snapshot_id: run.snapshot_id,
          generated_at: found.generated_at ?? now,
          generated_by: found.generated_by ?? actorId,
          regenerated_at: found.generated_at ? now : null,
          status: found.status === "VOID" ? "VOID" : "ISSUED",
          issued_at: found.issued_at ?? now,
          updated_at: now,
        }
      : {
          id: crypto.randomUUID(),
          organization_id: organizationId,
          run_id: runId,
          item_id: item.id,
          employee_id: item.employee_id,
          period: run.period,
          status: "ISSUED",
          payslip_number: number,
          document_path: null,
          snapshot_id: run.snapshot_id,
          generated_at: now,
          generated_by: actorId,
          regenerated_at: null,
          issued_at: now,
          voided_at: null,
          created_at: now,
          updated_at: now,
        };
    if (!slip.payslip_number) slip.payslip_number = number;
    const employee = catalog.employees.find((row) => row.id === item.employee_id);
    const itemLines = lines.filter((line) => line.item_id === item.id);
    const sections = payslipSectionsFromLines(itemLines);
    const pdfRows: PayslipLineItem[] = [];
    let sort = 10;
    for (const line of sections.earnings) {
      pdfRows.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        payslip_id: slip.id,
        kind: line.kind,
        code: line.code,
        name: line.name,
        amount: line.amount,
        section: "EARNING",
        sort_order: sort,
        created_at: now,
      });
      sort += 1;
    }
    for (const line of sections.reimbursements) {
      pdfRows.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        payslip_id: slip.id,
        kind: line.kind,
        code: line.code,
        name: line.name,
        amount: line.amount,
        section: "REIMBURSEMENT",
        sort_order: sort,
        created_at: now,
      });
      sort += 1;
    }
    for (const line of sections.deductions) {
      pdfRows.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        payslip_id: slip.id,
        kind: line.kind,
        code: line.code,
        name: line.name,
        amount: line.amount,
        section: "DEDUCTION",
        sort_order: sort,
        created_at: now,
      });
      sort += 1;
    }
    for (const line of sections.statutory) {
      pdfRows.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        payslip_id: slip.id,
        kind: line.kind,
        code: line.code,
        name: line.name,
        amount: line.amount,
        section: "STATUTORY",
        sort_order: sort,
        created_at: now,
      });
      sort += 1;
    }
    const employerLines = showEmployer ? sections.employer : [];
    for (const line of employerLines) {
      pdfRows.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        payslip_id: slip.id,
        kind: line.kind,
        code: line.code,
        name: line.name,
        amount: line.amount,
        section: "EMPLOYER",
        sort_order: sort,
        created_at: now,
      });
      sort += 1;
    }
    await replacePayslipLineItems(organizationId, slip.id, pdfRows);
    const pdf = buildPayslipPdf({
      organizationName: org?.display_name || org?.name || "Organization",
      organizationAddress: address || "—",
      payslipNumber: slip.payslip_number,
      employeeName: employee?.display_name ?? "Employee",
      employeeCode: employee?.employee_code ?? "—",
      department: "—",
      designation: "—",
      periodLabel: periodLabel(run.period),
      payDate: run.pay_date || run.period_to,
      workingDays: String(item.working_days),
      paidDays: String(item.paid_days),
      lopDays: String(item.lop_days),
      earnings: sections.earnings.map((line) => ({ name: line.name, amount: String(line.amount) })),
      reimbursements: sections.reimbursements.map((line) => ({ name: line.name, amount: String(line.amount) })),
      deductions: sections.deductions.map((line) => ({ name: line.name, amount: String(line.amount) })),
      statutory: sections.statutory.map((line) => ({ name: line.name, amount: String(line.amount) })),
      employer: employerLines.map((line) => ({ name: line.name, amount: String(line.amount) })),
      gross: String(item.earnings + item.variable_earnings),
      reimbursementTotal: String(item.reimbursements + item.claims),
      deductionTotal: String(item.deductions),
      statutoryTotal: String(item.statutory_total),
      netPay: String(item.net_pay),
      employerCost: showEmployer ? String(item.employer_cost) : undefined,
      generatedAt: now,
    });
    const path = `${organizationId}/${run.period}/${slip.id}.pdf`;
    slip.document_path = path;
    await storePayslipPdf(path, pdf);
    nextSlips.push(slip);
  }

  await replacePayslips(organizationId, runId, nextSlips);
  for (const slip of nextSlips) {
    await emitSafe({
      organizationId,
      eventType: "payslip.generated",
      entityType: "payslip",
      entityId: slip.id,
      actorId,
      payload: {
        employeeId: slip.employee_id,
        period: run.period,
        status: slip.status,
        href: "/my/payslips",
      },
      idempotencyKey: `payslip.generated:${slip.id}`,
    });
  }
  return nextSlips;
}

async function storePayslipPdf(path: string, pdf: Buffer) {
  if (!hasSupabaseConfig() || isDemoMode()) return;
  const admin = createAdminClient();
  if (!admin) return;
  await admin.storage.from("payslips").upload(path, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
}

export async function loadPayslipPdf(organizationId: string, payslip: Payslip) {
  if (!payslip.document_path) return null;
  if (!hasSupabaseConfig() || isDemoMode()) {
    const org = await loadOrganization(organizationId);
    const catalog = await loadOrgCatalog(organizationId);
    const employee = catalog.employees.find((row) => row.id === payslip.employee_id);
    const run = await getPayrollRun(organizationId, payslip.run_id);
    const item = (await listPayrollItems(organizationId, payslip.run_id)).find((row) => row.id === payslip.item_id);
    const [lines, settingsRow] = await Promise.all([
      listPayrollLines(organizationId, payslip.run_id, payslip.item_id),
      getOrgStatutorySettings(organizationId),
    ]);
    if (!run || !item) return null;
    const sections = payslipSectionsFromLines(lines);
    const showEmployerPdf = settingsRow?.show_employer_on_payslip !== false;
    return buildPayslipPdf({
      organizationName: org?.display_name || org?.name || "Organization",
      organizationAddress: [org?.address_line1, org?.city, org?.state].filter(Boolean).join(", ") || "—",
      payslipNumber: payslip.payslip_number || "PENDING",
      employeeName: employee?.display_name ?? "Employee",
      employeeCode: employee?.employee_code ?? "—",
      department: "—",
      designation: "—",
      periodLabel: periodLabel(run.period),
      payDate: run.pay_date || run.period_to,
      workingDays: String(item.working_days),
      paidDays: String(item.paid_days),
      lopDays: String(item.lop_days),
      earnings: sections.earnings.map((line) => ({ name: line.name, amount: String(line.amount) })),
      reimbursements: sections.reimbursements.map((line) => ({ name: line.name, amount: String(line.amount) })),
      deductions: sections.deductions.map((line) => ({ name: line.name, amount: String(line.amount) })),
      statutory: sections.statutory.map((line) => ({ name: line.name, amount: String(line.amount) })),
      employer: showEmployerPdf ? sections.employer.map((line) => ({ name: line.name, amount: String(line.amount) })) : [],
      gross: String(item.earnings + item.variable_earnings),
      reimbursementTotal: String(item.reimbursements + item.claims),
      deductionTotal: String(item.deductions),
      statutoryTotal: String(item.statutory_total),
      netPay: String(item.net_pay),
      employerCost: showEmployerPdf ? String(item.employer_cost) : undefined,
      generatedAt: payslip.generated_at ?? stamp(),
    });
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.storage.from("payslips").download(payslip.document_path);
  if (!data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export { loadBank, loadOrganization, listPayrollRuns, listPayrollItems, listPayrollLines, listPayslips, listComplianceFilings, listStatutoryRules, listPayrollExceptions, listPayrollApprovalHistory, listPayrollAdjustments, getPayrollSnapshot, netBeforeStatutory, isPayrollImmutable };
