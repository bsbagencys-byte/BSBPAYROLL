import { addMonths, installmentStatusForDate, matchLoanPolicy, periodKey, quoteLoan, roundMoney, validateLoanApplication } from "@/lib/loans/engine";
import { listEmployment } from "@/lib/leave/repository";
import {
  insertLoanAccount,
  insertLoanAdjustment,
  insertLoanApplication,
  insertLoanApproval,
  insertLoanLedger,
  insertLoanPolicy,
  insertLoanRepayment,
  insertLoanScheduleItem,
  insertLoanType,
  listLoanAccounts,
  listLoanApplications,
  listLoanPolicies,
  listLoanSchedule,
  listLoanTypes,
  updateLoanAccount,
  updateLoanApplication,
  updateLoanPolicy,
  updateLoanScheduleItem,
  updateLoanType,
} from "@/lib/loans/repository";
import type {
  EmployeeEmployment,
  LoanAccount,
  LoanAdjustment,
  LoanApplication,
  LoanPaymentMethod,
  LoanPolicy,
  LoanRepayment,
  LoanType,
  PayrollLoanDeduction,
} from "@/types";

function stamp() {
  return new Date().toISOString();
}

function nextReference(existing: LoanApplication[]) {
  const numbers = existing
    .map((item) => Number((item.reference_number ?? "").replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const next = (numbers.length ? Math.max(...numbers) : 2000) + 1;
  return `LN-${next}`;
}

export async function saveLoanTypeRow(row: LoanType, existing: LoanType[]) {
  const code = row.code.toUpperCase();
  const duplicate = existing.find((item) => item.code.toUpperCase() === code && item.id !== row.id);
  if (duplicate) throw new Error("A loan type with this code already exists.");
  const found = existing.find((item) => item.id === row.id);
  if (found) return updateLoanType(row.id, { ...row, code, updated_at: stamp() });
  return insertLoanType({ ...row, code });
}

export async function saveLoanPolicyRow(row: LoanPolicy, existing: LoanPolicy[]) {
  const found = existing.find((item) => item.id === row.id);
  if (found) return updateLoanPolicy(row.id, { ...row, updated_at: stamp() });
  return insertLoanPolicy(row);
}

async function loadEmploymentRow(organizationId: string, employeeId: string): Promise<EmployeeEmployment | null> {
  const rows = await listEmployment(organizationId);
  return rows.find((item) => item.employee_id === employeeId) ?? null;
}

export async function previewLoan(input: {
  organizationId: string;
  employeeId: string;
  loanTypeId: string;
  requestedAmount: number;
  tenureMonths: number;
  interestRate?: number | null;
  requestedDate: string;
}) {
  const [types, policies, accounts, applications] = await Promise.all([
    listLoanTypes(input.organizationId),
    listLoanPolicies(input.organizationId),
    listLoanAccounts(input.organizationId),
    listLoanApplications(input.organizationId),
  ]);
  const loanType = types.find((item) => item.id === input.loanTypeId) ?? null;
  const employment = await loadEmploymentRow(input.organizationId, input.employeeId);
  const policy = loanType
    ? matchLoanPolicy({
        policies,
        loanTypeId: loanType.id,
        employment,
        employeeId: input.employeeId,
        onDate: input.requestedDate,
      })
    : null;
  const quote = quoteLoan({
    principal: input.requestedAmount,
    tenureMonths: input.tenureMonths,
    interestMethod: loanType?.interest_method ?? "NONE",
    interestRate: input.interestRate ?? loanType?.interest_rate ?? null,
    startDate: input.requestedDate,
  });
  const validation = validateLoanApplication({
    loanType,
    policy,
    employment,
    requestedAmount: input.requestedAmount,
    tenureMonths: input.tenureMonths,
    onDate: input.requestedDate,
    activeAccounts: accounts.filter(
      (item) => item.employee_id === input.employeeId && item.loan_type_id === input.loanTypeId && (item.status === "ACTIVE" || item.status === "PAUSED")
    ),
    openApplications: applications.filter(
      (item) =>
        item.employee_id === input.employeeId &&
        item.loan_type_id === input.loanTypeId &&
        ["DRAFT", "SUBMITTED", "PENDING_APPROVAL", "APPROVED"].includes(item.status)
    ),
  });
  return { loanType, policy, quote, validation, employment };
}

export async function createLoanApplication(input: {
  id?: string;
  organizationId: string;
  employeeId: string;
  loanTypeId: string;
  requestedAmount: number;
  tenureMonths: number;
  interestRate?: number | null;
  purpose?: string | null;
  requestedDate: string;
  notes?: string | null;
  autoDeductPayroll?: boolean;
  actorId: string | null;
  submit?: boolean;
}) {
  const preview = await previewLoan(input);
  if (!preview.loanType) throw new Error("Loan type not found.");
  const applications = await listLoanApplications(input.organizationId);
  const existing = input.id ? applications.find((item) => item.id === input.id) : null;
  if (existing && !["DRAFT", "SUBMITTED"].includes(existing.status)) {
    throw new Error("Only draft or submitted applications can be edited.");
  }
  const quote = preview.quote;
  const workflow = preview.loanType.workflow_mode;
  const shouldSubmit = Boolean(input.submit);
  if (shouldSubmit && !preview.validation.ok) {
    const message = preview.validation.blocking[0]?.message ?? "Application failed policy checks.";
    if (!existing) {
      await persistApplication({
        ...input,
        preview,
        quote,
        status: "DRAFT",
        currentStep: null,
        reference: nextReference(applications),
      });
    }
    throw new Error(message);
  }
  const status = shouldSubmit ? "SUBMITTED" : "DRAFT";
  const currentStep = shouldSubmit ? (workflow === "TWO_STEP" ? "MANAGER" : "SINGLE") : null;
  return persistApplication({
    ...input,
    preview,
    quote,
    status,
    currentStep,
    reference: existing?.reference_number ?? nextReference(applications),
    existing,
  });
}

async function persistApplication(input: {
  id?: string;
  organizationId: string;
  employeeId: string;
  loanTypeId: string;
  requestedAmount: number;
  tenureMonths: number;
  interestRate?: number | null;
  purpose?: string | null;
  requestedDate: string;
  notes?: string | null;
  autoDeductPayroll?: boolean;
  actorId: string | null;
  preview: Awaited<ReturnType<typeof previewLoan>>;
  quote: ReturnType<typeof quoteLoan>;
  status: LoanApplication["status"];
  currentStep: LoanApplication["current_step"];
  reference: string;
  existing?: LoanApplication | null;
}) {
  const now = stamp();
  const row: LoanApplication = {
    id: input.id || input.existing?.id || crypto.randomUUID(),
    organization_id: input.organizationId,
    employee_id: input.employeeId,
    loan_type_id: input.loanTypeId,
    policy_id: input.preview.policy?.id ?? null,
    requested_amount: roundMoney(input.requestedAmount),
    tenure_months: input.tenureMonths,
    interest_method: input.preview.loanType?.interest_method ?? "NONE",
    interest_rate: input.interestRate ?? input.preview.loanType?.interest_rate ?? null,
    processing_fee: input.preview.loanType?.processing_fee ?? null,
    purpose: input.purpose || null,
    requested_date: input.requestedDate,
    notes: input.notes || null,
    principal: input.quote.principal,
    interest_amount: input.quote.interestAmount,
    total_repayment: input.quote.totalRepayment,
    emi_amount: input.quote.emiAmount,
    first_due_date: input.quote.firstDueDate,
    last_due_date: input.quote.lastDueDate,
    approved_amount: input.existing?.approved_amount ?? null,
    approved_tenure_months: input.existing?.approved_tenure_months ?? null,
    status: input.status,
    current_step: input.currentStep,
    auto_deduct_payroll: input.autoDeductPayroll ?? input.preview.loanType?.auto_deduct_payroll ?? true,
    reference_number: input.reference,
    submitted_at: input.status === "SUBMITTED" ? now : input.existing?.submitted_at ?? null,
    created_by: input.existing?.created_by ?? input.actorId,
    updated_by: input.actorId,
    created_at: input.existing?.created_at ?? now,
    updated_at: now,
  };
  if (input.existing) {
    await updateLoanApplication(row.id, row);
    return row;
  }
  return insertLoanApplication(row);
}

export async function submitLoanApplication(organizationId: string, applicationId: string, actorId: string | null) {
  const applications = await listLoanApplications(organizationId);
  const application = applications.find((item) => item.id === applicationId);
  if (!application) throw new Error("Application not found.");
  if (application.status !== "DRAFT") throw new Error("Only drafts can be submitted.");
  const preview = await previewLoan({
    organizationId,
    employeeId: application.employee_id,
    loanTypeId: application.loan_type_id,
    requestedAmount: application.requested_amount,
    tenureMonths: application.tenure_months,
    interestRate: application.interest_rate,
    requestedDate: application.requested_date,
  });
  if (!preview.validation.ok) throw new Error(preview.validation.blocking[0]?.message ?? "Application failed policy checks.");
  const workflow = preview.loanType?.workflow_mode ?? "TWO_STEP";
  return updateLoanApplication(applicationId, {
    status: "SUBMITTED",
    current_step: workflow === "TWO_STEP" ? "MANAGER" : "SINGLE",
    submitted_at: stamp(),
    updated_by: actorId,
  });
}

export async function decideLoanApplication(input: {
  organizationId: string;
  applicationId: string;
  decision: "APPROVED" | "REJECTED";
  amount?: number | null;
  tenureMonths?: number | null;
  reason?: string | null;
  actorId: string | null;
}) {
  const applications = await listLoanApplications(input.organizationId);
  const application = applications.find((item) => item.id === input.applicationId);
  if (!application) throw new Error("Application not found.");
  if (!["SUBMITTED", "PENDING_APPROVAL"].includes(application.status)) {
    throw new Error("This application is not awaiting approval.");
  }
  if (input.decision === "REJECTED") {
    if (!input.reason) throw new Error("Rejection requires a reason.");
    await insertLoanApproval({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      application_id: application.id,
      step: application.current_step ?? "SINGLE",
      decision: "REJECTED",
      amount: null,
      tenure_months: null,
      reason: input.reason,
      actor_id: input.actorId,
      decided_at: stamp(),
      created_at: stamp(),
    });
    return updateLoanApplication(application.id, {
      status: "REJECTED",
      current_step: null,
      notes: input.reason,
      updated_by: input.actorId,
    });
  }

  const approvedAmount = roundMoney(input.amount && input.amount > 0 ? input.amount : application.requested_amount);
  const approvedTenure = input.tenureMonths && input.tenureMonths > 0 ? input.tenureMonths : application.tenure_months;
  const quote = quoteLoan({
    principal: approvedAmount,
    tenureMonths: approvedTenure,
    interestMethod: application.interest_method,
    interestRate: application.interest_rate,
    startDate: application.requested_date,
  });
  await insertLoanApproval({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    application_id: application.id,
    step: application.current_step ?? "SINGLE",
    decision: "APPROVED",
    amount: approvedAmount,
    tenure_months: approvedTenure,
    reason: input.reason || null,
    actor_id: input.actorId,
    decided_at: stamp(),
    created_at: stamp(),
  });

  const types = await listLoanTypes(input.organizationId);
  const loanType = types.find((item) => item.id === application.loan_type_id);
  if (application.current_step === "MANAGER" && loanType?.workflow_mode === "TWO_STEP") {
    return updateLoanApplication(application.id, {
      status: "PENDING_APPROVAL",
      current_step: "FINANCE",
      approved_amount: approvedAmount,
      approved_tenure_months: approvedTenure,
      principal: quote.principal,
      interest_amount: quote.interestAmount,
      total_repayment: quote.totalRepayment,
      emi_amount: quote.emiAmount,
      first_due_date: quote.firstDueDate,
      last_due_date: quote.lastDueDate,
      updated_by: input.actorId,
    });
  }
  return updateLoanApplication(application.id, {
    status: "APPROVED",
    current_step: null,
    approved_amount: approvedAmount,
    approved_tenure_months: approvedTenure,
    principal: quote.principal,
    interest_amount: quote.interestAmount,
    total_repayment: quote.totalRepayment,
    emi_amount: quote.emiAmount,
    first_due_date: quote.firstDueDate,
    last_due_date: quote.lastDueDate,
    updated_by: input.actorId,
  });
}

export async function cancelLoanApplication(organizationId: string, applicationId: string, actorId: string | null) {
  const application = (await listLoanApplications(organizationId)).find((item) => item.id === applicationId);
  if (!application) throw new Error("Application not found.");
  if (application.status === "DISBURSED" || application.status === "APPROVED") {
    throw new Error("Approved or disbursed applications cannot be cancelled here.");
  }
  return updateLoanApplication(applicationId, { status: "CANCELLED", current_step: null, updated_by: actorId });
}

export async function disburseLoan(input: {
  organizationId: string;
  applicationId: string;
  startDate: string;
  notes?: string | null;
  actorId: string | null;
}) {
  const application = (await listLoanApplications(input.organizationId)).find((item) => item.id === input.applicationId);
  if (!application) throw new Error("Application not found.");
  if (application.status !== "APPROVED") throw new Error("Only approved applications can be disbursed.");
  const accounts = await listLoanAccounts(input.organizationId);
  if (accounts.some((item) => item.application_id === application.id)) throw new Error("This loan is already disbursed.");

  const amount = application.approved_amount ?? application.requested_amount;
  const tenure = application.approved_tenure_months ?? application.tenure_months;
  const quote = quoteLoan({
    principal: amount,
    tenureMonths: tenure,
    interestMethod: application.interest_method,
    interestRate: application.interest_rate,
    startDate: input.startDate,
  });
  const now = stamp();
  const account: LoanAccount = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    application_id: application.id,
    employee_id: application.employee_id,
    loan_type_id: application.loan_type_id,
    approved_amount: amount,
    disbursed_amount: amount,
    interest_amount: quote.interestAmount,
    outstanding_principal: quote.principal,
    outstanding_interest: quote.interestAmount,
    emi_amount: quote.emiAmount,
    tenure_months: tenure,
    paid_installments: 0,
    remaining_installments: tenure,
    start_date: input.startDate,
    end_date: quote.lastDueDate,
    next_due_date: quote.firstDueDate,
    auto_deduct_payroll: application.auto_deduct_payroll,
    status: "ACTIVE",
    disbursed_at: now,
    disbursed_by: input.actorId,
    created_by: input.actorId,
    updated_by: input.actorId,
    created_at: now,
    updated_at: now,
  };
  await insertLoanAccount(account);
  for (const item of quote.schedule) {
    await insertLoanScheduleItem({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      account_id: account.id,
      installment_number: item.installmentNumber,
      due_date: item.dueDate,
      principal_amount: item.principal,
      interest_amount: item.interest,
      emi_amount: item.emi,
      paid_amount: 0,
      outstanding_amount: item.emi,
      status: "UPCOMING",
      paid_at: null,
      payroll_period: null,
      created_at: now,
      updated_at: now,
    });
  }
  await insertLoanLedger({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    account_id: account.id,
    entry_type: "DISBURSEMENT",
    before_principal: 0,
    before_interest: 0,
    amount: amount,
    after_principal: quote.principal,
    after_interest: quote.interestAmount,
    source: "DISBURSEMENT",
    reference_id: application.id,
    notes: input.notes || null,
    actor_id: input.actorId,
    created_at: now,
  });
  await updateLoanApplication(application.id, { status: "DISBURSED", current_step: null, updated_by: input.actorId });
  return account;
}

export async function recordLoanRepayment(input: {
  organizationId: string;
  accountId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: LoanPaymentMethod;
  reference?: string | null;
  notes?: string | null;
  actorId: string | null;
  source?: "MANUAL" | "PAYROLL";
  payrollPeriod?: string | null;
}) {
  const account = (await listLoanAccounts(input.organizationId)).find((item) => item.id === input.accountId);
  if (!account) throw new Error("Loan account not found.");
  if (account.status !== "ACTIVE" && account.status !== "PAUSED") throw new Error("Repayments are only allowed on active or paused loans.");
  const amount = roundMoney(input.amount);
  if (amount <= 0) throw new Error("Payment amount must be greater than zero.");

  const schedule = (await listLoanSchedule(input.organizationId, account.id)).filter(
    (item) => item.status !== "PAID" && item.status !== "WAIVED"
  );
  let remaining = amount;
  let principalPaid = 0;
  let interestPaid = 0;
  let lastScheduleId: string | null = null;
  const now = stamp();

  for (const item of schedule) {
    if (remaining <= 0) break;
    const due = roundMoney(item.outstanding_amount);
    const applied = roundMoney(Math.min(due, remaining));
    const interestShare = roundMoney(Math.min(item.interest_amount - Math.max(0, item.paid_amount - item.principal_amount), applied));
    const principalShare = roundMoney(applied - Math.max(0, interestShare));
    const paidAmount = roundMoney(item.paid_amount + applied);
    const outstanding = roundMoney(item.emi_amount - paidAmount);
    const paid = outstanding <= 0;
    await updateLoanScheduleItem(item.id, {
      paid_amount: paidAmount,
      outstanding_amount: Math.max(0, outstanding),
      status: paid ? "PAID" : "PARTIALLY_PAID",
      paid_at: paid ? now : item.paid_at,
      payroll_period: input.payrollPeriod ?? item.payroll_period,
    });
    remaining = roundMoney(remaining - applied);
    principalPaid = roundMoney(principalPaid + Math.max(0, principalShare));
    interestPaid = roundMoney(interestPaid + Math.max(0, interestShare));
    lastScheduleId = item.id;
  }

  if (remaining > 0 && principalPaid + interestPaid === 0) {
    throw new Error("No open installments to apply this payment.");
  }

  const appliedTotal = roundMoney(amount - Math.max(0, remaining));
  const beforePrincipal = account.outstanding_principal;
  const beforeInterest = account.outstanding_interest;
  const afterPrincipal = roundMoney(Math.max(0, beforePrincipal - principalPaid));
  const afterInterest = roundMoney(Math.max(0, beforeInterest - interestPaid));
  const updatedSchedule = await listLoanSchedule(input.organizationId, account.id);
  const paidCount = updatedSchedule.filter((item) => item.status === "PAID" || item.status === "WAIVED").length;
  const open = updatedSchedule.filter((item) => item.status !== "PAID" && item.status !== "WAIVED");
  const completed = afterPrincipal <= 0 && afterInterest <= 0;

  const repayment: LoanRepayment = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    account_id: account.id,
    schedule_id: lastScheduleId,
    payment_date: input.paymentDate,
    amount: appliedTotal,
    principal_amount: principalPaid,
    interest_amount: interestPaid,
    payment_method: input.paymentMethod,
    reference: input.reference || null,
    notes: input.notes || null,
    source: input.source ?? "MANUAL",
    created_by: input.actorId,
    created_at: now,
  };
  await insertLoanRepayment(repayment);
  await insertLoanLedger({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    account_id: account.id,
    entry_type: input.source === "PAYROLL" ? "PAYROLL_DEDUCTION_REFERENCE" : "MANUAL_REPAYMENT",
    before_principal: beforePrincipal,
    before_interest: beforeInterest,
    amount: appliedTotal,
    after_principal: afterPrincipal,
    after_interest: afterInterest,
    source: input.source ?? "MANUAL",
    reference_id: repayment.id,
    notes: input.notes || null,
    actor_id: input.actorId,
    created_at: now,
  });
  if (principalPaid > 0) {
    await insertLoanLedger({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      account_id: account.id,
      entry_type: "PRINCIPAL_REPAYMENT",
      before_principal: beforePrincipal,
      before_interest: beforeInterest,
      amount: principalPaid,
      after_principal: afterPrincipal,
      after_interest: beforeInterest,
      source: input.source ?? "MANUAL",
      reference_id: repayment.id,
      notes: null,
      actor_id: input.actorId,
      created_at: now,
    });
  }
  if (interestPaid > 0) {
    await insertLoanLedger({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      account_id: account.id,
      entry_type: "INTEREST_REPAYMENT",
      before_principal: afterPrincipal,
      before_interest: beforeInterest,
      amount: interestPaid,
      after_principal: afterPrincipal,
      after_interest: afterInterest,
      source: input.source ?? "MANUAL",
      reference_id: repayment.id,
      notes: null,
      actor_id: input.actorId,
      created_at: now,
    });
  }

  await updateLoanAccount(account.id, {
    outstanding_principal: afterPrincipal,
    outstanding_interest: afterInterest,
    paid_installments: paidCount,
    remaining_installments: open.length,
    next_due_date: open[0]?.due_date ?? null,
    status: completed ? "COMPLETED" : account.status,
    updated_by: input.actorId,
  });
  return repayment;
}

