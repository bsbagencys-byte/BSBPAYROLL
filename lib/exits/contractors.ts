import { emitSafe } from "@/lib/events/emit";
import { todayInZone } from "@/lib/leave/dates";
import { listStatutoryRuleVersions } from "@/lib/statutory/repository";
import { calculateContractorWithholding, nextReference, roundMoney } from "@/lib/exits/engine";
import {
  insertContractor,
  insertEngagement,
  insertInvoice,
  insertInvoicePayment,
  listContractors,
  listEngagements,
  listInvoices,
  replaceInvoiceItems,
  updateContractor,
  updateEngagement,
  updateInvoice,
} from "@/lib/exits/repository";
import type {
  Contractor,
  ContractorInvoice,
  ContractorPaymentItem,
  ContractorPaymentRecord,
} from "@/types";
import type {
  ContractorBusinessType,
  ContractorInvoiceStatus,
  ContractorStatus,
  EngagementFrequency,
  EngagementRateUnit,
  EngagementStatus,
} from "@/lib/constants";

function stamp() {
  return new Date().toISOString();
}

export async function saveContractor(input: {
  organizationId: string;
  actorId: string;
  id?: string;
  contractorCode: string;
  legalName: string;
  displayName: string;
  businessType: ContractorBusinessType;
  pan?: string;
  gstin?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pin?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  reportingManagerId?: string | null;
  status?: ContractorStatus;
  notes?: string;
  documentName?: string;
}) {
  const existing = await listContractors(input.organizationId);
  const code = input.contractorCode.trim().toUpperCase();
  if (existing.some((item) => item.contractor_code === code && item.id !== input.id)) {
    throw new Error("Contractor ID already exists.");
  }
  const now = stamp();
  const patch: Partial<Contractor> = {
    contractor_code: code,
    legal_name: input.legalName.trim(),
    display_name: input.displayName.trim(),
    business_type: input.businessType,
    pan: input.pan?.trim().toUpperCase() || null,
    gstin: input.gstin?.trim().toUpperCase() || null,
    email: input.email || null,
    phone: input.phone || null,
    address_line1: input.addressLine1 || null,
    address_line2: input.addressLine2 || null,
    city: input.city || null,
    state: input.state || null,
    pin: input.pin || null,
    bank_name: input.bankName || null,
    account_number: input.accountNumber || null,
    ifsc: input.ifsc?.trim().toUpperCase() || null,
    reporting_manager_id: input.reportingManagerId || null,
    status: input.status ?? "ACTIVE",
    notes: input.notes || null,
    document_name: input.documentName || null,
    updated_by: input.actorId,
  };
  if (input.id) {
    const row = await updateContractor(input.id, patch);
    if (!row) throw new Error("Contractor not found.");
    return row;
  }
  return insertContractor({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    created_by: input.actorId,
    created_at: now,
    updated_at: now,
    ...(patch as Omit<Contractor, "id" | "organization_id" | "created_by" | "created_at" | "updated_at">),
  });
}

export async function saveEngagement(input: {
  organizationId: string;
  actorId: string;
  id?: string;
  contractorId: string;
  scope: string;
  startDate: string;
  endDate?: string;
  feeAmount: number;
  rateUnit: EngagementRateUnit;
  paymentFrequency: EngagementFrequency;
  invoiceTerms?: string;
  notes?: string;
  status?: EngagementStatus;
}) {
  if (input.endDate && input.endDate < input.startDate) throw new Error("End date cannot be before start date.");
  const contractor = (await listContractors(input.organizationId)).find((item) => item.id === input.contractorId);
  if (!contractor) throw new Error("Contractor not found.");
  const now = stamp();
  const engagements = await listEngagements(input.organizationId);
  if (input.id) {
    const row = await updateEngagement(input.id, {
      contractor_id: input.contractorId,
      scope: input.scope.trim(),
      start_date: input.startDate,
      end_date: input.endDate || null,
      fee_amount: roundMoney(input.feeAmount),
      rate_unit: input.rateUnit,
      payment_frequency: input.paymentFrequency,
      invoice_terms: input.invoiceTerms || null,
      notes: input.notes || null,
      status: input.status ?? "ACTIVE",
      updated_by: input.actorId,
    });
    if (!row) throw new Error("Engagement not found.");
    return row;
  }
  return insertEngagement({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    contractor_id: input.contractorId,
    reference_number: nextReference("EN-", engagements.map((item) => item.reference_number)),
    scope: input.scope.trim(),
    start_date: input.startDate,
    end_date: input.endDate || null,
    fee_amount: roundMoney(input.feeAmount),
    rate_unit: input.rateUnit,
    payment_frequency: input.paymentFrequency,
    invoice_terms: input.invoiceTerms || null,
    approver_id: null,
    status: input.status ?? "ACTIVE",
    notes: input.notes || null,
    created_by: input.actorId,
    updated_by: input.actorId,
    created_at: now,
    updated_at: now,
  });
}

