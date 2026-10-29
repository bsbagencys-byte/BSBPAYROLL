import { writeAudit } from "@/lib/audit";
import { getDemoStore } from "@/lib/demo-store";
import { emptyBalance } from "@/lib/leave/engine";
import {
  canConfirmImport,
  currentOnboardingStep,
  evaluateOnboarding,
  exportExpiresAt,
  headerIndex,
  historicalPayrollNotes,
  importOutcome,
  isSlaBreached,
  maskSecret,
  nextTicketStatus,
  onboardingComplete,
  persistableStatus,
  rejectNonCsv,
  requiredColumns,
  slaDueAt,
  splitCsv,
  ticketNumber,
  type OnboardingFacts,
} from "@/lib/onboarding/engine";
import {
  getDataExportJob,
  getImportJob,
  getOnboardingProgress,
  getSupportTicket,
  insertOpeningBalance,
  insertSupportMessage,
  listAllSupportTickets,
  listDataExportJobs,
  listImportJobRows,
  listImportJobs,
  listOffboardingRequests,
  listOnboardingSteps,
  listOpenSupportTickets,
  listOpeningBalances,
  listReadyExpiredExports,
  listSupportMessages,
  listSupportTickets,
  nextTicketSequence,
  replaceImportJobRows,
  stamp,
  upsertDataExportJob,
  upsertImportJob,
  upsertOffboardingRequest,
  upsertOnboardingProgress,
  upsertOnboardingStep,
  upsertSupportTicket,
} from "@/lib/onboarding/repository";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { belongsToOrganization } from "@/lib/tenancy";
import { toCsv } from "@/lib/payroll/engine";
import type {
  DataExportKind,
  ImportEntityType,
  ImportRowStatus,
  SupportCategory,
  SupportMessageVisibility,
  SupportPriority,
  SupportTicketStatus,
} from "@/lib/constants";
import type {
  DataExportJob,
  Employee,
  ImportJob,
  ImportJobRow,
  OffboardingRequest,
  OnboardingProgress,
  OpeningBalance,
  SupportTicket,
} from "@/types";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

async function loadFacts(organizationId: string): Promise<OnboardingFacts> {
  if (demoEnabled()) {
    const store = getDemoStore();
    const org = store.org;
    const companyEvidence: string[] = [];
    if (org.name) companyEvidence.push("Name");
    if (org.legal_name) companyEvidence.push("Legal name");
    if (org.pan) companyEvidence.push("PAN");
    if (org.timezone) companyEvidence.push("Timezone");
    const statutory = store.orgStatutorySettings.find((row) => row.organization_id === organizationId);
    return {
      companyComplete: Boolean(org.name && org.legal_name && org.timezone && org.weekly_off),
      companyEvidence,
      branchCount: store.branches.filter((row) => row.organization_id === organizationId).length,
      departmentCount: store.departments.filter((row) => row.organization_id === organizationId).length,
      employeeCount: store.employees.filter((row) => row.organization_id === organizationId).length,
      statutoryConfigured: Boolean(statutory),
      salaryStructureCount: store.salaryStructures.filter((row) => row.organization_id === organizationId).length,
      leaveTypeCount: store.leaveTypes.filter((row) => row.organization_id === organizationId).length,
      biometricDeviceCount: store.biometricDevices.filter((row) => row.organization_id === organizationId).length,
      userCount: store.memberships.filter((row) => row.organization_id === organizationId).length,
      skippedAttendance: Boolean((await getOnboardingProgress(organizationId))?.skipped_attendance),
    };
  }
  const admin = createAdminClient();
  if (!admin) {
    return {
      companyComplete: false,
      companyEvidence: [],
      branchCount: 0,
      departmentCount: 0,
      employeeCount: 0,
      statutoryConfigured: false,
      salaryStructureCount: 0,
      leaveTypeCount: 0,
      biometricDeviceCount: 0,
      userCount: 0,
      skippedAttendance: false,
    };
  }
  const [
    orgRes,
    branches,
    departments,
    employees,
    statutory,
    structures,
    leaveTypes,
    devices,
    users,
    progress,
  ] = await Promise.all([
    admin.from("organizations").select("*").eq("id", organizationId).maybeSingle(),
    admin.from("branches").select("id").eq("organization_id", organizationId),
    admin.from("departments").select("id").eq("organization_id", organizationId),
    admin.from("employees").select("id").eq("organization_id", organizationId),
    admin.from("org_statutory_settings").select("organization_id").eq("organization_id", organizationId).maybeSingle(),
    admin.from("salary_structures").select("id").eq("organization_id", organizationId),
    admin.from("leave_types").select("id").eq("organization_id", organizationId),
    admin.from("biometric_devices").select("id").eq("organization_id", organizationId),
    admin.from("organization_users").select("id").eq("organization_id", organizationId),
    getOnboardingProgress(organizationId),
  ]);
  const org = orgRes.data as { name?: string; legal_name?: string; pan?: string; timezone?: string; weekly_off?: string } | null;
  const companyEvidence: string[] = [];
  if (org?.name) companyEvidence.push("Name");
  if (org?.legal_name) companyEvidence.push("Legal name");
  if (org?.pan) companyEvidence.push("PAN");
  if (org?.timezone) companyEvidence.push("Timezone");
  return {
    companyComplete: Boolean(org?.name && org?.legal_name && org?.timezone && org?.weekly_off),
    companyEvidence,
    branchCount: branches.data?.length ?? 0,
    departmentCount: departments.data?.length ?? 0,
    employeeCount: employees.data?.length ?? 0,
    statutoryConfigured: Boolean(statutory.data),
    salaryStructureCount: structures.data?.length ?? 0,
    leaveTypeCount: leaveTypes.data?.length ?? 0,
    biometricDeviceCount: devices.data?.length ?? 0,
    userCount: users.data?.length ?? 0,
    skippedAttendance: Boolean(progress?.skipped_attendance),
  };
}

