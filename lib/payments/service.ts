import { emitSafe } from "@/lib/events/emit";
import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAccountingExport } from "@/lib/accounting/repository";
import { toCsv } from "@/lib/payroll/engine";
import { getPayrollRun, getPayrollSnapshot, listPayrollItems } from "@/lib/payroll/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { maskAccountNumber } from "@/lib/mask";
import {
  getBatch,
  getBatchForRun,
  getPaymentSettings,
  insertBatch,
  insertReconciliation,
  insertTransaction,
  listBatchItems,
  listTransactions,
  replaceBatchItems,
  updateBatch,
  updateBatchItem,
  updateReconciliation,
  upsertPaymentSettings,
} from "@/lib/payments/repository";
import { DEFAULT_BANK_COLUMNS, type BankColumnKey } from "@/lib/payments/columns";
import type {
  AccountingExport,
  EmployeeBankAccount,
  PaymentBatch,
  PaymentBatchItem,
  PaymentMethod,
  PaymentSettings,
  PaymentTransaction,
  PayrollItem,
  PayrollRun,
} from "@/types";

function stamp() {
  return new Date().toISOString();
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const FINALIZED_STATUSES = ["FINALIZED", "LOCKED", "PROCESSED", "PAID"];
const ACTIVE_BATCH_STATUSES = ["DRAFT", "VALIDATING", "READY", "APPROVED", "EXPORTED", "PARTIALLY_PAID", "PAID"];

export { DEFAULT_BANK_COLUMNS, type BankColumnKey } from "@/lib/payments/columns";

type SnapshotPayload = { run: PayrollRun; items: PayrollItem[] };

export type PaymentIssue = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  severity: "ERROR" | "WARNING";
  message: string;
};

