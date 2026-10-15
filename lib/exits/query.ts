import { loadOrgCatalog } from "@/lib/org-data";
import { listEmployment } from "@/lib/leave/repository";
import { lookupName } from "@/lib/utils";
import { daysUntil } from "@/lib/exits/engine";
import { refreshExitLifecycle, requiredClearanceOpen } from "@/lib/exits/service";
import { refreshEngagementExpiry } from "@/lib/exits/contractors";
import {
  listClearanceItems,
  listClearanceTasks,
  listContractors,
  listEmployeeExits,
  listEngagements,
  listInvoiceItems,
  listInvoicePayments,
  listInvoices,
  listSettlementApprovals,
  listSettlementLines,
  listSettlementPayments,
  listSettlements,
} from "@/lib/exits/repository";
import type {
  ContractorListItem,
  EngagementListItem,
  ExitListItem,
  InvoiceListItem,
  SettlementListItem,
} from "@/types";

export async function loadExitsCatalog(organizationId: string) {
  const [exits, tasks, items, settlements, lines, approvals, payments, contractors, engagements, invoices, invoiceItems, invoicePayments, catalog, employment] =
    await Promise.all([
      listEmployeeExits(organizationId),
      listClearanceTasks(organizationId),
      listClearanceItems(organizationId),
      listSettlements(organizationId),
      listSettlementLines(organizationId),
      listSettlementApprovals(organizationId),
      listSettlementPayments(organizationId),
      listContractors(organizationId),
      listEngagements(organizationId),
      listInvoices(organizationId),
      listInvoiceItems(organizationId),
      listInvoicePayments(organizationId),
      loadOrgCatalog(organizationId),
      listEmployment(organizationId),
    ]);
  return {
    exits,
    tasks,
    items,
    settlements,
    lines,
    approvals,
    payments,
    contractors,
    engagements,
    invoices,
    invoiceItems,
    invoicePayments,
    employment,
    ...catalog,
  };
}

export function toExitListItem(input: Awaited<ReturnType<typeof loadExitsCatalog>>): ExitListItem[] {
  return input.exits
    .map((exit) => {
      const employee = input.employees.find((item) => item.id === exit.employee_id);
      const job = input.employment.find((item) => item.employee_id === exit.employee_id);
      const summary = requiredClearanceOpen(input.tasks.filter((item) => item.exit_id === exit.id));
      return {
        exit,
        employeeName: employee?.display_name ?? "Unknown",
        employeeCode: employee?.employee_code ?? "—",
        departmentName: lookupName(input.departments, job?.department_id) ?? "—",
        pendingRequired: summary.pending,
        blockedRequired: summary.blocked,
      } satisfies ExitListItem;
    })
    .sort((a, b) => b.exit.created_at.localeCompare(a.exit.created_at));
}

export function toSettlementListItem(input: Awaited<ReturnType<typeof loadExitsCatalog>>): SettlementListItem[] {
  return input.settlements
    .map((settlement) => {
      const employee = input.employees.find((item) => item.id === settlement.employee_id);
      const exit = input.exits.find((item) => item.id === settlement.exit_id);
      return {
        settlement,
        employeeName: employee?.display_name ?? "Unknown",
        employeeCode: employee?.employee_code ?? "—",
        exitType: exit?.exit_type ?? "OTHER",
        lastWorkingDate: settlement.last_working_date,
      } satisfies SettlementListItem;
    })
    .sort((a, b) => b.settlement.created_at.localeCompare(a.settlement.created_at));
}

export function toContractorListItem(input: Awaited<ReturnType<typeof loadExitsCatalog>>): ContractorListItem[] {
  return input.contractors
    .map((contractor) => ({
      contractor,
      managerName: lookupName(input.employees, contractor.reporting_manager_id) ?? "—",
      activeEngagements: input.engagements.filter((item) => item.contractor_id === contractor.id && item.status === "ACTIVE").length,
    }))
    .sort((a, b) => a.contractor.display_name.localeCompare(b.contractor.display_name));
}

export function toEngagementListItem(input: Awaited<ReturnType<typeof loadExitsCatalog>>, today: string): EngagementListItem[] {
  return input.engagements
    .map((engagement) => {
      const contractor = input.contractors.find((item) => item.id === engagement.contractor_id);
      return {
        engagement,
        contractorName: contractor?.display_name ?? "Unknown",
        contractorCode: contractor?.contractor_code ?? "—",
        daysToExpiry: daysUntil(today, engagement.end_date),
      } satisfies EngagementListItem;
    })
    .sort((a, b) => b.engagement.start_date.localeCompare(a.engagement.start_date));
}

export function toInvoiceListItem(input: Awaited<ReturnType<typeof loadExitsCatalog>>): InvoiceListItem[] {
  return input.invoices
    .map((invoice) => {
      const contractor = input.contractors.find((item) => item.id === invoice.contractor_id);
      const engagement = input.engagements.find((item) => item.id === invoice.engagement_id);
      return {
        invoice,
        contractorName: contractor?.display_name ?? "Unknown",
        contractorCode: contractor?.contractor_code ?? "—",
        engagementScope: engagement?.scope ?? "—",
      } satisfies InvoiceListItem;
    })
    .sort((a, b) => b.invoice.invoice_date.localeCompare(a.invoice.invoice_date));
}