export async function adjustLoan(input: {
  organizationId: string;
  accountId: string;
  scheduleId?: string | null;
  kind: LoanAdjustment["kind"];
  amount?: number | null;
  reason: string;
  actorId: string | null;
}) {
  const account = (await listLoanAccounts(input.organizationId)).find((item) => item.id === input.accountId);
  if (!account) throw new Error("Loan account not found.");
  const now = stamp();
  const adjustment: LoanAdjustment = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    account_id: account.id,
    schedule_id: input.scheduleId || null,
    kind: input.kind,
    amount: input.amount ?? null,
    reason: input.reason,
    actor_id: input.actorId,
    created_at: now,
  };
  await insertLoanAdjustment(adjustment);

  if (input.kind === "WRITE_OFF") {
    await insertLoanLedger({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      account_id: account.id,
      entry_type: "WAIVER",
      before_principal: account.outstanding_principal,
      before_interest: account.outstanding_interest,
      amount: roundMoney(account.outstanding_principal + account.outstanding_interest),
      after_principal: 0,
      after_interest: 0,
      source: "WRITE_OFF",
      reference_id: adjustment.id,
      notes: input.reason,
      actor_id: input.actorId,
      created_at: now,
    });
    const schedule = await listLoanSchedule(input.organizationId, account.id);
    for (const item of schedule) {
      if (item.status !== "PAID") {
        await updateLoanScheduleItem(item.id, { status: "WAIVED", outstanding_amount: 0, paid_at: now });
      }
    }
    return updateLoanAccount(account.id, {
      outstanding_principal: 0,
      outstanding_interest: 0,
      remaining_installments: 0,
      next_due_date: null,
      status: "WRITTEN_OFF",
      updated_by: input.actorId,
    });
  }

  if (!input.scheduleId) throw new Error("Installment is required for this adjustment.");
  const item = (await listLoanSchedule(input.organizationId, account.id)).find((row) => row.id === input.scheduleId);
  if (!item) throw new Error("Installment not found.");

  if (input.kind === "WAIVER") {
    await updateLoanScheduleItem(item.id, { status: "WAIVED", outstanding_amount: 0, paid_at: now });
    const afterPrincipal = roundMoney(Math.max(0, account.outstanding_principal - item.principal_amount + Math.min(item.paid_amount, item.principal_amount)));
    const afterInterest = roundMoney(Math.max(0, account.outstanding_interest - item.interest_amount));
    await insertLoanLedger({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      account_id: account.id,
      entry_type: "WAIVER",
      before_principal: account.outstanding_principal,
      before_interest: account.outstanding_interest,
      amount: item.outstanding_amount,
      after_principal: afterPrincipal,
      after_interest: afterInterest,
      source: "WAIVER",
      reference_id: adjustment.id,
      notes: input.reason,
      actor_id: input.actorId,
      created_at: now,
    });
    const schedule = await listLoanSchedule(input.organizationId, account.id);
    const open = schedule.filter((row) => row.status !== "PAID" && row.status !== "WAIVED");
    return updateLoanAccount(account.id, {
      outstanding_principal: afterPrincipal,
      outstanding_interest: afterInterest,
      paid_installments: schedule.filter((row) => row.status === "PAID" || row.status === "WAIVED").length,
      remaining_installments: open.length,
      next_due_date: open[0]?.due_date ?? null,
      status: afterPrincipal <= 0 && afterInterest <= 0 ? "COMPLETED" : account.status,
      updated_by: input.actorId,
    });
  }

  if (input.kind === "DEFER" || input.kind === "SKIP") {
    const nextDate = addMonths(item.due_date, 1);
    await updateLoanScheduleItem(item.id, { status: "DEFERRED", due_date: nextDate });
    return updateLoanAccount(account.id, { next_due_date: nextDate, updated_by: input.actorId });
  }

  return account;
}