async function listBankAccounts(organizationId: string): Promise<EmployeeBankAccount[]> {
  if (!hasSupabaseConfig() || isDemoMode()) {
    return getDemoStore().employeeBank.filter((row) => row.organization_id === organizationId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("employee_bank_accounts").select("*").eq("organization_id", organizationId);
  return (data ?? []) as EmployeeBankAccount[];
}

async function loadFinalizedRun(organizationId: string, runId: string) {
  const run = await getPayrollRun(organizationId, runId);
  if (!run) throw new Error("Payroll run not found.");
  if (!FINALIZED_STATUSES.includes(run.status)) {
    throw new Error("Payment batches can only be created from a finalized payroll run.");
  }
  const snapshot = await getPayrollSnapshot(organizationId, runId);
  if (snapshot) {
    try {
      const payload = JSON.parse(snapshot.payload_json) as SnapshotPayload;
      if (payload?.run && Array.isArray(payload.items)) {
        return { run, items: payload.items };
      }
    } catch {
      // Fall through to live rows if the snapshot payload cannot be parsed.
    }
  }
  return { run, items: await listPayrollItems(organizationId, runId) };
}

function last4(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\s+/g, "");
  return digits ? digits.slice(-4) : null;
}

export async function defaultPaymentSettings(organizationId: string): Promise<PaymentSettings> {
  const existing = await getPaymentSettings(organizationId);
  if (existing) return existing;
  return {
    organization_id: organizationId,
    default_method: "NEFT",
    bank_account_reference: null,
    file_prefix: "salary-payment",
    delimiter: ",",
    include_header: true,
    columns_json: JSON.stringify(DEFAULT_BANK_COLUMNS),
    updated_by: null,
    created_at: stamp(),
    updated_at: stamp(),
  };
}

export async function savePaymentSettings(
  organizationId: string,
  input: {
    defaultMethod: PaymentMethod;
    bankAccountReference?: string | null;
    filePrefix: string;
    includeHeader: boolean;
    columns: Array<{ key: string; header: string }>;
  },
  actorId: string | null
) {
  const allowed = new Set(DEFAULT_BANK_COLUMNS.map((col) => col.key));
  const columns = input.columns.filter((col) => allowed.has(col.key as BankColumnKey));
  if (!columns.length) throw new Error("At least one bank-file column is required.");
  const current = await defaultPaymentSettings(organizationId);
  return upsertPaymentSettings({
    ...current,
    default_method: input.defaultMethod,
    bank_account_reference: input.bankAccountReference?.trim() || null,
    file_prefix: input.filePrefix.trim() || "salary-payment",
    include_header: input.includeHeader,
    columns_json: JSON.stringify(columns),
    updated_by: actorId,
    updated_at: stamp(),
  });
}

export async function createPaymentBatch(
  organizationId: string,
  input: {
    runId: string;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    bankAccountReference?: string | null;
    notes?: string | null;
  },
  actorId: string | null
) {
  const existing = await getBatchForRun(organizationId, input.runId);
  if (existing) {
    throw new Error("An active payment batch already exists for this payroll run. Cancel it before creating another.");
  }
  const { run, items } = await loadFinalizedRun(organizationId, input.runId);
  const included = items.filter((row) => row.status === "INCLUDED" && row.net_pay > 0);
  if (!included.length) throw new Error("This payroll run has no included employees with a payable net amount.");
  const [catalog, banks, settings] = await Promise.all([
    loadOrgCatalog(organizationId),
    listBankAccounts(organizationId),
    defaultPaymentSettings(organizationId),
  ]);
  const batch: PaymentBatch = {
    id: crypto.randomUUID(),
    organization_id: organizationId,
    run_id: run.id,
    period: run.period,
    payment_date: input.paymentDate,
    payment_method: input.paymentMethod,
    bank_account_reference: input.bankAccountReference?.trim() || settings.bank_account_reference,
    total_employees: 0,
    total_amount: 0,
    status: "DRAFT",
    validation_json: null,
    notes: input.notes ?? null,
    created_by: actorId,
    approved_by: null,
    approved_at: null,
    exported_at: null,
    export_count: 0,
    cancelled_at: null,
    cancel_reason: null,
    created_at: stamp(),
    updated_at: stamp(),
  };
  await insertBatch(batch);
  const rows: PaymentBatchItem[] = included.map((item) => {
    const employee = catalog.employees.find((row) => row.id === item.employee_id);
    const bank = banks.find((row) => row.employee_id === item.employee_id) ?? null;
    return {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      batch_id: batch.id,
      employee_id: item.employee_id,
      employee_code: employee?.employee_code ?? "—",
      employee_name: employee?.display_name ?? "Unknown",
      bank_account_id: bank?.id ?? null,
      account_number_last4: last4(bank?.account_number),
      ifsc: bank?.ifsc ?? null,
      amount: round(item.net_pay),
      status: "PENDING",
      exclusion_reason: null,
      error_message: null,
      created_at: stamp(),
      updated_at: stamp(),
    };
  });
  await replaceBatchItems(organizationId, batch.id, rows);
  return validatePaymentBatch(organizationId, batch.id);
}

export async function validatePaymentBatch(organizationId: string, batchId: string) {
  const batch = await getBatch(organizationId, batchId);
  if (!batch) throw new Error("Payment batch not found.");
  if (["PAID", "CANCELLED"].includes(batch.status)) throw new Error("This batch cannot be revalidated.");
  const { run, items } = await loadFinalizedRun(organizationId, batch.run_id);
  const [rows, banks, catalog] = await Promise.all([
    listBatchItems(organizationId, batchId),
    listBankAccounts(organizationId),
    loadOrgCatalog(organizationId),
  ]);
  const included = items.filter((row) => row.status === "INCLUDED");
  const issues: PaymentIssue[] = [];
  const payrollByEmployee = new Map(included.map((row) => [row.employee_id, row]));
  for (const row of rows) {
    if (row.status === "EXCLUDED") continue;
    const payroll = payrollByEmployee.get(row.employee_id);
    const employee = catalog.employees.find((item) => item.id === row.employee_id);
    const bank = banks.find((item) => item.employee_id === row.employee_id) ?? null;
    let error: string | null = null;
    if (!payroll) error = "Employee is not included in the finalized payroll run.";
    else if (round(payroll.net_pay) !== round(row.amount)) error = "Amount does not match the finalized net pay.";
    else if (round(row.amount) <= 0) error = "Net payable is not valid.";
    else if (!bank?.account_number || !bank.ifsc || !bank.account_holder_name) {
      error = "Required bank details are missing (account holder, account number or IFSC).";
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(bank.ifsc)) {
      issues.push({
        employeeId: row.employee_id,
        employeeCode: row.employee_code,
        employeeName: row.employee_name,
        severity: "WARNING",
        message: "IFSC format looks unusual. Confirm before exporting.",
      });
    }
    if (error) {
      issues.push({
        employeeId: row.employee_id,
        employeeCode: employee?.employee_code ?? row.employee_code,
        employeeName: employee?.display_name ?? row.employee_name,
        severity: "ERROR",
        message: error,
      });
    }
    await updateBatchItem(row.id, {
      error_message: error,
      bank_account_id: bank?.id ?? null,
      account_number_last4: last4(bank?.account_number),
      ifsc: bank?.ifsc ?? null,
    });
  }
  const payable = rows.filter((row) => row.status !== "EXCLUDED");
  const errors = issues.filter((item) => item.severity === "ERROR");
  const nextStatus = errors.length ? "DRAFT" : "READY";
  const updated = await updateBatch(batchId, {
    status: nextStatus,
    total_employees: payable.length,
    total_amount: round(payable.reduce((sum, row) => sum + row.amount, 0)),
    validation_json: JSON.stringify({ issues, checked_at: stamp(), runStatus: run.status }),
  });
  return { batch: updated ?? batch, issues };
}

export async function excludePaymentItem(
  organizationId: string,
  batchId: string,
  itemId: string,
  reason: string
) {
  const batch = await getBatch(organizationId, batchId);
  if (!batch) throw new Error("Payment batch not found.");
  if (!["DRAFT", "VALIDATING", "READY"].includes(batch.status)) {
    throw new Error("Employees can only be excluded before approval.");
  }
  const note = reason.trim();
  if (note.length < 3) throw new Error("A reason is required to exclude an employee.");
  const rows = await listBatchItems(organizationId, batchId);
  const item = rows.find((row) => row.id === itemId);
  if (!item || item.batch_id !== batchId) throw new Error("Payment item not found.");
  await updateBatchItem(itemId, {
    status: "EXCLUDED",
    exclusion_reason: note,
    error_message: null,
  });
  return validatePaymentBatch(organizationId, batchId);
}

export async function includePaymentItem(organizationId: string, batchId: string, itemId: string) {
  const batch = await getBatch(organizationId, batchId);
  if (!batch) throw new Error("Payment batch not found.");
  if (!["DRAFT", "VALIDATING", "READY"].includes(batch.status)) {
    throw new Error("Employees can only be restored before approval.");
  }
  await updateBatchItem(itemId, { status: "PENDING", exclusion_reason: null });
  return validatePaymentBatch(organizationId, batchId);
}

export async function approvePaymentBatch(organizationId: string, batchId: string, actorId: string | null) {
  const { batch, issues } = await validatePaymentBatch(organizationId, batchId);
  if (issues.some((item) => item.severity === "ERROR")) {
    throw new Error("Resolve employee-level errors before approving this batch.");
  }
  if (batch.status !== "READY" && batch.status !== "APPROVED") {
    throw new Error("Only a ready batch can be approved.");
  }
  return updateBatch(batchId, {
    status: "APPROVED",
    approved_by: actorId,
    approved_at: stamp(),
  });
}

export async function cancelPaymentBatch(organizationId: string, batchId: string, reason: string) {
  const batch = await getBatch(organizationId, batchId);
  if (!batch) throw new Error("Payment batch not found.");
  if (batch.status === "PAID") throw new Error("A fully paid batch cannot be cancelled.");
  const note = reason.trim();
  if (note.length < 3) throw new Error("A cancel reason is required.");
  return updateBatch(batchId, {
    status: "CANCELLED",
    cancelled_at: stamp(),
    cancel_reason: note,
  });
}

type BankRow = {
  employee_code: string;
  account_holder_name: string;
  account_number: string;
  ifsc: string;
  amount: string;
  reference: string;
  remarks: string;
};

function parseColumns(settings: PaymentSettings) {
  try {
    const parsed = JSON.parse(settings.columns_json) as Array<{ key: string; header: string }>;
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    // Fall through to defaults.
  }
  return DEFAULT_BANK_COLUMNS.map((col) => ({ key: col.key, header: col.header }));
}

export async function buildBankFile(
  organizationId: string,
  batchId: string
): Promise<{ csv: string; filename: string; rowCount: number; rows: BankRow[] }> {
  const batch = await getBatch(organizationId, batchId);
  if (!batch) throw new Error("Payment batch not found.");
  if (!["APPROVED", "EXPORTED", "PARTIALLY_PAID", "PAID"].includes(batch.status)) {
    throw new Error("Approve the payment batch before exporting a bank file.");
  }
  const [items, banks, settings] = await Promise.all([
    listBatchItems(organizationId, batchId),
    listBankAccounts(organizationId),
    defaultPaymentSettings(organizationId),
  ]);
  const payable = items.filter((row) => row.status !== "EXCLUDED");
  const rows: BankRow[] = payable.map((item) => {
    const bank = banks.find((row) => row.employee_id === item.employee_id) ?? null;
    return {
      employee_code: item.employee_code,
      account_holder_name: bank?.account_holder_name ?? item.employee_name,
      account_number: bank?.account_number ?? "",
      ifsc: bank?.ifsc ?? item.ifsc ?? "",
      amount: item.amount.toFixed(2),
      reference: `${batch.period}-${item.employee_code}`,
      remarks: `Salary ${batch.period}`,
    };
  });
  const columns = parseColumns(settings);
  const headers = columns.map((col) => col.header);
  const csvRows = rows.map((row) => columns.map((col) => row[col.key as BankColumnKey] ?? ""));
  const csv = settings.include_header ? toCsv(headers, csvRows) : csvRows.map((row) => row.join(settings.delimiter || ",")).join("\n");
  const filename = `${settings.file_prefix || "salary-payment"}-${batch.period}-${batch.id.slice(0, 8)}.csv`;
  return { csv, filename, rowCount: rows.length, rows };
}

export async function exportPaymentBatch(
  organizationId: string,
  batchId: string,
  actorId: string | null,
  options: { duplicate?: boolean } = {}
): Promise<{ batch: PaymentBatch; export: AccountingExport; csv: string; filename: string }> {
  const batch = await getBatch(organizationId, batchId);
  if (!batch) throw new Error("Payment batch not found.");
  if (batch.status === "CANCELLED") throw new Error("A cancelled batch cannot be exported.");
  if (!["APPROVED", "EXPORTED", "PARTIALLY_PAID"].includes(batch.status) && batch.status !== "PAID") {
    throw new Error("Approve the payment batch before exporting a bank file.");
  }
  if (batch.export_count > 0 && !options.duplicate) {
    throw new Error("This bank file has already been exported. Confirm a duplicate export explicitly. Exporting does not mean the bank processed the file.");
  }
  const file = await buildBankFile(organizationId, batchId);
  const exportRow = await insertAccountingExport({
    id: crypto.randomUUID(),
    organization_id: organizationId,
    kind: "PAYMENT_BANK_FILE",
    journal_id: null,
    format: "CSV",
    reference: batch.id,
    row_count: file.rowCount,
    duplicate_of: null,
    storage_path: null,
    notes: options.duplicate ? "Authorized duplicate bank-file export. File is an instruction, not a payment confirmation." : "Bank file is an instruction only. It does not confirm that salaries were paid.",
    created_by: actorId,
    created_at: stamp(),
  });
  const nextStatus = batch.status === "APPROVED" ? "EXPORTED" : batch.status;
  const updated = await updateBatch(batchId, {
    status: nextStatus,
    export_count: batch.export_count + 1,
    exported_at: stamp(),
  });
  return { batch: updated ?? batch, export: exportRow, csv: file.csv, filename: file.filename };
}

function refreshBatchStatus(items: PaymentBatchItem[]): PaymentBatch["status"] {
  const payable = items.filter((row) => row.status !== "EXCLUDED");
  if (!payable.length) return "FAILED";
  const success = payable.filter((row) => row.status === "SUCCESS" || row.status === "RECONCILED");
  const failed = payable.filter((row) => row.status === "FAILED");
  if (success.length === payable.length) return "PAID";
  if (success.length > 0) return "PARTIALLY_PAID";
  if (failed.length === payable.length) return "FAILED";
  return "EXPORTED";
}

export async function recordPaymentOutcome(
  organizationId: string,
  input: {
    batchId: string;
    itemId: string;
    status: "SUCCESS" | "FAILED" | "REVERSED" | "RECONCILED";
    amount?: number;
    paymentDate: string;
    reference?: string | null;
    bankReference?: string | null;
    failureReason?: string | null;
    notes?: string | null;
    source?: "MANUAL" | "IMPORT";
  },
  actorId: string | null
) {
  const batch = await getBatch(organizationId, input.batchId);
  if (!batch) throw new Error("Payment batch not found.");
  if (!ACTIVE_BATCH_STATUSES.includes(batch.status) && batch.status !== "FAILED") {
    throw new Error("Outcomes cannot be recorded on a cancelled batch.");
  }
  const items = await listBatchItems(organizationId, input.batchId);
  const item = items.find((row) => row.id === input.itemId);
  if (!item) throw new Error("Payment item not found.");
  if (item.status === "EXCLUDED") throw new Error("Excluded employees cannot receive a payment outcome.");
  const amount = round(input.amount ?? item.amount);
  if (input.status === "SUCCESS" && amount !== round(item.amount)) {
    throw new Error("Successful payment amount must match the batch amount. Record a mismatch through reconciliation instead.");
  }
  const txn: PaymentTransaction = {
    id: crypto.randomUUID(),
    organization_id: organizationId,
    batch_id: input.batchId,
    item_id: item.id,
    employee_id: item.employee_id,
    amount,
    payment_date: input.paymentDate,
    reference: input.reference ?? null,
    bank_reference: input.bankReference ?? null,
    status: input.status,
    failure_reason: input.failureReason ?? null,
    notes: input.notes ?? null,
    source: input.source ?? "MANUAL",
    created_by: actorId,
    created_at: stamp(),
  };
  await insertTransaction(txn);
  await updateBatchItem(item.id, { status: input.status });
  const next = await listBatchItems(organizationId, input.batchId);
  await updateBatch(input.batchId, { status: refreshBatchStatus(next) });
  if (input.status === "FAILED") {
    await emitSafe({
      organizationId,
      eventType: "payment.failed",
      entityType: "payment_batch_item",
      entityId: item.id,
      actorId,
      payload: { employeeId: item.employee_id, status: "FAILED", href: "/payments", body: input.failureReason ?? "A salary payment item failed." },
      idempotencyKey: `payment.failed:${item.id}:${txn.id}`,
    });
  }
  return txn;
}

export type ReconciliationPreviewRow = {
  employeeCode: string;
  amount: number;
  status: "SUCCESS" | "FAILED";
  reference: string | null;
  bankReference: string | null;
  paymentDate: string;
  match: "MATCHED" | "UNMATCHED" | "DUPLICATE" | "AMOUNT_MISMATCH";
  itemId: string | null;
  message: string;
};

function parseCsv(text: string) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((line) => line.trim().length);
  if (!lines.length) return { headers: [] as string[], rows: [] as string[][] };
  const split = (line: string) => {
    const cells: string[] = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else if (ch === '"') quoted = false;
        else current += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ",") {
        cells.push(current.trim());
        current = "";
      } else current += ch;
    }
    cells.push(current.trim());
    return cells;
  };
  const headers = split(lines[0]).map((item) => item.toLowerCase());
  const rows = lines.slice(1).map(split);
  return { headers, rows };
}

