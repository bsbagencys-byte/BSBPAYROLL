import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AccountingAccount,
  AccountingExport,
  PayrollAccountMapping,
  PayrollJournal,
  PayrollJournalLine,
} from "@/types";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

function stamp() {
  return new Date().toISOString();
}

export { demoEnabled };

function byOrg<T extends { organization_id: string }>(rows: T[], organizationId: string) {
  return rows.filter((row) => row.organization_id === organizationId);
}

export async function listAccounts(organizationId: string): Promise<AccountingAccount[]> {
  if (demoEnabled()) {
    return byOrg(getDemoStore().accountingAccounts, organizationId).slice().sort((a, b) => a.code.localeCompare(b.code));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("accounting_accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("code", { ascending: true });
  return (data ?? []) as AccountingAccount[];
}

export async function getAccount(organizationId: string, id: string) {
  const rows = await listAccounts(organizationId);
  return rows.find((row) => row.id === id) ?? null;
}

export async function insertAccount(row: AccountingAccount): Promise<AccountingAccount> {
  if (demoEnabled()) {
    getDemoStore().accountingAccounts.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("accounting_accounts").insert(row).select("*").single();
  if (error) throw error;
  return data as AccountingAccount;
}

export async function updateAccount(id: string, patch: Partial<AccountingAccount>) {
  if (demoEnabled()) {
    const row = getDemoStore().accountingAccounts.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("accounting_accounts")
    .update({ ...patch, updated_at: stamp() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as AccountingAccount | null) ?? null;
}

export async function listMappings(organizationId: string): Promise<PayrollAccountMapping[]> {
  if (demoEnabled()) {
    return byOrg(getDemoStore().payrollAccountMappings, organizationId)
      .slice()
      .sort((a, b) => a.category.localeCompare(b.category) || (a.component_code ?? "").localeCompare(b.component_code ?? ""));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("payroll_account_mappings")
    .select("*")
    .eq("organization_id", organizationId)
    .order("category", { ascending: true });
  return (data ?? []) as PayrollAccountMapping[];
}

export async function insertMapping(row: PayrollAccountMapping): Promise<PayrollAccountMapping> {
  if (demoEnabled()) {
    getDemoStore().payrollAccountMappings.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("payroll_account_mappings").insert(row).select("*").single();
  if (error) throw error;
  return data as PayrollAccountMapping;
}

export async function updateMapping(id: string, patch: Partial<PayrollAccountMapping>) {
  if (demoEnabled()) {
    const row = getDemoStore().payrollAccountMappings.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("payroll_account_mappings")
    .update({ ...patch, updated_at: stamp() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as PayrollAccountMapping | null) ?? null;
}

export async function listJournals(organizationId: string): Promise<PayrollJournal[]> {
  if (demoEnabled()) {
    return byOrg(getDemoStore().payrollJournals, organizationId)
      .slice()
      .sort((a, b) => b.period.localeCompare(a.period) || b.created_at.localeCompare(a.created_at));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("payroll_journals")
    .select("*")
    .eq("organization_id", organizationId)
    .order("period", { ascending: false });
  return (data ?? []) as PayrollJournal[];
}

export async function getJournal(organizationId: string, id: string) {
  const rows = await listJournals(organizationId);
  return rows.find((row) => row.id === id) ?? null;
}

export async function getJournalForRun(organizationId: string, runId: string) {
  const rows = await listJournals(organizationId);
  return rows.find((row) => row.run_id === runId && row.status !== "VOID") ?? null;
}

export async function insertJournal(row: PayrollJournal): Promise<PayrollJournal> {
  if (demoEnabled()) {
    getDemoStore().payrollJournals.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("payroll_journals").insert(row).select("*").single();
  if (error) throw error;
  return data as PayrollJournal;
}

export async function updateJournal(id: string, patch: Partial<PayrollJournal>) {
  if (demoEnabled()) {
    const row = getDemoStore().payrollJournals.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("payroll_journals")
    .update({ ...patch, updated_at: stamp() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as PayrollJournal | null) ?? null;
}

export async function listJournalLines(organizationId: string, journalId: string): Promise<PayrollJournalLine[]> {
  if (demoEnabled()) {
    return byOrg(getDemoStore().payrollJournalLines, organizationId)
      .filter((row) => row.journal_id === journalId)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("payroll_journal_lines")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("journal_id", journalId)
    .order("sort_order", { ascending: true });
  return (data ?? []) as PayrollJournalLine[];
}

export async function replaceJournalLines(organizationId: string, journalId: string, rows: PayrollJournalLine[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.payrollJournalLines = store.payrollJournalLines.filter((row) => row.journal_id !== journalId);
    store.payrollJournalLines.unshift(...rows);
    return rows;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("payroll_journal_lines").delete().eq("organization_id", organizationId).eq("journal_id", journalId);
  if (!rows.length) return rows;
  const { error } = await admin.from("payroll_journal_lines").insert(rows);
  if (error) throw error;
  return rows;
}

export async function listAccountingExports(organizationId: string): Promise<AccountingExport[]> {
  if (demoEnabled()) {
    return byOrg(getDemoStore().accountingExports, organizationId)
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("accounting_exports")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as AccountingExport[];
}

export async function insertAccountingExport(row: AccountingExport): Promise<AccountingExport> {
  if (demoEnabled()) {
    getDemoStore().accountingExports.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("accounting_exports").insert(row).select("*").single();
  if (error) throw error;
  return data as AccountingExport;
}