export async function refreshEngagementExpiry(organizationId: string, timezone: string) {
  const today = todayInZone(timezone);
  const rows = await listEngagements(organizationId);
  for (const row of rows) {
    if (row.status === "ACTIVE" && row.end_date && row.end_date < today) {
      await updateEngagement(row.id, { status: "EXPIRED" });
    }
  }
}

async function applyWithholding(invoice: ContractorInvoice) {
  const versions = await listStatutoryRuleVersions(invoice.organization_id);
  const result = calculateContractorWithholding({
    versions,
    onDate: invoice.invoice_date,
    gross: invoice.gross_amount,
    adjustment: invoice.adjustment_amount,
  });
  const net = roundMoney(result.basis - result.amount);
  const items: ContractorPaymentItem[] = [
    {
      id: crypto.randomUUID(),
      organization_id: invoice.organization_id,
      invoice_id: invoice.id,
      kind: "GROSS",
      name: "Gross invoice",
      amount: invoice.gross_amount,
      notes: null,
      created_at: stamp(),
    },
    {
      id: crypto.randomUUID(),
      organization_id: invoice.organization_id,
      invoice_id: invoice.id,
      kind: "ADJUSTMENT",
      name: "Approved adjustments",
      amount: invoice.adjustment_amount,
      notes: null,
      created_at: stamp(),
    },
    {
      id: crypto.randomUUID(),
      organization_id: invoice.organization_id,
      invoice_id: invoice.id,
      kind: "WITHHOLDING",
      name: result.section ? `Withholding ${result.section}` : "Withholding",
      amount: result.amount,
      notes: result.warning,
      created_at: stamp(),
    },
    {
      id: crypto.randomUUID(),
      organization_id: invoice.organization_id,
      invoice_id: invoice.id,
      kind: "NET",
      name: "Net payable",
      amount: net,
      notes: result.versionCode,
      created_at: stamp(),
    },
  ];
  await replaceInvoiceItems(invoice.organization_id, invoice.id, items);
  return { ...result, net };
}

export async function saveInvoice(input: {
  organizationId: string;
  actorId: string;
  id?: string;
  contractorId: string;
  engagementId?: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  serviceFrom: string;
  serviceTo: string;
  dueDate?: string;
  grossAmount: number;
  adjustmentAmount: number;
  duplicateOverrideReason?: string;
  attachmentName?: string;
}) {
  if (input.serviceTo < input.serviceFrom) throw new Error("Service period is invalid.");
  const invoices = await listInvoices(input.organizationId);
  const duplicate = invoices.find(
    (item) =>
      item.contractor_id === input.contractorId &&
      item.invoice_number.trim().toLowerCase() === input.invoiceNumber.trim().toLowerCase() &&
      item.id !== input.id &&
      item.status !== "CANCELLED"
  );
  if (duplicate && !input.duplicateOverrideReason) {
    throw new Error("Duplicate invoice number for this contractor. Provide a reason to override.");
  }
  const now = stamp();
  const base = {
    contractor_id: input.contractorId,
    engagement_id: input.engagementId || null,
    invoice_number: input.invoiceNumber.trim(),
    invoice_date: input.invoiceDate,
    service_from: input.serviceFrom,
    service_to: input.serviceTo,
    due_date: input.dueDate || null,
    gross_amount: roundMoney(input.grossAmount),
    adjustment_amount: roundMoney(input.adjustmentAmount),
    duplicate_override_reason: input.duplicateOverrideReason || null,
    attachment_name: input.attachmentName || null,
    updated_by: input.actorId,
  };
  let invoice: ContractorInvoice;
  if (input.id) {
    const current = invoices.find((item) => item.id === input.id);
    if (!current) throw new Error("Invoice not found.");
    if (current.status !== "DRAFT") throw new Error("Only draft invoices can be edited.");
    const updated = await updateInvoice(input.id, base);
    if (!updated) throw new Error("Invoice not found.");
    invoice = updated;
  } else {
    invoice = await insertInvoice({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      withholding_amount: 0,
      net_payable: roundMoney(input.grossAmount + input.adjustmentAmount),
      withholding_basis: 0,
      withholding_section: null,
      rule_version_id: null,
      rule_version_code: null,
      status: "DRAFT",
      reject_reason: null,
      paid_amount: 0,
      submitted_at: null,
      approved_at: null,
      created_by: input.actorId,
      created_at: now,
      updated_at: now,
      ...base,
    });
  }
  const withholding = await applyWithholding(invoice);
  if (withholding.blocked) {
    await updateInvoice(invoice.id, {
      withholding_amount: 0,
      net_payable: withholding.net,
      withholding_basis: withholding.basis,
      withholding_section: withholding.section,
      rule_version_id: withholding.versionId,
      rule_version_code: withholding.versionCode,
      status: "DRAFT",
    });
    throw new Error(withholding.warning ?? "Verified TDS rule is required before this invoice can be calculated.");
  }
  const updated = await updateInvoice(invoice.id, {
    withholding_amount: withholding.amount,
    net_payable: withholding.net,
    withholding_basis: withholding.basis,
    withholding_section: withholding.section,
    rule_version_id: withholding.versionId,
    rule_version_code: withholding.versionCode,
  });
  return updated ?? invoice;
}