export async function refreshOnboarding(organizationId: string, actorId: string | null) {
  const facts = await loadFacts(organizationId);
  const views = evaluateOnboarding(facts);
  const now = stamp();
  const existing = await listOnboardingSteps(organizationId);
  for (const view of views) {
    const prior = existing.find((row) => row.step_key === view.step_key);
    const status = persistableStatus(view);
    const complete = status === "COMPLETE" || status === "SKIPPED";
    await upsertOnboardingStep({
      id: prior?.id ?? crypto.randomUUID(),
      organization_id: organizationId,
      step_key: view.step_key,
      status,
      evidence_json: JSON.stringify(view.evidence),
      last_checked_at: now,
      completed_at: complete ? prior?.completed_at ?? now : null,
      skipped_reason: view.skipped_reason,
      updated_by: actorId,
      created_at: prior?.created_at ?? now,
      updated_at: now,
    });
  }
  const complete = onboardingComplete(views);
  const current = currentOnboardingStep(views);
  const progress: OnboardingProgress = {
    organization_id: organizationId,
    current_step: current,
    status: complete ? "COMPLETE" : views.some((step) => step.status !== "NOT_STARTED") ? "IN_PROGRESS" : "NOT_STARTED",
    completed_at: complete ? now : null,
    skipped_attendance: facts.skippedAttendance,
    notes: null,
    updated_by: actorId,
    created_at: (await getOnboardingProgress(organizationId))?.created_at ?? now,
    updated_at: now,
  };
  await upsertOnboardingProgress(progress);
  return { progress, steps: views, facts };
}

export async function skipAttendanceStep(organizationId: string, actorId: string | null, reason: string) {
  const existing = await getOnboardingProgress(organizationId);
  const now = stamp();
  await upsertOnboardingProgress({
    organization_id: organizationId,
    current_step: existing?.current_step ?? "ATTENDANCE",
    status: existing?.status ?? "IN_PROGRESS",
    completed_at: existing?.completed_at ?? null,
    skipped_attendance: true,
    notes: reason,
    updated_by: actorId,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  });
  await writeAudit({
    organizationId,
    actorUserId: actorId,
    action: "onboarding_skip_attendance",
    entityType: "onboarding_progress",
    entityId: organizationId,
    metadata: { reason },
  });
  return refreshOnboarding(organizationId, actorId);
}

function cell(headers: string[], cells: string[], name: string) {
  const index = headerIndex(headers, name);
  return index >= 0 ? (cells[index] ?? "").trim() : "";
}

function findEmployee(organizationId: string, code: string) {
  if (!demoEnabled()) return null;
  return getDemoStore().employees.find(
    (row) => row.organization_id === organizationId && row.employee_code.toLowerCase() === code.toLowerCase()
  ) ?? null;
}

