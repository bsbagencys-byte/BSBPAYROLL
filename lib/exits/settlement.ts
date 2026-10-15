import { listAttendanceDays } from "@/lib/leave/attendance";
import { listBalances, listEmployment, listHolidays, listLeaveTypes } from "@/lib/leave/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { recordLoanRepayment } from "@/lib/loans/service";
import { listLoanAccounts } from "@/lib/loans/repository";
import { listClaims } from "@/lib/claims/repository";
import { listReimbursements, listVariableEarnings } from "@/lib/salary/repository";
import { getEmployeeSalaryForDate } from "@/lib/salary/service";
import {
  overlapsPeriod,
  periodBounds,
  prorate,
  roundMoney,
  summarizeAttendance,
} from "@/lib/payroll/engine";
import {
  calculateStatutoryBreakdown,
  defaultOrgStatutorySettings,
} from "@/lib/statutory/engine";
import {
  getOrgStatutorySettings,
  listStatutoryRuleVersions,
  listTaxDeclarationItems,
  listTaxDeclarations,
} from "@/lib/statutory/repository";
import { listStatutoryRules } from "@/lib/payroll/repository";
import { getDemoStore } from "@/lib/demo-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { dailyAmount, nextReference, noticeExtra, noticeShortfall, periodFromDate } from "@/lib/exits/engine";
import {
  insertSettlement,
  insertSettlementApproval,
  insertSettlementPayment,
  listClearanceTasks,
  listEmployeeExits,
  listSettlementLines,
  listSettlements,
  replaceSettlementLines,
  updateSettlement,
} from "@/lib/exits/repository";
import { markExitSettled, requiredClearanceOpen } from "@/lib/exits/service";
import type {
  EmployeeStatutory,
  Organization,
  SettlementLineItem,
  SettlementPayment,
} from "@/types";
import type { SettlementLineDirection, SettlementLineKind, SettlementStatus } from "@/lib/constants";

function stamp() {
  return new Date().toISOString();
}