export async function submitInvoice(organizationId: string, invoiceId: string, actorId: string) {
  const invoice = (await listInvoices(organizationId)).find((item) => item.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be submitted.");
  if (!invoice.rule_version_id || !invoice.rule_version_code) {
    throw new Error("Invoice withholding is not calculated against a verified rule version.");
  }
  return updateInvoice(invoiceId, { status: "SUBMITTED", submitted_at: stamp(), updated_by: actorId });
}

export async function decideInvoice(input: {
  organizationId: string;
  invoiceId: string;
  actorId: string;
  decision: "APPROVED" | "REJECTED";
  reason?: string;
}) {
  const invoice = (await listInvoices(input.organizationId)).find((item) => item.id === input.invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status !== "SUBMITTED" && invoice.status !== "UNDER_REVIEW") {
    throw new Error("Invoice is not awaiting approval.");
  }
  if (input.decision === "REJECTED") {
    const rejected = await updateInvoice(input.invoiceId, {
      status: "REJECTED",
      reject_reason: input.reason || "Rejected",
      updated_by: input.actorId,
    });
    await emitSafe({
      organizationId: input.organizationId,
      eventType: "contractor.payment.status_changed",
      entityType: "contractor_invoice",
      entityId: input.invoiceId,
      actorId: input.actorId,
      payload: { status: "REJECTED", href: "/contractor-payments" },
      idempotencyKey: `contractor.payment.status_changed:${input.invoiceId}:REJECTED`,
    });
    return rejected;
  }
  const approved = await updateInvoice(input.invoiceId, {
    status: "APPROVED",
    approved_at: stamp(),
    reject_reason: null,
    updated_by: input.actorId,
  });
  await emitSafe({
    organizationId: input.organizationId,
    eventType: "contractor.payment.status_changed",
    entityType: "contractor_invoice",
    entityId: input.invoiceId,
    actorId: input.actorId,
    payload: { status: "APPROVED", href: "/contractor-payments" },
    idempotencyKey: `contractor.payment.status_changed:${input.invoiceId}:APPROVED`,
  });
  return approved;
}

export async function recordInvoicePayment(input: {
  organizationId: string;
  invoiceId: string;
  actorId: string;
  amount: number;
  paymentDate: string;
  method: ContractorPaymentRecord["method"];
  reference?: string;
  notes?: string;
}) {
  const invoice = (await listInvoices(input.organizationId)).find((item) => item.id === input.invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  if (!["APPROVED", "SCHEDULED", "PARTIALLY_PAID"].includes(invoice.status)) {
    throw new Error("Approve the invoice before recording payment.");
  }
  if (input.amount <= 0) throw new Error("Payment amount must be greater than zero.");
  const remaining = roundMoney(invoice.net_payable - invoice.paid_amount);
  if (input.amount - remaining > 0.01) throw new Error("Payment exceeds the outstanding amount.");
  await insertInvoicePayment({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    invoice_id: invoice.id,
    amount: roundMoney(input.amount),
    payment_date: input.paymentDate,
    method: input.method,
    reference: input.reference || null,
    notes: input.notes || null,
    created_by: input.actorId,
    created_at: stamp(),
  });
  const paid = roundMoney(invoice.paid_amount + input.amount);
  const status: ContractorInvoiceStatus = paid + 0.01 >= invoice.net_payable ? "PAID" : "PARTIALLY_PAID";
  const updated = await updateInvoice(invoice.id, { paid_amount: paid, status, updated_by: input.actorId });
  await emitSafe({
    organizationId: input.organizationId,
    eventType: "contractor.payment.status_changed",
    entityType: "contractor_invoice",
    entityId: invoice.id,
    actorId: input.actorId,
    payload: { status, href: "/contractor-payments" },
    idempotencyKey: `contractor.payment.status_changed:${invoice.id}:${status}:${paid}`,
  });
  return updated;
}

export async function cancelInvoice(organizationId: string, invoiceId: string, actorId: string) {
  const invoice = (await listInvoices(organizationId)).find((item) => item.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "PAID") throw new Error("Paid invoices cannot be cancelled.");
  return updateInvoice(invoiceId, { status: "CANCELLED", updated_by: actorId });
}