export async function previewImport(input: {
  organizationId: string;
  actorId: string | null;
  entityType: ImportEntityType;
  fileName: string;
  text: string;
}) {
  const csvError = rejectNonCsv(input.fileName);
  if (csvError) throw new Error(csvError);
  const table = splitCsv(input.text);
  if (table.length < 2) throw new Error("The file has no data rows.");
  const headers = table[0].map((h) => h.toLowerCase());
  const missing = requiredColumns(input.entityType).filter((col) => headerIndex(headers, col) === -1);
  if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}.`);

  const now = stamp();
  const jobId = crypto.randomUUID();
  const rows: ImportJobRow[] = [];
  let ready = 0;
  let errors = 0;

  table.slice(1).forEach((cells, index) => {
    const payload: Record<string, string> = {};
    headers.forEach((header, i) => {
      payload[header.replace(/\s+/g, "_")] = cells[i] ?? "";
    });
    const issues: string[] = [];
    const warnings: string[] = [];
    const employeeCode = cell(headers, cells, "employee_id");
    if (!employeeCode) issues.push("Employee ID is required.");
    const employee = employeeCode ? findEmployee(input.organizationId, employeeCode) : null;
    if (demoEnabled() && employeeCode && !employee && input.entityType !== "EMPLOYEES") {
      issues.push("Employee not found.");
    }

    if (input.entityType === "EMPLOYEES") {
      if (!cell(headers, cells, "first_name")) issues.push("First name is required.");
      if (!cell(headers, cells, "last_name")) issues.push("Last name is required.");
      if (!/^[6-9]\d{9}$/.test(cell(headers, cells, "mobile"))) issues.push("Mobile is invalid.");
      if (!cell(headers, cells, "joining_date")) issues.push("Joining date is required.");
      if (demoEnabled()) {
        const store = getDemoStore();
        if (employee) issues.push("Employee ID already exists.");
        const branchName = cell(headers, cells, "branch");
        const typeName = cell(headers, cells, "employment_type");
        if (branchName && !store.branches.some((item) => item.name.toLowerCase() === branchName.toLowerCase())) {
          issues.push("Branch not found.");
        }
        if (typeName && !store.employmentTypes.some((item) => item.name.toLowerCase() === typeName.toLowerCase())) {
          issues.push("Employment type not found.");
        }
      }
    }
    if (input.entityType === "SALARY") {
      if (!cell(headers, cells, "structure_code")) issues.push("Structure code is required.");
      if (!(Number(cell(headers, cells, "ctc_amount")) > 0)) issues.push("CTC amount must be greater than 0.");
      if (!cell(headers, cells, "effective_from")) issues.push("Effective from is required.");
      if (demoEnabled()) {
        const code = cell(headers, cells, "structure_code");
        if (code && !getDemoStore().salaryStructures.some((item) => item.code.toLowerCase() === code.toLowerCase())) {
          issues.push("Salary structure not found.");
        }
      }
    }
    if (input.entityType === "LEAVE_BALANCES") {
      if (!cell(headers, cells, "leave_type_code")) issues.push("Leave type code is required.");
      if (!Number.isFinite(Number(cell(headers, cells, "year")))) issues.push("Year is required.");
      if (!Number.isFinite(Number(cell(headers, cells, "opening")))) issues.push("Opening balance is required.");
    }
    if (input.entityType === "LOAN_BALANCES") {
      if (!cell(headers, cells, "loan_type_code")) issues.push("Loan type code is required.");
      if (!(Number(cell(headers, cells, "outstanding_principal")) >= 0)) issues.push("Outstanding principal is invalid.");
      if (!cell(headers, cells, "start_date")) issues.push("Start date is required.");
    }
    if (input.entityType === "HISTORICAL_PAYROLL") {
      if (!/^\d{4}-\d{2}$/.test(cell(headers, cells, "period"))) issues.push("Period must be YYYY-MM.");
      if (!Number.isFinite(Number(cell(headers, cells, "gross")))) issues.push("Gross is required.");
      if (!Number.isFinite(Number(cell(headers, cells, "net")))) issues.push("Net is required.");
      warnings.push("Imported payroll will be labelled imported and is not BSB-calculated.");
    }
    if (input.entityType === "OPENING_BALANCES") {
      const kind = cell(headers, cells, "kind").toUpperCase();
      if (!["LEAVE", "LOAN", "SALARY"].includes(kind)) issues.push("Kind must be LEAVE, LOAN or SALARY.");
      if (!Number.isFinite(Number(cell(headers, cells, "amount")))) issues.push("Amount is required.");
      if (!cell(headers, cells, "as_of_date")) issues.push("As-of date is required.");
    }

    const status: ImportRowStatus = issues.length ? "ERROR" : warnings.length ? "WARNING" : "READY";
    if (status === "ERROR") errors += 1;
    else ready += 1;
    rows.push({
      id: crypto.randomUUID(),
      job_id: jobId,
      organization_id: input.organizationId,
      row_number: index + 2,
      payload_json: JSON.stringify(payload),
      status,
      errors_json: JSON.stringify(issues),
      warnings_json: JSON.stringify(warnings),
      imported_entity_id: null,
      created_at: now,
    });
  });

  const job: ImportJob = {
    id: jobId,
    organization_id: input.organizationId,
    entity_type: input.entityType,
    file_name: input.fileName,
    status: "PREVIEWED",
    total_rows: rows.length,
    ready_rows: ready,
    error_rows: errors,
    imported_rows: 0,
    skipped_rows: 0,
    previewed_at: now,
    confirmed_at: null,
    imported_at: null,
    notes: "Preview only. Confirm is required before any rows are written.",
    created_by: input.actorId,
    updated_by: input.actorId,
    created_at: now,
    updated_at: now,
  };
  await upsertImportJob(job);
  await replaceImportJobRows(jobId, rows);
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorId,
    action: "import_preview",
    entityType: "import_job",
    entityId: jobId,
    metadata: { entityType: input.entityType, total: rows.length, ready, errors },
  });
  return { job, rows };
}

function parsePayload(row: ImportJobRow) {
  try {
    return JSON.parse(row.payload_json) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function confirmImport(organizationId: string, jobId: string, actorId: string | null) {
  const job = await getImportJob(organizationId, jobId);
  if (!job) throw new Error("Import job not found.");
  if (!canConfirmImport(job.status)) throw new Error("Confirm is only allowed after a successful preview.");
  const rows = await listImportJobRows(organizationId, jobId);
  const now = stamp();
  let imported = 0;
  let skipped = 0;
  if (!demoEnabled()) {
    throw new Error("Live import confirm writes through demo store only in this environment. Apply SQL and use the employee CSV import for production employee rows.");
  }
  const store = getDemoStore();

  for (const row of rows) {
    if (row.status === "ERROR") {
      skipped += 1;
      continue;
    }
    const payload = parsePayload(row);
    try {
      if (job.entity_type === "EMPLOYEES") {
        const employeeId = crypto.randomUUID();
        const firstName = payload.first_name ?? "";
        const lastName = payload.last_name ?? "";
        const displayName = `${firstName} ${lastName}`.trim();
        const branch = store.branches.find((item) => item.name.toLowerCase() === (payload.branch ?? "").toLowerCase());
        const type = store.employmentTypes.find((item) => item.name.toLowerCase() === (payload.employment_type ?? "").toLowerCase());
        const department = store.departments.find((item) => item.name.toLowerCase() === (payload.department ?? "").toLowerCase());
        const designation = store.designations.find((item) => item.name.toLowerCase() === (payload.designation ?? "").toLowerCase());
        store.employees.push({
          id: employeeId,
          organization_id: organizationId,
          employee_code: payload.employee_id,
          first_name: firstName,
          middle_name: null,
          last_name: lastName,
          display_name: displayName,
          gender: null,
          date_of_birth: null,
          mobile: payload.mobile ?? null,
          alternate_mobile: null,
          personal_email: null,
          photo_url: null,
          emergency_contact_name: null,
          emergency_contact_number: null,
          emergency_relationship: null,
          status: "ACTIVE",
          user_id: null,
          is_demo: false,
          created_by: actorId,
          updated_by: actorId,
          created_at: now,
          updated_at: now,
        });
        store.employeeEmployment.push({
          id: crypto.randomUUID(),
          organization_id: organizationId,
          employee_id: employeeId,
          joining_date: payload.joining_date,
          employment_type_id: type?.id ?? null,
          branch_id: branch?.id ?? null,
          department_id: department?.id ?? null,
          designation_id: designation?.id ?? null,
          reporting_manager_id: null,
          location_id: null,
          official_email: null,
          work_phone: null,
          created_at: now,
          updated_at: now,
        });
        store.employeeHistory.push({
          id: crypto.randomUUID(),
          organization_id: organizationId,
          employee_id: employeeId,
          event_type: "JOINING",
          old_value: null,
          new_value: displayName,
          effective_date: payload.joining_date,
          reason: "Confirmed CSV import",
          changed_by: actorId,
          created_at: now,
        });
        row.imported_entity_id = employeeId;
      } else if (job.entity_type === "SALARY") {
        const employee = findEmployee(organizationId, payload.employee_id);
        const structure = store.salaryStructures.find((item) => item.code.toLowerCase() === (payload.structure_code ?? "").toLowerCase());
        if (!employee || !structure) throw new Error("Employee or structure missing.");
        const existing = store.employeeSalaryAssignments.find(
          (item) => item.employee_id === employee.id && item.status === "ACTIVE"
        );
        if (existing && existing.effective_from === payload.effective_from) {
          throw new Error("An assignment already exists for this effective date. History is preserved.");
        }
        if (existing) {
          const dayBefore = new Date(`${payload.effective_from}T00:00:00Z`);
          dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
          existing.effective_to = dayBefore.toISOString().slice(0, 10);
          existing.status = "CLOSED";
          existing.updated_at = now;
        }
        const assignmentId = crypto.randomUUID();
        store.employeeSalaryAssignments.push({
          id: assignmentId,
          organization_id: organizationId,
          employee_id: employee.id,
          structure_id: structure.id,
          ctc_amount: Number(payload.ctc_amount),
          gross_amount: Number(payload.ctc_amount),
          effective_from: payload.effective_from,
          effective_to: null,
          status: "ACTIVE",
          notes: "Imported salary assignment",
          created_by: actorId,
          updated_by: actorId,
          created_at: now,
          updated_at: now,
        });
        store.salaryHistory.push({
          id: crypto.randomUUID(),
          organization_id: organizationId,
          employee_id: employee.id,
          assignment_id: assignmentId,
          revision_id: null,
          change_type: "NEW_JOINER",
          old_value: existing ? String(existing.ctc_amount) : null,
          new_value: payload.ctc_amount,
          reason: "Confirmed CSV import",
          approved_by: actorId,
          effective_from: payload.effective_from,
          applied_at: now,
          created_by: actorId,
          created_at: now,
        });
        row.imported_entity_id = assignmentId;
      } else if (job.entity_type === "LEAVE_BALANCES") {
        const employee = findEmployee(organizationId, payload.employee_id);
        const leaveType = store.leaveTypes.find((item) => item.code.toLowerCase() === (payload.leave_type_code ?? "").toLowerCase());
        if (!employee || !leaveType) throw new Error("Employee or leave type missing.");
        const year = Number(payload.year);
        const opening = Number(payload.opening);
        let balance = store.leaveBalances.find(
          (item) => item.employee_id === employee.id && item.leave_type_id === leaveType.id && item.year === year
        );
        const before = balance?.available ?? 0;
        if (!balance) {
          balance = emptyBalance({
            id: crypto.randomUUID(),
            organization_id: organizationId,
            employee_id: employee.id,
            leave_type_id: leaveType.id,
            year,
            opening,
            allocated: 0,
            accrued: 0,
            used: 0,
            pending: 0,
            carry_forward: 0,
            adjusted: 0,
          });
          store.leaveBalances.push(balance);
        } else {
          balance.opening = opening;
          const recomputed = emptyBalance(balance);
          balance.available = recomputed.available;
          balance.updated_at = now;
        }
        store.leaveBalanceTransactions.push({
          id: crypto.randomUUID(),
          organization_id: organizationId,
          employee_id: employee.id,
          leave_type_id: leaveType.id,
          year,
          source: "ADJUSTMENT",
          quantity: opening,
          balance_before: before,
          balance_after: balance.available,
          reference_id: job.id,
          notes: "Imported opening leave balance",
          created_by: actorId,
          created_at: now,
        });
        row.imported_entity_id = balance.id;
      } else if (job.entity_type === "LOAN_BALANCES") {
        const employee = findEmployee(organizationId, payload.employee_id);
        const loanType = store.loanTypes.find((item) => item.code.toLowerCase() === (payload.loan_type_code ?? "").toLowerCase());
        if (!employee || !loanType) throw new Error("Employee or loan type missing.");
        const accountId = crypto.randomUUID();
        const principal = Number(payload.outstanding_principal);
        const emi = Number(payload.emi_amount || 0);
        const remaining = Number(payload.remaining_installments || 0);
        store.loanAccounts.push({
          id: accountId,
          organization_id: organizationId,
          application_id: `imported:${job.id}`,
          employee_id: employee.id,
          loan_type_id: loanType.id,
          approved_amount: principal,
          disbursed_amount: principal,
          interest_amount: 0,
          outstanding_principal: principal,
          outstanding_interest: 0,
          emi_amount: emi,
          tenure_months: remaining,
          paid_installments: 0,
          remaining_installments: remaining,
          start_date: payload.start_date,
          end_date: null,
          next_due_date: payload.start_date,
          auto_deduct_payroll: true,
          status: "ACTIVE",
          disbursed_at: now,
          disbursed_by: actorId,
          created_by: actorId,
          updated_by: actorId,
          created_at: now,
          updated_at: now,
        });
        store.loanLedger.push({
          id: crypto.randomUUID(),
          organization_id: organizationId,
          account_id: accountId,
          entry_type: "DISBURSEMENT",
          before_principal: 0,
          before_interest: 0,
          amount: principal,
          after_principal: principal,
          after_interest: 0,
          source: "IMPORT",
          reference_id: job.id,
          notes: "Imported opening loan balance. Existing repayment history was not rewritten.",
          actor_id: actorId,
          created_at: now,
        });
        row.imported_entity_id = accountId;
      } else if (job.entity_type === "HISTORICAL_PAYROLL") {
        const employee = findEmployee(organizationId, payload.employee_id);
        if (!employee) throw new Error("Employee not found.");
        const period = payload.period;
        const runId = crypto.randomUUID();
        const itemId = crypto.randomUUID();
        const gross = Number(payload.gross);
        const deductions = Number(payload.deductions || 0);
        const net = Number(payload.net);
        store.payrollRuns.push({
          id: runId,
          organization_id: organizationId,
          period,
          period_from: `${period}-01`,
          period_to: `${period}-28`,
          pay_date: payload.pay_date || null,
          status: "PAID",
          run_type: "OFF_CYCLE",
          employee_count: 1,
          included_count: 1,
          hold_count: 0,
          error_count: 0,
          warning_count: 0,
          total_gross: gross,
          total_earnings: gross,
          total_deductions: deductions,
          total_statutory: 0,
          total_reimbursements: 0,
          total_claims: 0,
          total_loans: 0,
          total_net: net,
          employer_contributions: 0,
          notes: historicalPayrollNotes(period),
          snapshot_id: null,
          calculated_at: null,
          submitted_at: null,
          reviewed_at: null,
          approved_at: null,
          finalized_at: now,
          locked_at: now,
          processed_at: now,
          paid_at: payload.pay_date || now,
          cancelled_at: null,
          cancel_reason: null,
          created_by: actorId,
          updated_by: actorId,
          created_at: now,
          updated_at: now,
        });
        store.payrollItems.push({
          id: itemId,
          organization_id: organizationId,
          run_id: runId,
          employee_id: employee.id,
          assignment_id: null,
          structure_id: null,
          status: "INCLUDED",
          hold_reason: null,
          error_message: null,
          working_days: 0,
          present_days: 0,
          paid_days: 0,
          lop_days: 0,
          paid_leave_days: 0,
          ctc: 0,
          monthly_gross: gross,
          earnings: gross,
          variable_earnings: 0,
          reimbursements: 0,
          claims: 0,
          deductions,
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
          net_pay: net,
          employer_cost: gross,
          created_at: now,
          updated_at: now,
        });
        store.payrollLines.push({
          id: crypto.randomUUID(),
          organization_id: organizationId,
          run_id: runId,
          item_id: itemId,
          employee_id: employee.id,
          kind: "EARNING",
          code: "IMPORTED",
          name: "Imported historical payroll",
          amount: gross,
          taxable: false,
          reference_id: job.id,
          notes: historicalPayrollNotes(period),
          sort_order: 1,
          created_at: now,
        });
        row.imported_entity_id = runId;
      } else if (job.entity_type === "OPENING_BALANCES") {
        const employee = findEmployee(organizationId, payload.employee_id);
        if (!employee) throw new Error("Employee not found.");
        const opening: OpeningBalance = {
          id: crypto.randomUUID(),
          organization_id: organizationId,
          employee_id: employee.id,
          kind: (payload.kind ?? "LEAVE").toUpperCase() as OpeningBalance["kind"],
          reference_code: payload.reference_code || null,
          amount: Number(payload.amount),
          as_of_date: payload.as_of_date,
          notes: payload.notes || "Imported opening balance",
          import_job_id: job.id,
          created_by: actorId,
          created_at: now,
        };
        await insertOpeningBalance(opening);
        row.imported_entity_id = opening.id;
      }
      row.status = "IMPORTED";
      imported += 1;
    } catch (error) {
      row.status = "ERROR";
      const message = error instanceof Error ? error.message : "Import row failed.";
      row.errors_json = JSON.stringify([message]);
      skipped += 1;
    }
  }

  await replaceImportJobRows(jobId, rows);
  const updated: ImportJob = {
    ...job,
    status: importOutcome(imported, skipped, rows.length),
    imported_rows: imported,
    skipped_rows: skipped,
    error_rows: rows.filter((row) => row.status === "ERROR").length,
    confirmed_at: now,
    imported_at: now,
    notes: job.entity_type === "HISTORICAL_PAYROLL" ? "Imported historical payroll is labelled imported and is not BSB-calculated." : job.notes,
    updated_by: actorId,
    updated_at: now,
  };
  await upsertImportJob(updated);
  await writeAudit({
    organizationId,
    actorUserId: actorId,
    action: "import_confirm",
    entityType: "import_job",
    entityId: jobId,
    metadata: { imported, skipped, entityType: job.entity_type },
  });
  return { job: updated, rows };
}

export async function createSupportTicket(input: {
  organizationId: string;
  actorId: string | null;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  body: string;
}) {
  const now = stamp();
  const sequence = await nextTicketSequence(input.organizationId);
  const ticket: SupportTicket = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    ticket_number: ticketNumber(sequence),
    subject: input.subject,
    category: input.category,
    priority: input.priority,
    status: "OPEN",
    sla_due_at: slaDueAt(input.priority),
    sla_breached: false,
    created_by: input.actorId,
    assigned_to: null,
    resolved_at: null,
    closed_at: null,
    created_at: now,
    updated_at: now,
  };
  await upsertSupportTicket(ticket);
  await insertSupportMessage({
    id: crypto.randomUUID(),
    ticket_id: ticket.id,
    organization_id: input.organizationId,
    author_user_id: input.actorId,
    visibility: "CUSTOMER",
    body: input.body,
    created_at: now,
  });
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorId,
    action: "support_ticket_create",
    entityType: "support_ticket",
    entityId: ticket.id,
    metadata: { category: input.category, priority: input.priority },
  });
  return ticket;
}

export async function replySupportTicket(input: {
  organizationId: string;
  ticketId: string;
  actorId: string | null;
  body: string;
  visibility: SupportMessageVisibility;
  platform?: boolean;
}) {
  const ticket = input.platform
    ? (await listAllSupportTickets()).find((row) => row.id === input.ticketId) ?? null
    : await getSupportTicket(input.organizationId, input.ticketId);
  if (!ticket) throw new Error("Ticket not found.");
  if (!input.platform && ticket.organization_id !== input.organizationId) {
    throw new Error("Cross-organization access is not allowed.");
  }
  if (ticket.status === "CLOSED") throw new Error("Closed tickets cannot be updated.");
  if (input.visibility === "INTERNAL" && !input.platform) {
    throw new Error("Internal notes are platform-only.");
  }
  const now = stamp();
  await insertSupportMessage({
    id: crypto.randomUUID(),
    ticket_id: ticket.id,
    organization_id: ticket.organization_id,
    author_user_id: input.actorId,
    visibility: input.visibility,
    body: input.body,
    created_at: now,
  });
  const status = nextTicketStatus(ticket.status, "reply");
  const updated = { ...ticket, status, updated_at: now, sla_breached: isSlaBreached(ticket.sla_due_at, status) };
  await upsertSupportTicket(updated);
  return updated;
}

export async function updateSupportStatus(input: {
  organizationId: string;
  ticketId: string;
  actorId: string | null;
  action: "progress" | "waiting" | "resolve" | "close";
  platform?: boolean;
}) {
  const ticket = input.platform
    ? (await listAllSupportTickets()).find((row) => row.id === input.ticketId) ?? null
    : await getSupportTicket(input.organizationId, input.ticketId);
  if (!ticket) throw new Error("Ticket not found.");
  if (!input.platform && ticket.organization_id !== input.organizationId) {
    throw new Error("Cross-organization access is not allowed.");
  }
  const now = stamp();
  const status: SupportTicketStatus = nextTicketStatus(ticket.status, input.action);
  const updated: SupportTicket = {
    ...ticket,
    status,
    resolved_at: status === "RESOLVED" ? now : ticket.resolved_at,
    closed_at: status === "CLOSED" ? now : ticket.closed_at,
    sla_breached: isSlaBreached(ticket.sla_due_at, status),
    updated_at: now,
  };
  await upsertSupportTicket(updated);
  await writeAudit({
    organizationId: ticket.organization_id,
    actorUserId: input.actorId,
    action: "support_ticket_status",
    entityType: "support_ticket",
    entityId: ticket.id,
    metadata: { action: input.action, status },
  });
  return updated;
}

function exportEmployeesCsv(employees: Employee[]) {
  return toCsv(
    ["employee_id", "display_name", "status", "mobile"],
    employees.map((row) => [row.employee_code, row.display_name, row.status, maskSecret(row.mobile)])
  );
}

export async function requestDataExport(organizationId: string, kind: DataExportKind, actorId: string | null) {
  const now = stamp();
  const job: DataExportJob = {
    id: crypto.randomUUID(),
    organization_id: organizationId,
    kind,
    status: "PROCESSING",
    file_name: null,
    content: null,
    requested_by: actorId,
    ready_at: null,
    expires_at: null,
    downloaded_at: null,
    error_message: null,
    created_at: now,
    updated_at: now,
  };
  await upsertDataExportJob(job);
  try {
    if (!demoEnabled()) throw new Error("Live export requires configured storage. Demo export is in-memory CSV.");
    const store = getDemoStore();
    const employees = belongsToOrganization(organizationId, store.employees);
    let content = "";
    if (kind === "EMPLOYEES" || kind === "FULL") {
      content += `# Employees\n${exportEmployeesCsv(employees)}\n`;
    }
    if (kind === "PAYROLL" || kind === "FULL") {
      const runs = belongsToOrganization(organizationId, store.payrollRuns);
      content += `# Payroll runs\n${toCsv(
        ["period", "status", "run_type", "total_net", "notes"],
        runs.map((row) => [row.period, row.status, row.run_type, row.total_net, row.notes])
      )}\n`;
    }
    if (kind === "LEAVE" || kind === "FULL") {
      const balances = belongsToOrganization(organizationId, store.leaveBalances);
      content += `# Leave balances\n${toCsv(
        ["employee_id", "year", "opening", "available"],
        balances.map((row) => {
          const employee = employees.find((item) => item.id === row.employee_id);
          return [employee?.employee_code ?? row.employee_id, row.year, row.opening, row.available];
        })
      )}\n`;
    }
    if (kind === "BILLING" || kind === "FULL") {
      const invoices = belongsToOrganization(organizationId, store.billingInvoices);
      content += `# Subscription invoices\n${toCsv(
        ["invoice_number", "status", "total", "outstanding"],
        invoices.map((row) => [row.invoice_number, row.status, row.total, row.outstanding])
      )}\n`;
    }
    content += "\n# Secrets, bank account numbers and Aadhaar are not included.\n";
    const ready: DataExportJob = {
      ...job,
      status: "READY",
      file_name: `${kind.toLowerCase()}-${organizationId.slice(0, 8)}.csv`,
      content,
      ready_at: now,
      expires_at: exportExpiresAt(),
      updated_at: stamp(),
    };
    await upsertDataExportJob(ready);
    await writeAudit({
      organizationId,
      actorUserId: actorId,
      action: "data_export_ready",
      entityType: "data_export_job",
      entityId: job.id,
      metadata: { kind },
    });
    return ready;
  } catch (error) {
    const failed: DataExportJob = {
      ...job,
      status: "FAILED",
      error_message: error instanceof Error ? error.message : "Export failed.",
      updated_at: stamp(),
    };
    await upsertDataExportJob(failed);
    return failed;
  }
}

