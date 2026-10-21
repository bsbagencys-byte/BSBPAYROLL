import { loadOrgCatalog } from "@/lib/org-data";
import { listPayrollRuns } from "@/lib/payroll/repository";
import {
  getBatch,
  getPaymentSettings,
  listBatchItems,
  listBatches,
  listPaymentExports,
  listReconciliations,
  listTransactions,
} from "@/lib/payments/repository";
import { defaultPaymentSettings } from "@/lib/payments/service";
import type { PaymentIssue } from "@/lib/payments/service";

export async function loadPaymentsOverview(organizationId: string) {
  const [batches, runs, settings, exports] = await Promise.all([
    listBatches(organizationId),
    listPayrollRuns(organizationId),
    defaultPaymentSettings(organizationId),
    listPaymentExports(organizationId),
  ]);
  const finalized = runs.filter((row) => ["FINALIZED", "LOCKED", "PROCESSED", "PAID"].includes(row.status));
  return {
    batches,
    finalizedRuns: finalized,
    settings,
    exports,
    ready: batches.filter((row) => row.status === "READY" || row.status === "APPROVED").length,
    exported: batches.filter((row) => row.status === "EXPORTED").length,
    paid: batches.filter((row) => row.status === "PAID" || row.status === "PARTIALLY_PAID").length,
  };
}

export async function loadPaymentBatchDetail(organizationId: string, batchId: string) {
  const batch = await getBatch(organizationId, batchId);
  if (!batch) return null;
  const [items, transactions, reconciliations, catalog, settings, runs] = await Promise.all([
    listBatchItems(organizationId, batchId),
    listTransactions(organizationId, batchId),
    listReconciliations(organizationId, batchId),
    loadOrgCatalog(organizationId),
    getPaymentSettings(organizationId),
    listPayrollRuns(organizationId),
  ]);
  let issues: PaymentIssue[] = [];
  if (batch.validation_json) {
    try {
      issues = (JSON.parse(batch.validation_json).issues ?? []) as PaymentIssue[];
    } catch {
      issues = [];
    }
  }
  return {
    batch,
    items,
    transactions,
    reconciliations,
    issues,
    employees: catalog.employees,
    settings: settings ?? (await defaultPaymentSettings(organizationId)),
    run: runs.find((row) => row.id === batch.run_id) ?? null,
  };
}