function col(headers: string[], row: string[], names: string[]) {
  const index = headers.findIndex((header) => names.includes(header));
  return index >= 0 ? row[index] ?? "" : "";
}

export async function previewReconciliation(organizationId: string, batchId: string, csvText: string, fileName?: string | null) {
  const batch = await getBatch(organizationId, batchId);
  if (!batch) throw new Error("Payment batch not found.");
  const [items, existing] = await Promise.all([listBatchItems(organizationId, batchId), listTransactions(organizationId, batchId)]);
  const parsed = parseCsv(csvText);
  if (!parsed.headers.length) throw new Error("The uploaded file has no header row.");
  const preview: ReconciliationPreviewRow[] = [];
  const seen = new Set<string>();
  for (const row of parsed.rows) {
    const employeeCode = col(parsed.headers, row, ["employee code", "employee_code", "code", "empcode"]);
    const amount = Number(col(parsed.headers, row, ["amount", "net", "net pay", "net_pay"]));
    const statusRaw = col(parsed.headers, row, ["status", "result"]).toUpperCase();
    const status = statusRaw === "FAILED" || statusRaw === "FAIL" ? "FAILED" : "SUCCESS";
    const reference = col(parsed.headers, row, ["payment reference", "reference", "ref"]) || null;
    const bankReference = col(parsed.headers, row, ["bank reference", "bank_reference", "utr", "txn id"]) || null;
    const paymentDate = col(parsed.headers, row, ["date", "payment date", "payment_date"]) || batch.payment_date;
    const item = items.find((candidate) => candidate.employee_code.toLowerCase() === employeeCode.toLowerCase() && candidate.status !== "EXCLUDED") ?? null;
    const key = `${employeeCode}|${round(amount)}|${reference ?? ""}`;
    let match: ReconciliationPreviewRow["match"] = "UNMATCHED";
    let message = "No matching payment instruction.";
    if (!employeeCode) {
      message = "Employee code is missing.";
    } else if (!Number.isFinite(amount)) {
      message = "Amount is not a number.";
    } else if (!item) {
      match = "UNMATCHED";
    } else if (seen.has(key) || existing.some((txn) => txn.item_id === item.id && txn.reference === reference && txn.amount === round(amount))) {
      match = "DUPLICATE";
      message = "Duplicate outcome for this employee/amount/reference.";
    } else if (round(amount) !== round(item.amount)) {
      match = "AMOUNT_MISMATCH";
      message = `Imported ${round(amount)} does not match instruction ${round(item.amount)}.`;
    } else {
      match = "MATCHED";
      message = "Ready to post.";
    }
    if (match === "MATCHED" || match === "DUPLICATE") seen.add(key);
    preview.push({
      employeeCode,
      amount: Number.isFinite(amount) ? round(amount) : 0,
      status,
      reference,
      bankReference,
      paymentDate,
      match,
      itemId: item?.id ?? null,
      message,
    });
  }
  const summary = {
    matched_count: preview.filter((row) => row.match === "MATCHED").length,
    unmatched_count: preview.filter((row) => row.match === "UNMATCHED").length,
    duplicate_count: preview.filter((row) => row.match === "DUPLICATE").length,
    mismatch_count: preview.filter((row) => row.match === "AMOUNT_MISMATCH").length,
  };
  const reconciliation = await insertReconciliation({
    id: crypto.randomUUID(),
    organization_id: organizationId,
    batch_id: batchId,
    file_name: fileName ?? null,
    status: "PREVIEW",
    matched_count: summary.matched_count,
    unmatched_count: summary.unmatched_count,
    duplicate_count: summary.duplicate_count,
    mismatch_count: summary.mismatch_count,
    summary_json: JSON.stringify({ rows: preview }),
    created_by: null,
    confirmed_at: null,
    created_at: stamp(),
  });
  return { reconciliation, preview, summary, maskHint: "Account numbers are never stored from the import file." };
}