export async function downloadDataExport(organizationId: string, jobId: string, actorId: string | null) {
  const job = await getDataExportJob(organizationId, jobId);
  if (!job) throw new Error("Export not found.");
  if (job.organization_id !== organizationId) throw new Error("Cross-organization access is not allowed.");
  if (job.status === "EXPIRED") throw new Error("This export has expired. Request a new export. Data was not deleted.");
  if (job.status !== "READY" || !job.content) throw new Error("Export is not ready.");
  if (job.expires_at && job.expires_at < stamp()) {
    await upsertDataExportJob({ ...job, status: "EXPIRED", content: job.content, updated_at: stamp() });
    throw new Error("This export has expired. Request a new export. Data was not deleted.");
  }
  await upsertDataExportJob({ ...job, downloaded_at: stamp(), updated_at: stamp() });
  await writeAudit({
    organizationId,
    actorUserId: actorId,
    action: "data_export_download",
    entityType: "data_export_job",
    entityId: job.id,
  });
  return job;
}

export async function requestOffboarding(organizationId: string, reason: string, actorId: string | null) {
  const exportJob = await requestDataExport(organizationId, "FULL", actorId);
  const now = stamp();
  const row: OffboardingRequest = {
    id: crypto.randomUUID(),
    organization_id: organizationId,
    status: exportJob.status === "READY" ? "EXPORT_READY" : "REQUESTED",
    reason,
    export_job_id: exportJob.id,
    confirmed_at: null,
    completed_at: null,
    requested_by: actorId,
    confirmed_by: null,
    created_at: now,
    updated_at: now,
  };
  await upsertOffboardingRequest(row);
  await writeAudit({
    organizationId,
    actorUserId: actorId,
    action: "offboarding_request",
    entityType: "offboarding_request",
    entityId: row.id,
    metadata: { reason },
  });
  return { request: row, exportJob };
}