export async function refreshInstallmentStatuses(organizationId: string, today: string) {
  const schedule = await listLoanSchedule(organizationId);
  for (const item of schedule) {
    const next = installmentStatusForDate(item, today);
    if (next !== item.status) await updateLoanScheduleItem(item.id, { status: next });
  }
}

export async function getEmployeeLoanDeductions(
  organizationId: string,
  employeeId: string,
  payrollPeriod: string
): Promise<PayrollLoanDeduction[]> {
  const [accounts, types] = await Promise.all([listLoanAccounts(organizationId), listLoanTypes(organizationId)]);
  const active = accounts.filter(
    (item) => item.employee_id === employeeId && item.status === "ACTIVE" && item.auto_deduct_payroll
  );
  const result: PayrollLoanDeduction[] = [];
  for (const account of active) {
    const schedule = await listLoanSchedule(organizationId, account.id);
    const due = schedule.find((item) => {
      if (item.status === "PAID" || item.status === "WAIVED" || item.status === "DEFERRED") return false;
      return periodKey(item.due_date) === payrollPeriod.slice(0, 7) || item.status === "DUE" || item.status === "OVERDUE" || item.status === "PARTIALLY_PAID";
    });
    if (!due) continue;
    const type = types.find((item) => item.id === account.loan_type_id);
    const outstanding = roundMoney(account.outstanding_principal + account.outstanding_interest);
    result.push({
      loanId: account.id,
      employeeId: account.employee_id,
      loanTypeId: account.loan_type_id,
      installmentId: due.id,
      installmentNumber: due.installment_number,
      emiDue: due.outstanding_amount,
      advanceRecovery: type?.category === "SALARY_ADVANCE" || type?.category === "FESTIVAL_ADVANCE" ? due.outstanding_amount : 0,
      outstandingBalance: outstanding,
      autoDeduct: account.auto_deduct_payroll,
      payrollPeriod,
    });
  }
  return result;
}
