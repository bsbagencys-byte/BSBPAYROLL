import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Contractor,
  ContractorEngagement,
  ContractorInvoice,
  ContractorPaymentItem,
  ContractorPaymentRecord,
  EmployeeExit,
  ExitClearanceItem,
  ExitClearanceTask,
  FinalSettlement,
  SettlementApproval,
  SettlementLineItem,
  SettlementPayment,
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

export async function listClearanceItems(organizationId: string) {
  if (demoEnabled()) return getDemoStore().exitClearanceItems.filter((item) => item.organization_id === organizationId);
  return listRows<ExitClearanceItem>("exit_clearance_items", organizationId, "sort_order");
}
export async function insertClearanceItem(row: ExitClearanceItem) {
  return insertRow("exit_clearance_items", "exitClearanceItems", row);
}
export async function updateClearanceItem(id: string, patch: Partial<ExitClearanceItem>) {
  return updateRow("exit_clearance_items", "exitClearanceItems", id, patch);
}

export async function listEmployeeExits(organizationId: string) {
  if (demoEnabled()) return getDemoStore().employeeExits.filter((item) => item.organization_id === organizationId);
  return listRows<EmployeeExit>("employee_exits", organizationId, "created_at");
}
export async function insertEmployeeExit(row: EmployeeExit) {
  return insertRow("employee_exits", "employeeExits", row);
}
export async function updateEmployeeExit(id: string, patch: Partial<EmployeeExit>) {
  return updateRow("employee_exits", "employeeExits", id, patch);
}

export async function listClearanceTasks(organizationId: string) {
  if (demoEnabled()) return getDemoStore().exitClearanceTasks.filter((item) => item.organization_id === organizationId);
  return listRows<ExitClearanceTask>("exit_clearance_tasks", organizationId);
}
export async function insertClearanceTask(row: ExitClearanceTask) {
  return insertRow("exit_clearance_tasks", "exitClearanceTasks", row);
}
export async function updateClearanceTask(id: string, patch: Partial<ExitClearanceTask>) {
  return updateRow("exit_clearance_tasks", "exitClearanceTasks", id, patch);
}

export async function listSettlements(organizationId: string) {
  if (demoEnabled()) return getDemoStore().finalSettlements.filter((item) => item.organization_id === organizationId);
  return listRows<FinalSettlement>("final_settlements", organizationId, "created_at");
}
export async function insertSettlement(row: FinalSettlement) {
  return insertRow("final_settlements", "finalSettlements", row);
}
export async function updateSettlement(id: string, patch: Partial<FinalSettlement>) {
  return updateRow("final_settlements", "finalSettlements", id, patch);
}

export async function listSettlementLines(organizationId: string) {
  if (demoEnabled()) return getDemoStore().settlementLineItems.filter((item) => item.organization_id === organizationId);
  return listRows<SettlementLineItem>("settlement_line_items", organizationId);
}
export async function insertSettlementLine(row: SettlementLineItem) {
  return insertRow("settlement_line_items", "settlementLineItems", row);
}
export async function replaceSettlementLines(organizationId: string, settlementId: string, rows: SettlementLineItem[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.settlementLineItems = store.settlementLineItems.filter((item) => item.settlement_id !== settlementId);
    store.settlementLineItems.unshift(...rows);
    return rows;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("settlement_line_items").delete().eq("settlement_id", settlementId).eq("organization_id", organizationId);
  if (!rows.length) return [];
  const { data, error } = await admin.from("settlement_line_items").insert(rows).select("*");
  if (error) throw error;
  return (data ?? []) as SettlementLineItem[];
}

export async function listSettlementApprovals(organizationId: string) {
  if (demoEnabled()) return getDemoStore().settlementApprovals.filter((item) => item.organization_id === organizationId);
  return listRows<SettlementApproval>("settlement_approvals", organizationId);
}
export async function insertSettlementApproval(row: SettlementApproval) {
  return insertRow("settlement_approvals", "settlementApprovals", row);
}

export async function listSettlementPayments(organizationId: string) {
  if (demoEnabled()) return getDemoStore().settlementPayments.filter((item) => item.organization_id === organizationId);
  return listRows<SettlementPayment>("settlement_payments", organizationId);
}
export async function insertSettlementPayment(row: SettlementPayment) {
  return insertRow("settlement_payments", "settlementPayments", row);
}

export async function listContractors(organizationId: string) {
  if (demoEnabled()) return getDemoStore().contractors.filter((item) => item.organization_id === organizationId);
  return listRows<Contractor>("contractors", organizationId, "display_name");
}
export async function insertContractor(row: Contractor) {
  return insertRow("contractors", "contractors", row);
}
export async function updateContractor(id: string, patch: Partial<Contractor>) {
  return updateRow("contractors", "contractors", id, patch);
}

export async function listEngagements(organizationId: string) {
  if (demoEnabled()) return getDemoStore().contractorEngagements.filter((item) => item.organization_id === organizationId);
  return listRows<ContractorEngagement>("contractor_engagements", organizationId, "start_date");
}
export async function insertEngagement(row: ContractorEngagement) {
  return insertRow("contractor_engagements", "contractorEngagements", row);
}
export async function updateEngagement(id: string, patch: Partial<ContractorEngagement>) {
  return updateRow("contractor_engagements", "contractorEngagements", id, patch);
}

export async function listInvoices(organizationId: string) {
  if (demoEnabled()) return getDemoStore().contractorInvoices.filter((item) => item.organization_id === organizationId);
  return listRows<ContractorInvoice>("contractor_invoices", organizationId, "invoice_date");
}
export async function insertInvoice(row: ContractorInvoice) {
  return insertRow("contractor_invoices", "contractorInvoices", row);
}
export async function updateInvoice(id: string, patch: Partial<ContractorInvoice>) {
  return updateRow("contractor_invoices", "contractorInvoices", id, patch);
}

export async function listInvoiceItems(organizationId: string) {
  if (demoEnabled()) return getDemoStore().contractorPaymentItems.filter((item) => item.organization_id === organizationId);
  return listRows<ContractorPaymentItem>("contractor_payment_items", organizationId);
}
export async function replaceInvoiceItems(organizationId: string, invoiceId: string, rows: ContractorPaymentItem[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.contractorPaymentItems = store.contractorPaymentItems.filter((item) => item.invoice_id !== invoiceId);
    store.contractorPaymentItems.unshift(...rows);
    return rows;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("contractor_payment_items").delete().eq("invoice_id", invoiceId).eq("organization_id", organizationId);
  if (!rows.length) return [];
  const { data, error } = await admin.from("contractor_payment_items").insert(rows).select("*");
  if (error) throw error;
  return (data ?? []) as ContractorPaymentItem[];
}

export async function listInvoicePayments(organizationId: string) {
  if (demoEnabled()) return getDemoStore().contractorPaymentRecords.filter((item) => item.organization_id === organizationId);
  return listRows<ContractorPaymentRecord>("contractor_payment_records", organizationId);
}
export async function insertInvoicePayment(row: ContractorPaymentRecord) {
  return insertRow("contractor_payment_records", "contractorPaymentRecords", row);
}