async function loadStatutory(organizationId: string, employeeId: string): Promise<EmployeeStatutory | null> {
  if (!hasSupabaseConfig() || isDemoMode()) {
    return getDemoStore().employeeStatutory.find((item) => item.employee_id === employeeId) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("employee_statutory").select("*").eq("employee_id", employeeId).eq("organization_id", organizationId).maybeSingle();
  return (data as EmployeeStatutory | null) ?? null;
}

function immutable(status: SettlementStatus) {
  return status === "FINALIZED" || status === "PARTIALLY_PAID" || status === "PAID";
}

function line(input: {
  organizationId: string;
  settlementId: string;
  kind: SettlementLineKind;
  direction: SettlementLineDirection;
  code: string;
  name: string;
  amount: number;
  sourceType?: string | null;
  sourceId?: string | null;
  notes?: string | null;
  sortOrder: number;
}): SettlementLineItem {
  return {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    settlement_id: input.settlementId,
    kind: input.kind,
    direction: input.direction,
    code: input.code,
    name: input.name,
    amount: roundMoney(input.amount),
    source_type: input.sourceType ?? null,
    source_id: input.sourceId ?? null,
    notes: input.notes ?? null,
    sort_order: input.sortOrder,
    created_at: stamp(),
  };
}

export async function createSettlement(input: { organizationId: string; actorId: string; exitId: string }) {
  const exits = await listEmployeeExits(input.organizationId);
  const exitRow = exits.find((item) => item.id === input.exitId);
  if (!exitRow) throw new Error("Exit not found.");
  if (exitRow.status !== "SETTLEMENT_PENDING" && exitRow.status !== "CLEARANCE_PENDING" && exitRow.status !== "APPROVED" && exitRow.status !== "IN_NOTICE") {
    throw new Error("Exit is not ready for settlement.");
  }
  const tasks = (await listClearanceTasks(input.organizationId)).filter((item) => item.exit_id === exitRow.id);
  const clearance = requiredClearanceOpen(tasks);
  if (!clearance.complete) throw new Error("Required clearance is incomplete.");
  const existing = (await listSettlements(input.organizationId)).find(
    (item) => item.exit_id === exitRow.id && item.status !== "CANCELLED"
  );
  if (existing) throw new Error("An active settlement already exists for this exit.");
  const period = periodFromDate(exitRow.last_working_date);
  const bounds = periodBounds(period);
  const now = stamp();
  const settlements = await listSettlements(input.organizationId);
  return insertSettlement({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    exit_id: exitRow.id,
    employee_id: exitRow.employee_id,
    reference_number: nextReference("FF-", settlements.map((item) => item.reference_number)),
    period,
    period_from: bounds.from,
    period_to: exitRow.last_working_date,
    last_working_date: exitRow.last_working_date,
    working_days: 0,
    paid_days: 0,
    lop_days: 0,
    earnings_total: 0,
    reimbursement_total: 0,
    encashment_total: 0,
    recovery_total: 0,
    deduction_total: 0,
    statutory_employee_total: 0,
    statutory_employer_total: 0,
    adjustment_total: 0,
    gross_payable: 0,
    net_payable: 0,
    paid_amount: 0,
    status: "DRAFT",
    exceptions_json: null,
    snapshot_json: null,
    document_path: null,
    calculated_at: null,
    reviewed_at: null,
    approved_at: null,
    finalized_at: null,
    cancelled_at: null,
    cancel_reason: null,
    created_by: input.actorId,
    updated_by: input.actorId,
    created_at: now,
    updated_at: now,
  });
}

export async function calculateSettlement(input: {
  organizationId: string;
  organization: Organization;
  settlementId: string;
  actorId: string;
}) {
  const settlements = await listSettlements(input.organizationId);
  const settlement = settlements.find((item) => item.id === input.settlementId);
  if (!settlement) throw new Error("Settlement not found.");
  if (immutable(settlement.status) || settlement.status === "CANCELLED") {
    throw new Error("This settlement cannot be recalculated.");
  }
  const exits = await listEmployeeExits(input.organizationId);
  const exitRow = exits.find((item) => item.id === settlement.exit_id);
  if (!exitRow) throw new Error("Exit not found.");
  const catalog = await loadOrgCatalog(input.organizationId);
  const employee = catalog.employees.find((item) => item.id === settlement.employee_id);
  if (!employee) throw new Error("Employee not found.");
  const employment = (await listEmployment(input.organizationId)).find((item) => item.employee_id === employee.id);
  const lwd = exitRow.last_working_date;
  const period = periodFromDate(lwd);
  const bounds = periodBounds(period);
  const periodFrom = bounds.from;
  const warnings: string[] = [];

  const [holidays, days, snapshot, variables, reimbursements, claims, loanAccounts, leaveTypes, balances, versions, settingsRow, declarations, declarationItems, statutory, rules] =
    await Promise.all([
      listHolidays(input.organizationId),
      listAttendanceDays(input.organizationId, periodFrom, lwd),
      getEmployeeSalaryForDate(input.organizationId, employee.id, lwd),
      listVariableEarnings(input.organizationId),
      listReimbursements(input.organizationId),
      listClaims(input.organizationId),
      listLoanAccounts(input.organizationId),
      listLeaveTypes(input.organizationId),
      listBalances(input.organizationId),
      listStatutoryRuleVersions(input.organizationId),
      getOrgStatutorySettings(input.organizationId),
      listTaxDeclarations(input.organizationId),
      listTaxDeclarationItems(input.organizationId),
      loadStatutory(input.organizationId, employee.id),
      listStatutoryRules(input.organizationId),
    ]);

  if (!snapshot) warnings.push("No salary assignment covering the last working date.");
  const attendance = summarizeAttendance({
    from: periodFrom,
    to: lwd,
    weeklyOff: input.organization.weekly_off,
    holidays,
    days: days.filter((item) => item.employee_id === employee.id),
    joiningDate: employment?.joining_date ?? null,
  });
  const lines: SettlementLineItem[] = [];
  let sort = 10;
  let earnings = 0;
  if (snapshot) {
    for (const item of snapshot.lines.filter((row) => row.componentType === "EARNING" && !row.variable)) {
      const amount = prorate(item.amount, attendance.paidDays, attendance.workingDays || 1);
      if (amount === 0) continue;
      lines.push(
        line({
          organizationId: input.organizationId,
          settlementId: settlement.id,
          kind: "UNPAID_SALARY",
          direction: "EARNING",
          code: item.code,
          name: item.name,
          amount,
          sourceType: "SALARY",
          sourceId: snapshot.assignmentId,
          notes: `Prorated ${attendance.paidDays}/${attendance.workingDays} days through ${lwd}`,
          sortOrder: sort++,
        })
      );
      earnings += amount;
    }
  }

  for (const item of variables.filter(
    (row) =>
      row.employee_id === employee.id &&
      row.status === "APPROVED" &&
      overlapsPeriod(row.period_from, row.period_to, periodFrom, lwd)
  )) {
    lines.push(
      line({
        organizationId: input.organizationId,
        settlementId: settlement.id,
        kind: item.source === "BONUS" ? "BONUS" : "VARIABLE_EARNING",
        direction: "EARNING",
        code: "VAR",
        name: item.reference || "Variable earning",
        amount: item.amount,
        sourceType: "VARIABLE",
        sourceId: item.id,
        notes: item.notes,
        sortOrder: sort++,
      })
    );
    earnings += item.amount;
  }

  let reimbursementsTotal = 0;
  for (const item of reimbursements.filter(
    (row) =>
      row.employee_id === employee.id &&
      row.status === "APPROVED" &&
      row.include_in_payroll &&
      row.entry_date >= periodFrom &&
      row.entry_date <= lwd
  )) {
    lines.push(
      line({
        organizationId: input.organizationId,
        settlementId: settlement.id,
        kind: "REIMBURSEMENT",
        direction: "EARNING",
        code: "REIMB",
        name: item.description || "Reimbursement",
        amount: item.amount,
        sourceType: "REIMBURSEMENT",
        sourceId: item.id,
        sortOrder: sort++,
      })
    );
    reimbursementsTotal += item.amount;
  }
  for (const item of claims.filter(
    (row) =>
      row.employee_id === employee.id &&
      row.status === "APPROVED" &&
      row.include_in_payroll &&
      !["INCLUDED_IN_PAYROLL", "PAID"].includes(row.status)
  )) {
    const amount = item.approved_amount ?? item.submitted_amount;
    lines.push(
      line({
        organizationId: input.organizationId,
        settlementId: settlement.id,
        kind: "REIMBURSEMENT",
        direction: "EARNING",
        code: "CLAIM",
        name: "Approved claim",
        amount,
        sourceType: "CLAIM",
        sourceId: item.id,
        sortOrder: sort++,
      })
    );
    reimbursementsTotal += amount;
  }

  let encashment = 0;
  const basic = snapshot?.lines.find((item) => item.code.toUpperCase() === "BASIC")?.amount ?? 0;
  const daily = dailyAmount(basic, bounds.daysInMonth);
  if (!basic) warnings.push("Basic pay missing; leave encashment left at 0.");
  for (const type of leaveTypes.filter((item) => item.encashment_allowed)) {
    const balance = balances.find((item) => item.employee_id === employee.id && item.leave_type_id === type.id);
    const available = balance?.available ?? 0;
    if (available <= 0) continue;
    const amount = roundMoney(available * daily);
    lines.push(
      line({
        organizationId: input.organizationId,
        settlementId: settlement.id,
        kind: "LEAVE_ENCASHMENT",
        direction: "EARNING",
        code: type.code,
        name: `${type.name} encashment`,
        amount,
        sourceType: "LEAVE",
        sourceId: type.id,
        notes: `${available} days @ ${daily}/day of basic`,
        sortOrder: sort++,
      })
    );
    encashment += amount;
  }

  let recoveries = 0;
  const shortfall = noticeShortfall(exitRow.notice_period_days, exitRow.notice_served_days);
  const extra = noticeExtra(exitRow.notice_period_days, exitRow.notice_served_days);
  if (shortfall > 0) {
    const amount = roundMoney(shortfall * daily);
    lines.push(
      line({
        organizationId: input.organizationId,
        settlementId: settlement.id,
        kind: "NOTICE_RECOVERY",
        direction: "DEDUCTION",
        code: "NOTICE_REC",
        name: "Notice recovery",
        amount,
        sourceType: "EXIT",
        sourceId: exitRow.id,
        notes: `${shortfall} unserved notice days`,
        sortOrder: sort++,
      })
    );
    recoveries += amount;
  } else if (extra > 0 && exitRow.exit_type === "TERMINATION") {
    const amount = roundMoney(extra * daily);
    lines.push(
      line({
        organizationId: input.organizationId,
        settlementId: settlement.id,
        kind: "NOTICE_PAY",
        direction: "EARNING",
        code: "NOTICE_PAY",
        name: "Notice pay",
        amount,
        sourceType: "EXIT",
        sourceId: exitRow.id,
        notes: `${extra} extra notice days`,
        sortOrder: sort++,
      })
    );
    earnings += amount;
  }

  let deductions = 0;
  for (const account of loanAccounts.filter((item) => item.employee_id === employee.id && item.status === "ACTIVE")) {
    const outstanding = roundMoney(account.outstanding_principal + account.outstanding_interest);
    if (outstanding <= 0) continue;
    lines.push(
      line({
        organizationId: input.organizationId,
        settlementId: settlement.id,
        kind: "LOAN_RECOVERY",
        direction: "DEDUCTION",
        code: "LOAN",
        name: "Outstanding loan / advance",
        amount: outstanding,
        sourceType: "LOAN",
        sourceId: account.id,
        notes: `Principal ${account.outstanding_principal} + interest ${account.outstanding_interest}`,
        sortOrder: sort++,
      })
    );
    deductions += outstanding;
  }

  const settings = settingsRow ?? defaultOrgStatutorySettings(input.organizationId, stamp());
  const declaration = declarations.find((item) => item.employee_id === employee.id) ?? null;
  const breakdown = snapshot
    ? calculateStatutoryBreakdown({
        snapshot,
        proratedEarnings: earnings,
        taxableEarnings: earnings,
        statutory,
        legacyRules: rules,
        versions,
        settings,
        onDate: lwd,
        declaration,
        declarationItems: declarationItems.filter((item) => item.declaration_id === declaration?.id),
      })
    : null;
  let statutoryEmployee = 0;
  let statutoryEmployer = 0;
  if (breakdown) {
    warnings.push(...breakdown.warnings);
    const addStat = (code: string, name: string, amount: number, employer = false) => {
      if (amount <= 0) return;
      lines.push(
        line({
          organizationId: input.organizationId,
          settlementId: settlement.id,
          kind: employer ? "EMPLOYER_STATUTORY" : "STATUTORY",
          direction: employer ? "EMPLOYER" : "DEDUCTION",
          code,
          name,
          amount,
          sourceType: "STATUTORY",
          notes: breakdown.ruleVersions.map((item) => `${item.head}:${item.versionCode}`).join(", ") || null,
          sortOrder: sort++,
        })
      );
      if (employer) statutoryEmployer += amount;
      else statutoryEmployee += amount;
    };
    addStat("PF", "Provident Fund", breakdown.pfEmployee);
    addStat("ESI", "ESI", breakdown.esiEmployee);
    addStat("PT", "Professional tax", breakdown.ptAmount);
    addStat("TDS", "TDS", breakdown.tdsAmount);
    addStat("LWF", "Labour welfare fund", breakdown.lwfEmployee);
    addStat("PF_ER", "Employer PF", breakdown.pfEmployer, true);
    addStat("ESI_ER", "Employer ESI", breakdown.esiEmployer, true);
    addStat("LWF_ER", "Employer LWF", breakdown.lwfEmployer, true);
  }

  const existingAdjustments = (await listSettlementLines(input.organizationId)).filter(
    (item) => item.settlement_id === settlement.id && item.kind === "ADJUSTMENT"
  );
  let adjustmentTotal = 0;
  for (const item of existingAdjustments) {
    lines.push({ ...item, sort_order: sort++ });
    adjustmentTotal += item.direction === "DEDUCTION" ? -item.amount : item.amount;
  }

  const gross = roundMoney(earnings + reimbursementsTotal + encashment);
  const net = roundMoney(gross + adjustmentTotal - recoveries - deductions - statutoryEmployee);
  if (net < 0) warnings.push("Net payable is negative. Review recoveries before approval.");
  if (!exitRow.last_working_date) warnings.push("Last working date is missing.");

  await replaceSettlementLines(input.organizationId, settlement.id, lines);
  const status: SettlementStatus = warnings.length ? "HAS_EXCEPTIONS" : "CALCULATED";
  const updated = await updateSettlement(settlement.id, {
    period,
    period_from: periodFrom,
    period_to: lwd,
    last_working_date: lwd,
    working_days: attendance.workingDays,
    paid_days: attendance.paidDays,
    lop_days: attendance.lopDays,
    earnings_total: roundMoney(earnings),
    reimbursement_total: roundMoney(reimbursementsTotal),
    encashment_total: roundMoney(encashment),
    recovery_total: roundMoney(recoveries),
    deduction_total: roundMoney(deductions),
    statutory_employee_total: roundMoney(statutoryEmployee),
    statutory_employer_total: roundMoney(statutoryEmployer),
    adjustment_total: roundMoney(adjustmentTotal),
    gross_payable: gross,
    net_payable: net,
    status,
    exceptions_json: JSON.stringify(warnings),
    calculated_at: stamp(),
    updated_by: input.actorId,
  });
  if (!updated) throw new Error("Settlement not found.");
  return updated;
}

export async function submitSettlementReview(organizationId: string, settlementId: string, actorId: string) {
  const settlement = (await listSettlements(organizationId)).find((item) => item.id === settlementId);
  if (!settlement) throw new Error("Settlement not found.");
  if (settlement.status !== "CALCULATED" && settlement.status !== "HAS_EXCEPTIONS") {
    throw new Error("Calculate the settlement before review.");
  }
  return updateSettlement(settlementId, { status: "UNDER_REVIEW", reviewed_at: stamp(), updated_by: actorId });
}

export async function decideSettlement(input: {
  organizationId: string;
  settlementId: string;
  actorId: string;
  decision: "APPROVED" | "REJECTED" | "RETURNED";
  reason?: string;
}) {
  const settlement = (await listSettlements(input.organizationId)).find((item) => item.id === input.settlementId);
  if (!settlement) throw new Error("Settlement not found.");
  if (settlement.status !== "UNDER_REVIEW" && settlement.status !== "CALCULATED" && settlement.status !== "HAS_EXCEPTIONS") {
    throw new Error("Settlement is not awaiting a decision.");
  }
  await insertSettlementApproval({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    settlement_id: input.settlementId,
    step: input.decision === "APPROVED" ? "APPROVAL" : "REJECT",
    decision: input.decision,
    reason: input.reason || null,
    actor_id: input.actorId,
    created_at: stamp(),
  });
  if (input.decision === "APPROVED") {
    return updateSettlement(input.settlementId, { status: "APPROVED", approved_at: stamp(), updated_by: input.actorId });
  }
  return updateSettlement(input.settlementId, {
    status: "DRAFT",
    cancel_reason: input.reason || "Returned for correction",
    updated_by: input.actorId,
  });
}

export async function finalizeSettlement(input: { organizationId: string; settlementId: string; actorId: string }) {
  const settlement = (await listSettlements(input.organizationId)).find((item) => item.id === input.settlementId);
  if (!settlement) throw new Error("Settlement not found.");
  if (settlement.status !== "APPROVED") throw new Error("Approve the settlement before finalizing.");
  const lines = (await listSettlementLines(input.organizationId)).filter((item) => item.settlement_id === settlement.id);
  const snapshot = JSON.stringify({ settlement, lines });
  const updated = await updateSettlement(input.settlementId, {
    status: "FINALIZED",
    snapshot_json: snapshot,
    document_path: `${input.organizationId}/${settlement.id}.pdf`,
    finalized_at: stamp(),
    updated_by: input.actorId,
  });
  await insertSettlementApproval({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    settlement_id: input.settlementId,
    step: "FINALIZE",
    decision: "APPROVED",
    reason: null,
    actor_id: input.actorId,
    created_at: stamp(),
  });
  return updated;
}

export async function addSettlementAdjustment(input: {
  organizationId: string;
  settlementId: string;
  actorId: string;
  kind: SettlementLineKind;
  direction: SettlementLineDirection;
  name: string;
  amount: number;
  notes: string;
}) {
  const settlement = (await listSettlements(input.organizationId)).find((item) => item.id === input.settlementId);
  if (!settlement) throw new Error("Settlement not found.");
  if (immutable(settlement.status)) throw new Error("Finalized settlements cannot be silently edited. Record an auditable adjustment on a draft copy.");
  if (settlement.status === "CANCELLED") throw new Error("Cancelled settlements cannot be adjusted.");
  const rows = (await listSettlementLines(input.organizationId)).filter((item) => item.settlement_id === settlement.id);
  rows.push(
    line({
      organizationId: input.organizationId,
      settlementId: settlement.id,
      kind: "ADJUSTMENT",
      direction: input.direction,
      code: "ADJ",
      name: input.name,
      amount: input.amount,
      notes: input.notes,
      sortOrder: rows.length + 1,
    })
  );
  await replaceSettlementLines(input.organizationId, settlement.id, rows);
  await insertSettlementApproval({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    settlement_id: settlement.id,
    step: "ADJUST",
    decision: "APPROVED",
    reason: input.notes,
    actor_id: input.actorId,
    created_at: stamp(),
  });
  const signed = input.direction === "DEDUCTION" ? -input.amount : input.amount;
  return updateSettlement(settlement.id, {
    adjustment_total: roundMoney(settlement.adjustment_total + signed),
    net_payable: roundMoney(settlement.net_payable + signed),
    status: settlement.status === "APPROVED" ? "UNDER_REVIEW" : settlement.status,
    updated_by: input.actorId,
  });
}

export async function recordSettlementPayment(input: {
  organizationId: string;
  settlementId: string;
  actorId: string;
  amount: number;
  paymentDate: string;
  method: SettlementPayment["method"];
  reference?: string;
  notes?: string;
}) {
  const settlement = (await listSettlements(input.organizationId)).find((item) => item.id === input.settlementId);
  if (!settlement) throw new Error("Settlement not found.");
  if (settlement.status !== "FINALIZED" && settlement.status !== "PARTIALLY_PAID") {
    throw new Error("Finalize the settlement before recording payment.");
  }
  if (input.amount <= 0) throw new Error("Payment amount must be greater than zero.");
  const remaining = roundMoney(Math.abs(settlement.net_payable) - settlement.paid_amount);
  if (input.amount - remaining > 0.01) throw new Error("Payment exceeds the outstanding amount.");
  await insertSettlementPayment({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    settlement_id: settlement.id,
    amount: roundMoney(input.amount),
    payment_date: input.paymentDate,
    method: input.method,
    reference: input.reference || null,
    notes: input.notes || null,
    created_by: input.actorId,
    created_at: stamp(),
  });
  const paid = roundMoney(settlement.paid_amount + input.amount);
  const fullyPaid = paid + 0.01 >= Math.abs(settlement.net_payable);
  const updated = await updateSettlement(settlement.id, {
    paid_amount: paid,
    status: fullyPaid ? "PAID" : "PARTIALLY_PAID",
    updated_by: input.actorId,
  });
  if (fullyPaid) {
    await markExitSettled(input.organizationId, settlement.exit_id, input.actorId);
    const loanLines = (await listSettlementLines(input.organizationId)).filter(
      (item) => item.settlement_id === settlement.id && item.kind === "LOAN_RECOVERY" && item.source_id
    );
    for (const item of loanLines) {
      try {
        await recordLoanRepayment({
          organizationId: input.organizationId,
          actorId: input.actorId,
          accountId: item.source_id as string,
          amount: item.amount,
          paymentDate: input.paymentDate,
          paymentMethod: "BANK",
          source: "PAYROLL",
          payrollPeriod: settlement.period,
          notes: `Full & final ${settlement.reference_number}`,
        });
      } catch {
        void 0;
      }
    }
  }
  return updated;
}

export async function cancelSettlement(input: { organizationId: string; settlementId: string; actorId: string; reason: string }) {
  const settlement = (await listSettlements(input.organizationId)).find((item) => item.id === input.settlementId);
  if (!settlement) throw new Error("Settlement not found.");
  if (settlement.status === "PAID") throw new Error("Paid settlements cannot be cancelled.");
  return updateSettlement(input.settlementId, {
    status: "CANCELLED",
    cancelled_at: stamp(),
    cancel_reason: input.reason,
    updated_by: input.actorId,
  });
}
