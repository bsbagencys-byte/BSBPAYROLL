import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AccountingExport,
  PaymentBatch,
  PaymentBatchItem,
  PaymentReconciliation,
  PaymentSettings,
  PaymentTransaction,
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

export async function listBatches(organizationId: string): Promise<PaymentBatch[]> {
  if (demoEnabled()) {
    return byOrg(getDemoStore().paymentBatches, organizationId)
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("payment_batches")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as PaymentBatch[];
}

export async function getBatch(organizationId: string, id: string) {
  const rows = await listBatches(organizationId);
  return rows.find((row) => row.id === id) ?? null;
}

export async function getBatchForRun(organizationId: string, runId: string) {
  const rows = await listBatches(organizationId);
  return rows.find((row) => row.run_id === runId && !["FAILED", "CANCELLED"].includes(row.status)) ?? null;
}

export async function insertBatch(row: PaymentBatch): Promise<PaymentBatch> {
  if (demoEnabled()) {
    getDemoStore().paymentBatches.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("payment_batches").insert(row).select("*").single();
  if (error) throw error;
  return data as PaymentBatch;
}

export async function updateBatch(id: string, patch: Partial<PaymentBatch>) {
  if (demoEnabled()) {
    const row = getDemoStore().paymentBatches.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("payment_batches")
    .update({ ...patch, updated_at: stamp() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as PaymentBatch | null) ?? null;
}

export async function listBatchItems(organizationId: string, batchId: string): Promise<PaymentBatchItem[]> {
  if (demoEnabled()) {
    return byOrg(getDemoStore().paymentBatchItems, organizationId)
      .filter((row) => row.batch_id === batchId)
      .slice()
      .sort((a, b) => a.employee_code.localeCompare(b.employee_code));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("payment_batch_items")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("batch_id", batchId)
    .order("employee_code", { ascending: true });
  return (data ?? []) as PaymentBatchItem[];
}

export async function replaceBatchItems(organizationId: string, batchId: string, rows: PaymentBatchItem[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.paymentBatchItems = store.paymentBatchItems.filter((row) => row.batch_id !== batchId);
    store.paymentBatchItems.unshift(...rows);
    return rows;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("payment_batch_items").delete().eq("organization_id", organizationId).eq("batch_id", batchId);
  if (!rows.length) return rows;
  const { error } = await admin.from("payment_batch_items").insert(rows);
  if (error) throw error;
  return rows;
}

export async function updateBatchItem(id: string, patch: Partial<PaymentBatchItem>) {
  if (demoEnabled()) {
    const row = getDemoStore().paymentBatchItems.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("payment_batch_items")
    .update({ ...patch, updated_at: stamp() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as PaymentBatchItem | null) ?? null;
}

export async function listTransactions(organizationId: string, batchId?: string): Promise<PaymentTransaction[]> {
  if (demoEnabled()) {
    return byOrg(getDemoStore().paymentTransactions, organizationId)
      .filter((row) => !batchId || row.batch_id === batchId)
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("payment_transactions").select("*").eq("organization_id", organizationId);
  if (batchId) query = query.eq("batch_id", batchId);
  const { data } = await query.order("created_at", { ascending: false });
  return (data ?? []) as PaymentTransaction[];
}

export async function insertTransaction(row: PaymentTransaction): Promise<PaymentTransaction> {
  if (demoEnabled()) {
    getDemoStore().paymentTransactions.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("payment_transactions").insert(row).select("*").single();
  if (error) throw error;
  return data as PaymentTransaction;
}

export async function listReconciliations(organizationId: string, batchId?: string): Promise<PaymentReconciliation[]> {
  if (demoEnabled()) {
    return byOrg(getDemoStore().paymentReconciliations, organizationId)
      .filter((row) => !batchId || row.batch_id === batchId)
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("payment_reconciliations").select("*").eq("organization_id", organizationId);
  if (batchId) query = query.eq("batch_id", batchId);
  const { data } = await query.order("created_at", { ascending: false });
  return (data ?? []) as PaymentReconciliation[];
}

export async function insertReconciliation(row: PaymentReconciliation): Promise<PaymentReconciliation> {
  if (demoEnabled()) {
    getDemoStore().paymentReconciliations.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("payment_reconciliations").insert(row).select("*").single();
  if (error) throw error;
  return data as PaymentReconciliation;
}

export async function updateReconciliation(id: string, patch: Partial<PaymentReconciliation>) {
  if (demoEnabled()) {
    const row = getDemoStore().paymentReconciliations.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("payment_reconciliations")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as PaymentReconciliation | null) ?? null;
}

export async function getPaymentSettings(organizationId: string): Promise<PaymentSettings | null> {
  if (demoEnabled()) {
    return getDemoStore().paymentSettings.find((row) => row.organization_id === organizationId) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("payment_settings").select("*").eq("organization_id", organizationId).maybeSingle();
  return (data as PaymentSettings | null) ?? null;
}

export async function upsertPaymentSettings(row: PaymentSettings): Promise<PaymentSettings> {
  if (demoEnabled()) {
    const store = getDemoStore();
    const index = store.paymentSettings.findIndex((item) => item.organization_id === row.organization_id);
    if (index >= 0) store.paymentSettings[index] = row;
    else store.paymentSettings.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin
    .from("payment_settings")
    .upsert({ ...row, updated_at: stamp() })
    .select("*")
    .single();
  if (error) throw error;
  return data as PaymentSettings;
}

export async function listPaymentExports(organizationId: string): Promise<AccountingExport[]> {
  if (demoEnabled()) {
    return byOrg(getDemoStore().accountingExports, organizationId)
      .filter((row) => row.kind === "PAYMENT_BANK_FILE")
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("accounting_exports")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("kind", "PAYMENT_BANK_FILE")
    .order("created_at", { ascending: false });
  return (data ?? []) as AccountingExport[];
}