export async function confirmOffboarding(organizationId: string, requestId: string, actorId: string | null) {
  const rows = await listOffboardingRequests(organizationId);
  const request = rows.find((row) => row.id === requestId);
  if (!request) throw new Error("Offboarding request not found.");
  if (request.status === "COMPLETED") throw new Error("Offboarding is already recorded.");
  if (request.status === "CANCELLED") throw new Error("Cancelled offboarding cannot be confirmed.");
  const now = stamp();
  const updated: OffboardingRequest = {
    ...request,
    status: "COMPLETED",
    confirmed_at: now,
    completed_at: now,
    confirmed_by: actorId,
    updated_at: now,
  };
  await upsertOffboardingRequest(updated);
  await writeAudit({
    organizationId,
    actorUserId: actorId,
    action: "offboarding_confirm",
    entityType: "offboarding_request",
    entityId: request.id,
    metadata: { preserved: true },
  });
  return updated;
}

export async function expireReadyExports() {
  const now = stamp();
  const rows = await listReadyExpiredExports(now);
  for (const row of rows) {
    await upsertDataExportJob({
      ...row,
      status: "EXPIRED",
      content: row.content,
      updated_at: now,
    });
  }
  return { expired: rows.length };
}

export async function markSupportSla() {
  const open = await listOpenSupportTickets();
  let breached = 0;
  for (const ticket of open) {
    const next = isSlaBreached(ticket.sla_due_at, ticket.status);
    if (next && !ticket.sla_breached) {
      await upsertSupportTicket({ ...ticket, sla_breached: true, updated_at: stamp() });
      breached += 1;
    }
  }
  return { open: open.length, breached };
}

export async function loadOpsSnapshot() {
  if (!demoEnabled()) {
    return {
      organizations: 0,
      employees: 0,
      openTickets: 0,
      breachedTickets: 0,
      readyExports: 0,
      failedJobs: 0,
    };
  }
  const store = getDemoStore();
  const openTickets = store.supportTickets.filter((row) => row.status !== "RESOLVED" && row.status !== "CLOSED");
  return {
    organizations: 1,
    employees: store.employees.length,
    openTickets: openTickets.length,
    breachedTickets: openTickets.filter((row) => row.sla_breached).length,
    readyExports: store.dataExportJobs.filter((row) => row.status === "READY").length,
    failedJobs: store.jobExecutions.filter((row) => row.status === "FAILED").length,
  };
}

export {
  listImportJobs,
  listImportJobRows,
  listSupportTickets,
  listAllSupportTickets,
  listSupportMessages,
  listDataExportJobs,
  listOffboardingRequests,
  listOpeningBalances,
  getSupportTicket,
  getImportJob,
  getDataExportJob,
};
