import { listEmployment } from "@/lib/leave/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import {
  getJournal,
  getJournalForRun,
  insertAccount,
  insertAccountingExport,
  insertJournal,
  insertMapping,
  listAccounts,
  listJournalLines,
  listMappings,
  replaceJournalLines,
  updateAccount,
  updateJournal,
  updateMapping,
} from "@/lib/accounting/repository";
import { getPayrollRun, getPayrollSnapshot, listPayrollItems, listPayrollLines } from "@/lib/payroll/repository";
import type {
  AccountingAccount,
  AccountingExport,
  AccountingAccountType,
  PayrollAccountMapping,
  PayrollItem,
  PayrollJournal,
  PayrollJournalLine,
  PayrollLine,
  PayrollMappingCategory,
  PayrollRun,
} from "@/types";

function stamp() {
  return new Date().toISOString();
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type JournalIssue = {
  employeeId: string | null;
  employeeCode: string | null;
  employeeName: string | null;
  category: PayrollMappingCategory;
  componentCode: string | null;
  treatment: "DEBIT" | "CREDIT";
  message: string;
};

type SnapshotPayload = {
  run: PayrollRun;
  items: PayrollItem[];
  lines: PayrollLine[];
};

export type JournalPreview = {
  run: PayrollRun;
  journalDate: string;
  period: string;
  lines: Array<Omit<PayrollJournalLine, "id" | "journal_id" | "created_at">>;
  issues: JournalIssue[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
};

const FINALIZED_STATUSES = ["FINALIZED", "LOCKED", "PROCESSED", "PAID"];

function mappingScore(mapping: PayrollAccountMapping) {
  let score = 0;
  if (mapping.component_code) score += 4;
  if (mapping.branch_id) score += 2;
  if (mapping.department_id) score += 1;
  return score;
}

function mappingApplies(
  mapping: PayrollAccountMapping,
  input: {
    category: PayrollMappingCategory;
    componentCode: string | null;
    treatment: "DEBIT" | "CREDIT";
    date: string;
    branchId: string | null;
    departmentId: string | null;
  }
) {
  if (!mapping.active) return false;
  if (mapping.category !== input.category) return false;
  if (mapping.treatment !== input.treatment) return false;
  if (mapping.component_code && mapping.component_code !== input.componentCode) return false;
  if (mapping.branch_id && mapping.branch_id !== input.branchId) return false;
  if (mapping.department_id && mapping.department_id !== input.departmentId) return false;
  if (mapping.effective_from > input.date) return false;
  if (mapping.effective_to && mapping.effective_to < input.date) return false;
  return true;
}

export function resolveMapping(
  mappings: PayrollAccountMapping[],
  input: {
    category: PayrollMappingCategory;
    componentCode: string | null;
    treatment: "DEBIT" | "CREDIT";
    date: string;
    branchId: string | null;
    departmentId: string | null;
  }
) {
  const candidates = mappings
    .filter((mapping) => mappingApplies(mapping, input))
    .sort((a, b) => {
      const diff = mappingScore(b) - mappingScore(a);
      if (diff !== 0) return diff;
      return b.effective_from.localeCompare(a.effective_from);
    });
  return candidates[0] ?? null;
}

function statutoryComponent(code: string) {
  return code.replace(/_ER$/, "").replace(/^ADJ_(EARN|DED)$/, "ADJ").toUpperCase();
}

async function loadSnapshotPayload(organizationId: string, runId: string) {
  const run = await getPayrollRun(organizationId, runId);
  if (!run) throw new Error("Payroll run not found.");
  if (!FINALIZED_STATUSES.includes(run.status)) {
    throw new Error("Only a finalized payroll run can be journalised.");
  }
  const snapshot = await getPayrollSnapshot(organizationId, runId);
  if (snapshot) {
    try {
      const payload = JSON.parse(snapshot.payload_json) as SnapshotPayload;
      if (payload?.run && Array.isArray(payload.items) && Array.isArray(payload.lines)) {
        return { run, items: payload.items, lines: payload.lines };
      }
    } catch {
      // Fall through to live rows if the snapshot payload cannot be parsed.
    }
  }
  const [items, lines] = await Promise.all([
    listPayrollItems(organizationId, runId),
    listPayrollLines(organizationId, runId),
  ]);
  return { run, items, lines };
}

export async function buildJournalPreview(
  organizationId: string,
  runId: string,
  options: { journalDate?: string } = {}
): Promise<JournalPreview> {
  const [{ run, items, lines }, mappings, catalog, employment, accounts] = await Promise.all([
    loadSnapshotPayload(organizationId, runId),
    listMappings(organizationId),
    loadOrgCatalog(organizationId),
    listEmployment(organizationId),
    listAccounts(organizationId),
  ]);
  const journalDate = options.journalDate || run.pay_date || run.period_to;
  const accountById = new Map(accounts.map((row) => [row.id, row]));
  const employeeById = new Map(catalog.employees.map((row) => [row.id, row]));
  const employmentByEmployee = new Map(employment.map((row) => [row.employee_id, row]));
  const included = items.filter((row) => row.status === "INCLUDED");
  const previewLines: JournalPreview["lines"] = [];
  const issues: JournalIssue[] = [];
  let sort = 0;

  const pushLine = (input: {
    item: PayrollItem;
    category: PayrollMappingCategory;
    componentCode: string | null;
    treatment: "DEBIT" | "CREDIT";
    amount: number;
    description: string;
    sourceKind: string;
    sourceCode: string | null;
  }) => {
    if (!input.amount) return;
    const employee = employeeById.get(input.item.employee_id);
    const job = employmentByEmployee.get(input.item.employee_id);
    const mapping = resolveMapping(mappings, {
      category: input.category,
      componentCode: input.componentCode,
      treatment: input.treatment,
      date: journalDate,
      branchId: job?.branch_id ?? null,
      departmentId: job?.department_id ?? null,
    });
    if (!mapping) {
      issues.push({
        employeeId: input.item.employee_id,
        employeeCode: employee?.employee_code ?? null,
        employeeName: employee?.display_name ?? null,
        category: input.category,
        componentCode: input.componentCode,
        treatment: input.treatment,
        message: `No active ${input.treatment.toLowerCase()} mapping for ${input.category}${
          input.componentCode ? ` (${input.componentCode})` : ""
        }.`,
      });
      return;
    }
    const account = accountById.get(mapping.ledger_account_id);
    if (!account || account.status !== "ACTIVE") {
      issues.push({
        employeeId: input.item.employee_id,
        employeeCode: employee?.employee_code ?? null,
        employeeName: employee?.display_name ?? null,
        category: input.category,
        componentCode: input.componentCode,
        treatment: input.treatment,
        message: `Mapped ledger account is missing or disabled for ${input.category}${
          input.componentCode ? ` (${input.componentCode})` : ""
        }.`,
      });
      return;
    }
    sort += 1;
    previewLines.push({
      organization_id: organizationId,
      employee_id: input.item.employee_id,
      account_id: account.id,
      account_code: account.code,
      account_name: account.name,
      branch_id: job?.branch_id ?? null,
      department_id: job?.department_id ?? null,
      description: `${employee?.employee_code ?? "—"} ${employee?.display_name ?? ""} — ${input.description}`.trim(),
      debit: input.treatment === "DEBIT" ? round(input.amount) : 0,
      credit: input.treatment === "CREDIT" ? round(input.amount) : 0,
      source_kind: input.sourceKind,
      source_code: input.sourceCode,
      sort_order: sort,
    });
  };

  for (const item of included) {
    const itemLines = lines.filter((row) => row.item_id === item.id);
    const itemEarnings = itemLines.filter(
      (row) => row.kind === "EARNING" || (row.kind === "ADJUSTMENT" && row.code === "ADJ_EARN")
    );
    for (const line of itemEarnings) {
      pushLine({
        item,
        category: "EARNING",
        componentCode: line.code,
        treatment: "DEBIT",
        amount: line.amount,
        description: line.name,
        sourceKind: "PAYROLL_LINE",
        sourceCode: line.code,
      });
    }
    for (const line of itemLines.filter((row) => row.kind === "REIMBURSEMENT" || row.kind === "CLAIM")) {
      pushLine({
        item,
        category: "REIMBURSEMENT",
        componentCode: line.kind === "CLAIM" ? line.code : null,
        treatment: "DEBIT",
        amount: line.amount,
        description: line.name,
        sourceKind: line.kind === "CLAIM" ? "CLAIM" : "REIMBURSEMENT",
        sourceCode: line.code,
      });
    }
    for (const line of itemLines.filter((row) => row.kind === "LOAN")) {
      pushLine({
        item,
        category: "LOAN_RECOVERY",
        componentCode: null,
        treatment: "CREDIT",
        amount: line.amount,
        description: line.name,
        sourceKind: "LOAN",
        sourceCode: line.code,
      });
    }
    for (const line of itemLines.filter(
      (row) => row.kind === "STATUTORY" || row.kind === "DEDUCTION" || (row.kind === "ADJUSTMENT" && row.code === "ADJ_DED")
    )) {
      pushLine({
        item,
        category: "DEDUCTION",
        componentCode: statutoryComponent(line.code),
        treatment: "CREDIT",
        amount: line.amount,
        description: line.name,
        sourceKind: "STATUTORY",
        sourceCode: line.code,
      });
    }
    for (const line of itemLines.filter((row) => row.kind === "EMPLOYER")) {
      const componentCode = statutoryComponent(line.code);
      pushLine({
        item,
        category: "EMPLOYER_CONTRIBUTION",
        componentCode,
        treatment: "DEBIT",
        amount: line.amount,
        description: `${line.name} (expense)`,
        sourceKind: "EMPLOYER",
        sourceCode: line.code,
      });
      pushLine({
        item,
        category: "EMPLOYER_CONTRIBUTION",
        componentCode,
        treatment: "CREDIT",
        amount: line.amount,
        description: `${line.name} (payable)`,
        sourceKind: "EMPLOYER",
        sourceCode: line.code,
      });
    }
    pushLine({
      item,
      category: "NET_PAY",
      componentCode: null,
      treatment: "CREDIT",
      amount: item.net_pay,
      description: `Net salary payable ${run.period}`,
      sourceKind: "NET_PAY",
      sourceCode: run.period,
    });
  }

  const totalDebit = round(previewLines.reduce((sum, row) => sum + row.debit, 0));
  const totalCredit = round(previewLines.reduce((sum, row) => sum + row.credit, 0));
  return {
    run,
    journalDate,
    period: run.period,
    lines: previewLines,
    issues,
    totalDebit,
    totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 0.01,
  };
}

export async function generateJournal(
  organizationId: string,
  runId: string,
  actorId: string | null,
  options: { journalDate?: string } = {}
) {
  const existing = await getJournalForRun(organizationId, runId);
  if (existing) {
    return { journal: existing, existed: true, issues: [] as JournalIssue[], lines: await listJournalLines(organizationId, existing.id) };
  }
  const preview = await buildJournalPreview(organizationId, runId, options);
  const journal: PayrollJournal = {
    id: crypto.randomUUID(),
    organization_id: organizationId,
    run_id: runId,
    period: preview.period,
    journal_date: preview.journalDate,
    reference_number: `JV-${preview.period}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    status: "DRAFT",
    total_debit: preview.totalDebit,
    total_credit: preview.totalCredit,
    balanced: preview.balanced,
    validation_json: JSON.stringify({
      balanced: preview.balanced,
      issues: preview.issues,
      checked_at: stamp(),
    }),
    export_count: 0,
    created_by: actorId,
    validated_at: null,
    exported_at: null,
    voided_at: null,
    void_reason: null,
    created_at: stamp(),
    updated_at: stamp(),
  };
  await insertJournal(journal);
  const rows: PayrollJournalLine[] = preview.lines.map((line) => ({
    ...line,
    id: crypto.randomUUID(),
    journal_id: journal.id,
    created_at: stamp(),
  }));
  await replaceJournalLines(organizationId, journal.id, rows);
  return { journal, existed: false, issues: preview.issues, lines: rows };
}

export async function validateJournal(organizationId: string, journalId: string) {
  const journal = await getJournal(organizationId, journalId);
  if (!journal) throw new Error("Journal not found.");
  if (journal.status === "VOID") throw new Error("Voided journals cannot be validated.");
  const preview = await buildJournalPreview(organizationId, journal.run_id, { journalDate: journal.journal_date });
  const totalDebit = preview.totalDebit;
  const totalCredit = preview.totalCredit;
  const balanced = preview.balanced;
  const issues = preview.issues;
  const updated = await updateJournal(journalId, {
    total_debit: totalDebit,
    total_credit: totalCredit,
    balanced,
    status: balanced && issues.length === 0 ? "VALIDATED" : "DRAFT",
    validated_at: balanced && issues.length === 0 ? stamp() : null,
    validation_json: JSON.stringify({ balanced, issues, checked_at: stamp() }),
  });
  if (issues.length) {
    throw new Error(
      `${issues.length} unmapped component${issues.length === 1 ? "" : "s"} block journal validation. First: ${issues[0].message}`
    );
  }
  if (!balanced) {
    throw new Error(`Journal is out of balance by ${round(Math.abs(totalDebit - totalCredit))}.`);
  }
  return updated ?? journal;
}

export async function exportJournal(
  organizationId: string,
  journalId: string,
  actorId: string | null,
  options: { duplicate?: boolean; storagePath?: string | null } = {}
): Promise<{ journal: PayrollJournal; export: AccountingExport; lines: PayrollJournalLine[] }> {
  const journal = await getJournal(organizationId, journalId);
  if (!journal) throw new Error("Journal not found.");
  if (journal.status === "VOID") throw new Error("Voided journals cannot be exported.");
  if (!journal.balanced) throw new Error("Journal is not balanced. Validate and resolve exceptions before exporting.");
  const issues = journal.validation_json ? (JSON.parse(journal.validation_json).issues as JournalIssue[] | undefined) : undefined;
  if (issues && issues.length > 0) throw new Error("Resolve unmapped components before exporting this journal.");
  if (journal.export_count > 0 && !options.duplicate) {
    throw new Error("This journal has already been exported. Confirm a duplicate export explicitly.");
  }
  const previous = journal.export_count > 0 ? await latestExport(organizationId, journalId) : null;
  const lines = await listJournalLines(organizationId, journalId);
  const exportRow = await insertAccountingExport({
    id: crypto.randomUUID(),
    organization_id: organizationId,
    kind: "JOURNAL",
    journal_id: journalId,
    format: "CSV",
    reference: journal.reference_number,
    row_count: lines.length,
    duplicate_of: previous?.id ?? null,
    storage_path: options.storagePath ?? null,
    notes: previous ? "Authorized duplicate export." : null,
    created_by: actorId,
    created_at: stamp(),
  });
  const updated = await updateJournal(journalId, {
    status: "EXPORTED",
    export_count: journal.export_count + 1,
    exported_at: stamp(),
  });
  return { journal: updated ?? journal, export: exportRow, lines };
}

async function latestExport(organizationId: string, journalId: string) {
  const { listAccountingExports } = await import("@/lib/accounting/repository");
  const rows = await listAccountingExports(organizationId);
  return rows.find((row) => row.journal_id === journalId) ?? null;
}

export async function saveAccount(
  organizationId: string,
  input: {
    id?: string | null;
    code: string;
    name: string;
    accountType: AccountingAccountType;
    description?: string | null;
    status?: "ACTIVE" | "DISABLED";
  },
  actorId: string | null
) {
  const code = input.code.trim();
  const name = input.name.trim();
  if (!code) throw new Error("Ledger account code is required.");
  if (!name) throw new Error("Ledger account name is required.");
  const existing = await listAccounts(organizationId);
  const duplicate = existing.find((row) => row.code === code && row.id !== input.id);
  if (duplicate) throw new Error(`Ledger account code ${code} already exists.`);
  if (input.id) {
    const updated = await updateAccount(input.id, {
      code,
      name,
      account_type: input.accountType,
      description: input.description ?? null,
      status: input.status ?? "ACTIVE",
      updated_by: actorId,
    });
    if (!updated) throw new Error("Ledger account not found.");
    return updated;
  }
  const row: AccountingAccount = {
    id: crypto.randomUUID(),
    organization_id: organizationId,
    code,
    name,
    account_type: input.accountType,
    description: input.description ?? null,
    status: input.status ?? "ACTIVE",
    created_by: actorId,
    updated_by: actorId,
    created_at: stamp(),
    updated_at: stamp(),
  };
  return insertAccount(row);
}

export async function saveMapping(
  organizationId: string,
  input: {
    id?: string | null;
    category: PayrollMappingCategory;
    componentCode?: string | null;
    ledgerAccountId: string;
    treatment: "DEBIT" | "CREDIT";
    branchId?: string | null;
    departmentId?: string | null;
    effectiveFrom: string;
    effectiveTo?: string | null;
    active?: boolean;
    notes?: string | null;
  },
  actorId: string | null
) {
  const account = (await listAccounts(organizationId)).find((row) => row.id === input.ledgerAccountId);
  if (!account) throw new Error("Select an existing ledger account.");
  if (account.status !== "ACTIVE") throw new Error("Selected ledger account is disabled.");
  if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) {
    throw new Error("Effective to date cannot be before effective from.");
  }
  const component = input.componentCode?.trim() ? input.componentCode.trim().toUpperCase() : null;
  const payload = {
    category: input.category,
    component_code: component,
    ledger_account_id: input.ledgerAccountId,
    treatment: input.treatment,
    branch_id: input.branchId ?? null,
    department_id: input.departmentId ?? null,
    effective_from: input.effectiveFrom,
    effective_to: input.effectiveTo ?? null,
    active: input.active ?? true,
    notes: input.notes ?? null,
  };
  if (input.id) {
    const updated = await updateMapping(input.id, { ...payload, updated_by: actorId });
    if (!updated) throw new Error("Mapping not found.");
    return updated;
  }
  const row: PayrollAccountMapping = {
    id: crypto.randomUUID(),
    organization_id: organizationId,
    ...payload,
    created_by: actorId,
    updated_by: actorId,
    created_at: stamp(),
    updated_at: stamp(),
  };
  return insertMapping(row);
}