export async function loadExitsOverview(organizationId: string, timezone: string) {
  await refreshExitLifecycle(organizationId, timezone);
  const catalog = await loadExitsCatalog(organizationId);
  const exits = toExitListItem(catalog);
  const settlements = toSettlementListItem(catalog);
  return {
    ...catalog,
    exits,
    settlements,
    pending: exits.filter((item) => ["SUBMITTED", "IN_NOTICE", "CLEARANCE_PENDING", "SETTLEMENT_PENDING"].includes(item.exit.status)),
    inNotice: exits.filter((item) => item.exit.status === "IN_NOTICE"),
    clearance: exits.filter((item) => item.exit.status === "CLEARANCE_PENDING"),
    ready: exits.filter((item) => item.exit.status === "SETTLEMENT_PENDING"),
    recent: exits.slice(0, 8),
  };
}

export async function loadSettlementsOverview(organizationId: string, timezone: string) {
  await refreshExitLifecycle(organizationId, timezone);
  const catalog = await loadExitsCatalog(organizationId);
  const settlements = toSettlementListItem(catalog);
  const exits = toExitListItem(catalog);
  return {
    ...catalog,
    settlements,
    exits,
    drafts: settlements.filter((item) => item.settlement.status === "DRAFT" || item.settlement.status === "HAS_EXCEPTIONS"),
    review: settlements.filter((item) => item.settlement.status === "UNDER_REVIEW" || item.settlement.status === "CALCULATED"),
    payable: settlements.filter((item) => item.settlement.status === "FINALIZED" || item.settlement.status === "PARTIALLY_PAID"),
    recent: settlements.slice(0, 8),
    readyExits: exits.filter((item) => item.exit.status === "SETTLEMENT_PENDING"),
  };
}

export async function loadContractorsOverview(organizationId: string, timezone: string) {
  await refreshEngagementExpiry(organizationId, timezone);
  const catalog = await loadExitsCatalog(organizationId);
  const today = new Date().toISOString().slice(0, 10);
  const contractors = toContractorListItem(catalog);
  const engagements = toEngagementListItem(catalog, today);
  const invoices = toInvoiceListItem(catalog);
  return {
    ...catalog,
    contractors,
    engagements,
    invoices,
    active: contractors.filter((item) => item.contractor.status === "ACTIVE"),
    expiring: engagements.filter((item) => item.daysToExpiry != null && item.daysToExpiry <= 30 && item.engagement.status === "ACTIVE"),
    pendingInvoices: invoices.filter((item) => item.invoice.status === "SUBMITTED" || item.invoice.status === "UNDER_REVIEW"),
    recentContractors: contractors.slice(0, 8),
    recentInvoices: invoices.slice(0, 8),
  };
}

export async function loadExitDetail(organizationId: string, id: string, timezone: string) {
  await refreshExitLifecycle(organizationId, timezone);
  const catalog = await loadExitsCatalog(organizationId);
  const items = toExitListItem(catalog);
  const row = items.find((item) => item.exit.id === id) ?? null;
  return {
    row,
    tasks: catalog.tasks.filter((item) => item.exit_id === id),
    settlement: catalog.settlements.find((item) => item.exit_id === id && item.status !== "CANCELLED") ?? null,
    employees: catalog.employees,
    items: catalog.items,
  };
}

export async function loadSettlementDetail(organizationId: string, id: string, timezone: string) {
  await refreshExitLifecycle(organizationId, timezone);
  const catalog = await loadExitsCatalog(organizationId);
  const items = toSettlementListItem(catalog);
  const row = items.find((item) => item.settlement.id === id) ?? null;
  return {
    row,
    lines: catalog.lines.filter((item) => item.settlement_id === id).sort((a, b) => a.sort_order - b.sort_order),
    approvals: catalog.approvals.filter((item) => item.settlement_id === id),
    payments: catalog.payments.filter((item) => item.settlement_id === id),
    exit: catalog.exits.find((item) => item.id === row?.settlement.exit_id) ?? null,
  };
}

export async function loadContractorDetail(organizationId: string, id: string, timezone: string) {
  await refreshEngagementExpiry(organizationId, timezone);
  const catalog = await loadExitsCatalog(organizationId);
  const today = new Date().toISOString().slice(0, 10);
  const contractors = toContractorListItem(catalog);
  return {
    row: contractors.find((item) => item.contractor.id === id) ?? null,
    engagements: toEngagementListItem(catalog, today).filter((item) => item.engagement.contractor_id === id),
    invoices: toInvoiceListItem(catalog).filter((item) => item.invoice.contractor_id === id),
    employees: catalog.employees,
  };
}

export async function loadInvoiceDetail(organizationId: string, id: string, timezone: string) {
  await refreshEngagementExpiry(organizationId, timezone);
  const catalog = await loadExitsCatalog(organizationId);
  const invoices = toInvoiceListItem(catalog);
  const row = invoices.find((item) => item.invoice.id === id) ?? null;
  return {
    row,
    items: catalog.invoiceItems.filter((item) => item.invoice_id === id),
    payments: catalog.invoicePayments.filter((item) => item.invoice_id === id),
    contractors: catalog.contractors,
    engagements: catalog.engagements,
  };
}
