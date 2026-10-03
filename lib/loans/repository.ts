import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  LoanAccount,
  LoanAdjustment,
  LoanApplication,
  LoanApproval,
  LoanLedgerEntry,
  LoanPolicy,
  LoanRepayment,
  LoanScheduleItem,
  LoanType,
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
    return (store[table] ?? []).filter((item) => (item as { organization_id: string }).organization_id === organizationId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from(table).select("*").eq("organization_id", organizationId);
  if (order) query = query.order(order);
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

export async function listLoanTypes(organizationId: string) {
  if (demoEnabled()) return getDemoStore().loanTypes.filter((item) => item.organization_id === organizationId);
  return listRows<LoanType>("loan_types", organizationId, "name");
}
export async function insertLoanType(row: LoanType) {
  return insertRow("loan_types", "loanTypes", row);
}
export async function updateLoanType(id: string, patch: Partial<LoanType>) {
  return updateRow("loan_types", "loanTypes", id, patch);
}

export async function listLoanPolicies(organizationId: string) {
  if (demoEnabled()) return getDemoStore().loanPolicies.filter((item) => item.organization_id === organizationId);
  return listRows<LoanPolicy>("loan_policies", organizationId, "name");
}
export async function insertLoanPolicy(row: LoanPolicy) {
  return insertRow("loan_policies", "loanPolicies", row);
}
export async function updateLoanPolicy(id: string, patch: Partial<LoanPolicy>) {
  return updateRow("loan_policies", "loanPolicies", id, patch);
}

export async function listLoanApplications(organizationId: string) {
  if (demoEnabled()) return getDemoStore().loanApplications.filter((item) => item.organization_id === organizationId);
  return listRows<LoanApplication>("loan_applications", organizationId, "requested_date");
}
export async function getLoanApplication(organizationId: string, id: string) {
  const rows = await listLoanApplications(organizationId);
  return rows.find((item) => item.id === id) ?? null;
}
export async function insertLoanApplication(row: LoanApplication) {
  return insertRow("loan_applications", "loanApplications", row);
}
export async function updateLoanApplication(id: string, patch: Partial<LoanApplication>) {
  return updateRow("loan_applications", "loanApplications", id, patch);
}

export async function listLoanAccounts(organizationId: string) {
  if (demoEnabled()) return getDemoStore().loanAccounts.filter((item) => item.organization_id === organizationId);
  return listRows<LoanAccount>("loan_accounts", organizationId, "start_date");
}
export async function getLoanAccount(organizationId: string, id: string) {
  const rows = await listLoanAccounts(organizationId);
  return rows.find((item) => item.id === id) ?? null;
}
export async function insertLoanAccount(row: LoanAccount) {
  return insertRow("loan_accounts", "loanAccounts", row);
}
export async function updateLoanAccount(id: string, patch: Partial<LoanAccount>) {
  return updateRow("loan_accounts", "loanAccounts", id, patch);
}

export async function listLoanSchedule(organizationId: string, accountId?: string) {
  if (demoEnabled()) {
    return getDemoStore()
      .loanSchedule.filter((item) => item.organization_id === organizationId && (!accountId || item.account_id === accountId))
      .slice()
      .sort((a, b) => a.installment_number - b.installment_number);
  }
  const rows = await listRows<LoanScheduleItem>("loan_schedule", organizationId, "due_date");
  return accountId ? rows.filter((item) => item.account_id === accountId) : rows;
}
export async function insertLoanScheduleItem(row: LoanScheduleItem) {
  return insertRow("loan_schedule", "loanSchedule", row);
}
export async function updateLoanScheduleItem(id: string, patch: Partial<LoanScheduleItem>) {
  return updateRow("loan_schedule", "loanSchedule", id, patch);
}

export async function listLoanRepayments(organizationId: string, accountId?: string) {
  if (demoEnabled()) {
    return getDemoStore().loanRepayments.filter(
      (item) => item.organization_id === organizationId && (!accountId || item.account_id === accountId)
    );
  }
  const rows = await listRows<LoanRepayment>("loan_repayments", organizationId, "payment_date");
  return accountId ? rows.filter((item) => item.account_id === accountId) : rows;
}
export async function insertLoanRepayment(row: LoanRepayment) {
  return insertRow("loan_repayments", "loanRepayments", row);
}

export async function listLoanAdjustments(organizationId: string, accountId?: string) {
  if (demoEnabled()) {
    return getDemoStore().loanAdjustments.filter(
      (item) => item.organization_id === organizationId && (!accountId || item.account_id === accountId)
    );
  }
  const rows = await listRows<LoanAdjustment>("loan_adjustments", organizationId);
  return accountId ? rows.filter((item) => item.account_id === accountId) : rows;
}
export async function insertLoanAdjustment(row: LoanAdjustment) {
  return insertRow("loan_adjustments", "loanAdjustments", row);
}

export async function listLoanApprovals(organizationId: string, applicationId?: string) {
  if (demoEnabled()) {
    return getDemoStore().loanApprovals.filter(
      (item) => item.organization_id === organizationId && (!applicationId || item.application_id === applicationId)
    );
  }
  const rows = await listRows<LoanApproval>("loan_approvals", organizationId);
  return applicationId ? rows.filter((item) => item.application_id === applicationId) : rows;
}
export async function insertLoanApproval(row: LoanApproval) {
  return insertRow("loan_approvals", "loanApprovals", row);
}

export async function listLoanLedger(organizationId: string, accountId?: string) {
  if (demoEnabled()) {
    return getDemoStore().loanLedger.filter(
      (item) => item.organization_id === organizationId && (!accountId || item.account_id === accountId)
    );
  }
  const rows = await listRows<LoanLedgerEntry>("loan_ledger", organizationId);
  return accountId ? rows.filter((item) => item.account_id === accountId) : rows;
}
export async function insertLoanLedger(row: LoanLedgerEntry) {
  return insertRow("loan_ledger", "loanLedger", row);
}
