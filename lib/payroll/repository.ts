import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ComplianceFiling,
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
  PayslipSequence,
  StatutoryRule,
} from "@/types";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

function stamp() {
  return new Date().toISOString();
}

export { demoEnabled };

async function listRows<T>(table: string, organizationId: string, order?: string) {
  if (demoEnabled()) {
    const store = getDemoStore() as unknown as Record<string, T[]>;
    const key =
      table === "statutory_rules"
        ? "statutoryRules"
        : table === "payroll_runs"
          ? "payrollRuns"
          : table === "payroll_items"
            ? "payrollItems"
            : table === "payroll_lines"
              ? "payrollLines"
              : table === "payslips"
                ? "payslips"
                : table === "compliance_filings"
                  ? "complianceFilings"
                  : table === "payroll_exceptions"
                    ? "payrollExceptions"
                    : table === "payroll_approval_history"
                      ? "payrollApprovalHistory"
                      : table === "payroll_snapshots"
                        ? "payrollSnapshots"
                        : table === "payroll_finalization_logs"
                          ? "payrollFinalizationLogs"
                          : table === "payroll_adjustments"
                            ? "payrollAdjustments"
                            : table === "payslip_line_items"
                              ? "payslipLineItems"
                              : table;
    return ((store[key] ?? []) as T[]).filter((item) => (item as { organization_id: string }).organization_id === organizationId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from(table).select("*").eq("organization_id", organizationId);
  if (order) query = query.order(order, { ascending: false });
  const { data } = await query;
  return (data ?? []) as T[];
}

async function insertRow<T extends { id: string }>(table: string, collection: keyof ReturnType<typeof getDemoStore>, row: T) {
  if (demoEnabled()) {
    (getDemoStore()[collection] as unknown as T[]).unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from(table).insert(row).select("*").single();
  if (error) throw error;
  return data as T;
}

async function updateRow<T extends { id: string }>(
  table: string,
  collection: keyof ReturnType<typeof getDemoStore>,
  id: string,
  patch: Partial<T>
) {
  if (demoEnabled()) {
    const row = (getDemoStore()[collection] as unknown as T[]).find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, "updated_at" in row ? { updated_at: stamp() } : {});
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from(table).update({ ...patch, updated_at: stamp() }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data as T | null;
}

export async function listStatutoryRules(organizationId: string) {
  if (demoEnabled()) return getDemoStore().statutoryRules.filter((item) => item.organization_id === organizationId);
  return listRows<StatutoryRule>("statutory_rules", organizationId, "effective_from");
}
export async function insertStatutoryRule(row: StatutoryRule) {
  return insertRow("statutory_rules", "statutoryRules", row);
}
export async function updateStatutoryRule(id: string, patch: Partial<StatutoryRule>) {
  return updateRow("statutory_rules", "statutoryRules", id, patch);
}

export async function listPayrollRuns(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore()
      .payrollRuns.filter((item) => item.organization_id === organizationId)
      .slice()
      .sort((a, b) => b.period.localeCompare(a.period));
  }
  return listRows<PayrollRun>("payroll_runs", organizationId, "period");
}
export async function getPayrollRun(organizationId: string, id: string) {
  const rows = await listPayrollRuns(organizationId);
  return rows.find((item) => item.id === id) ?? null;
}
export async function getPayrollRunByPeriod(organizationId: string, period: string) {
  const rows = await listPayrollRuns(organizationId);
  return rows.find((item) => item.period === period) ?? null;
}
export async function insertPayrollRun(row: PayrollRun) {
  return insertRow("payroll_runs", "payrollRuns", row);
}
export async function updatePayrollRun(id: string, patch: Partial<PayrollRun>) {
  return updateRow("payroll_runs", "payrollRuns", id, patch);
}

export async function listPayrollItems(organizationId: string, runId?: string) {
  if (demoEnabled()) {
    return getDemoStore().payrollItems.filter(
      (item) => item.organization_id === organizationId && (!runId || item.run_id === runId)
    );
  }
  const rows = await listRows<PayrollItem>("payroll_items", organizationId);
  return runId ? rows.filter((item) => item.run_id === runId) : rows;
}
export async function getPayrollItem(organizationId: string, id: string) {
  const rows = await listPayrollItems(organizationId);
  return rows.find((item) => item.id === id) ?? null;
}
export async function insertPayrollItem(row: PayrollItem) {
  return insertRow("payroll_items", "payrollItems", row);
}
export async function updatePayrollItem(id: string, patch: Partial<PayrollItem>) {
  return updateRow("payroll_items", "payrollItems", id, patch);
}
export async function replacePayrollItems(organizationId: string, runId: string, rows: PayrollItem[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.payrollItems = store.payrollItems.filter((item) => item.run_id !== runId);
    store.payrollItems.unshift(...rows);
    return rows;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("payroll_items").delete().eq("run_id", runId).eq("organization_id", organizationId);
  if (!rows.length) return rows;
  const { error } = await admin.from("payroll_items").insert(rows);
  if (error) throw error;
  return rows;
}

export async function listPayrollLines(organizationId: string, runId?: string, itemId?: string) {
  if (demoEnabled()) {
    return getDemoStore()
      .payrollLines.filter(
        (item) =>
          item.organization_id === organizationId &&
          (!runId || item.run_id === runId) &&
          (!itemId || item.item_id === itemId)
      )
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  const rows = await listRows<PayrollLine>("payroll_lines", organizationId);
  return rows
    .filter((item) => (!runId || item.run_id === runId) && (!itemId || item.item_id === itemId))
    .sort((a, b) => a.sort_order - b.sort_order);
}
export async function insertPayrollLine(row: PayrollLine) {
  return insertRow("payroll_lines", "payrollLines", row);
}
export async function replacePayrollLines(organizationId: string, runId: string, rows: PayrollLine[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.payrollLines = store.payrollLines.filter((item) => item.run_id !== runId);
    store.payrollLines.unshift(...rows);
    return rows;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("payroll_lines").delete().eq("run_id", runId).eq("organization_id", organizationId);
  if (!rows.length) return rows;
  const { error } = await admin.from("payroll_lines").insert(rows);
  if (error) throw error;
  return rows;
}

export async function listPayslips(organizationId: string, runId?: string) {
  if (demoEnabled()) {
    return getDemoStore().payslips.filter(
      (item) => item.organization_id === organizationId && (!runId || item.run_id === runId)
    );
  }
  const rows = await listRows<Payslip>("payslips", organizationId, "period");
  return runId ? rows.filter((item) => item.run_id === runId) : rows;
}
export async function getPayslip(organizationId: string, id: string) {
  const rows = await listPayslips(organizationId);
  return rows.find((item) => item.id === id) ?? null;
}
export async function insertPayslip(row: Payslip) {
  return insertRow("payslips", "payslips", row);
}
export async function updatePayslip(id: string, patch: Partial<Payslip>) {
  return updateRow("payslips", "payslips", id, patch);
}
export async function replacePayslips(organizationId: string, runId: string, rows: Payslip[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.payslips = store.payslips.filter((item) => item.run_id !== runId);
    store.payslips.unshift(...rows);
    return rows;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("payslips").delete().eq("run_id", runId).eq("organization_id", organizationId);
  if (!rows.length) return rows;
  const { error } = await admin.from("payslips").insert(rows);
  if (error) throw error;
  return rows;
}

export async function listComplianceFilings(organizationId: string, runId?: string) {
  if (demoEnabled()) {
    return getDemoStore().complianceFilings.filter(
      (item) => item.organization_id === organizationId && (!runId || item.run_id === runId)
    );
  }
  const rows = await listRows<ComplianceFiling>("compliance_filings", organizationId);
  return runId ? rows.filter((item) => item.run_id === runId) : rows;
}
export async function insertComplianceFiling(row: ComplianceFiling) {
  return insertRow("compliance_filings", "complianceFilings", row);
}
export async function updateComplianceFiling(id: string, patch: Partial<ComplianceFiling>) {
  return updateRow("compliance_filings", "complianceFilings", id, patch);
}
export async function replaceComplianceFilings(organizationId: string, runId: string, rows: ComplianceFiling[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.complianceFilings = store.complianceFilings.filter((item) => item.run_id !== runId);
    store.complianceFilings.unshift(...rows);
    return rows;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("compliance_filings").delete().eq("run_id", runId).eq("organization_id", organizationId);
  if (!rows.length) return rows;
  const { error } = await admin.from("compliance_filings").insert(rows);
  if (error) throw error;
  return rows;
}

export async function listPayrollExceptions(organizationId: string, runId?: string) {
  if (demoEnabled()) {
    return getDemoStore().payrollExceptions.filter(
      (item) => item.organization_id === organizationId && (!runId || item.run_id === runId)
    );
  }
  const rows = await listRows<PayrollException>("payroll_exceptions", organizationId, "created_at");
  return runId ? rows.filter((item) => item.run_id === runId) : rows;
}
export async function getPayrollException(organizationId: string, id: string) {
  const rows = await listPayrollExceptions(organizationId);
  return rows.find((item) => item.id === id) ?? null;
}
export async function insertPayrollException(row: PayrollException) {
  return insertRow("payroll_exceptions", "payrollExceptions", row);
}
export async function updatePayrollException(id: string, patch: Partial<PayrollException>) {
  return updateRow("payroll_exceptions", "payrollExceptions", id, patch);
}
export async function replacePayrollExceptions(organizationId: string, runId: string, rows: PayrollException[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.payrollExceptions = store.payrollExceptions.filter((item) => item.run_id !== runId);
    store.payrollExceptions.unshift(...rows);
    return rows;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("payroll_exceptions").delete().eq("run_id", runId).eq("organization_id", organizationId);
  if (!rows.length) return rows;
  const { error } = await admin.from("payroll_exceptions").insert(rows);
  if (error) throw error;
  return rows;
}

export async function listPayrollApprovalHistory(organizationId: string, runId?: string) {
  if (demoEnabled()) {
    return getDemoStore()
      .payrollApprovalHistory.filter((item) => item.organization_id === organizationId && (!runId || item.run_id === runId))
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  const rows = await listRows<PayrollApprovalHistory>("payroll_approval_history", organizationId, "created_at");
  return (runId ? rows.filter((item) => item.run_id === runId) : rows).slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
}
export async function insertPayrollApprovalHistory(row: PayrollApprovalHistory) {
  if (demoEnabled()) {
    getDemoStore().payrollApprovalHistory.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("payroll_approval_history").insert(row).select("*").single();
  if (error) throw error;
  return data as PayrollApprovalHistory;
}

export async function getPayrollSnapshot(organizationId: string, runId: string) {
  if (demoEnabled()) {
    return getDemoStore().payrollSnapshots.find((item) => item.organization_id === organizationId && item.run_id === runId) ?? null;
  }
  const rows = await listRows<PayrollSnapshot>("payroll_snapshots", organizationId);
  return rows.find((item) => item.run_id === runId) ?? null;
}
export async function insertPayrollSnapshot(row: PayrollSnapshot) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const existing = store.payrollSnapshots.find((item) => item.run_id === row.run_id);
    if (existing) throw new Error("A payroll snapshot already exists for this run.");
    store.payrollSnapshots.unshift(row);
    return row;
  }
  return insertRow("payroll_snapshots", "payrollSnapshots", row);
}

export async function listPayrollFinalizationLogs(organizationId: string, runId?: string) {
  if (demoEnabled()) {
    return getDemoStore().payrollFinalizationLogs.filter(
      (item) => item.organization_id === organizationId && (!runId || item.run_id === runId)
    );
  }
  const rows = await listRows<PayrollFinalizationLog>("payroll_finalization_logs", organizationId, "created_at");
  return runId ? rows.filter((item) => item.run_id === runId) : rows;
}
export async function insertPayrollFinalizationLog(row: PayrollFinalizationLog) {
  if (demoEnabled()) {
    getDemoStore().payrollFinalizationLogs.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("payroll_finalization_logs").insert(row).select("*").single();
  if (error) throw error;
  return data as PayrollFinalizationLog;
}

export async function listPayrollAdjustments(organizationId: string, runId?: string) {
  if (demoEnabled()) {
    return getDemoStore().payrollAdjustments.filter(
      (item) => item.organization_id === organizationId && (!runId || item.run_id === runId)
    );
  }
  const rows = await listRows<PayrollAdjustment>("payroll_adjustments", organizationId, "created_at");
  return runId ? rows.filter((item) => item.run_id === runId) : rows;
}
export async function insertPayrollAdjustment(row: PayrollAdjustment) {
  return insertRow("payroll_adjustments", "payrollAdjustments", row);
}
export async function updatePayrollAdjustment(id: string, patch: Partial<PayrollAdjustment>) {
  return updateRow("payroll_adjustments", "payrollAdjustments", id, patch);
}

export async function listPayslipLineItems(organizationId: string, payslipId?: string) {
  if (demoEnabled()) {
    return getDemoStore()
      .payslipLineItems.filter((item) => item.organization_id === organizationId && (!payslipId || item.payslip_id === payslipId))
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  const rows = await listRows<PayslipLineItem>("payslip_line_items", organizationId);
  return rows
    .filter((item) => !payslipId || item.payslip_id === payslipId)
    .sort((a, b) => a.sort_order - b.sort_order);
}
export async function replacePayslipLineItems(organizationId: string, payslipId: string, rows: PayslipLineItem[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.payslipLineItems = store.payslipLineItems.filter((item) => item.payslip_id !== payslipId);
    store.payslipLineItems.unshift(...rows);
    return rows;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("payslip_line_items").delete().eq("payslip_id", payslipId).eq("organization_id", organizationId);
  if (!rows.length) return rows;
  const { error } = await admin.from("payslip_line_items").insert(rows);
  if (error) throw error;
  return rows;
}

export async function nextPayslipSequence(organizationId: string, fiscalYear: string, monthCode: string) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const found = store.payslipSequences.find(
      (item) => item.organization_id === organizationId && item.fiscal_year === fiscalYear && item.month_code === monthCode
    );
    if (found) {
      found.last_value += 1;
      found.updated_at = stamp();
      return found.last_value;
    }
    const row: PayslipSequence = {
      organization_id: organizationId,
      fiscal_year: fiscalYear,
      month_code: monthCode,
      last_value: 1,
      updated_at: stamp(),
    };
    store.payslipSequences.unshift(row);
    return 1;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data: existing } = await admin
    .from("payslip_sequences")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("fiscal_year", fiscalYear)
    .eq("month_code", monthCode)
    .maybeSingle();
  if (existing) {
    const next = Number(existing.last_value) + 1;
    const { error } = await admin
      .from("payslip_sequences")
      .update({ last_value: next, updated_at: stamp() })
      .eq("organization_id", organizationId)
      .eq("fiscal_year", fiscalYear)
      .eq("month_code", monthCode);
    if (error) throw error;
    return next;
  }
  const { error } = await admin.from("payslip_sequences").insert({
    organization_id: organizationId,
    fiscal_year: fiscalYear,
    month_code: monthCode,
    last_value: 1,
    updated_at: stamp(),
  });
  if (error) throw error;
  return 1;
}

export async function insertPayrollLineLive(row: PayrollLine) {
  return insertPayrollLine(row);
}