export async function confirmReconciliation(organizationId: string, reconciliationId: string, actorId: string | null) {
  const { listReconciliations } = await import("@/lib/payments/repository");
  const rows = await listReconciliations(organizationId);
  const reconciliation = rows.find((row) => row.id === reconciliationId);
  if (!reconciliation) throw new Error("Reconciliation preview not found.");
  if (reconciliation.status !== "PREVIEW") throw new Error("This reconciliation is no longer a preview.");
  const parsed = JSON.parse(reconciliation.summary_json || '{"rows":[]}') as { rows: ReconciliationPreviewRow[] };
  const matched = parsed.rows.filter((row) => row.match === "MATCHED" && row.itemId);
  for (const row of matched) {
    await recordPaymentOutcome(
      organizationId,
      {
        batchId: reconciliation.batch_id,
        itemId: row.itemId as string,
        status: row.status,
        amount: row.amount,
        paymentDate: row.paymentDate,
        reference: row.reference,
        bankReference: row.bankReference,
        source: "IMPORT",
        notes: "Posted from bank-result import.",
      },
      actorId
    );
  }
  return updateReconciliation(reconciliationId, {
    status: "CONFIRMED",
    confirmed_at: stamp(),
    created_by: actorId,
  });
}

export function maskedAccount(value: string | null | undefined) {
  return maskAccountNumber(value);
}
