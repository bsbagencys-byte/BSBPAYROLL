import { writeAudit } from "@/lib/audit";
import {
  addDays,
  canTransition,
  invoiceStatusFromAmounts,
  invoiceTotals,
  isoDate,
  periodEnd,
  snapshotPlan,
  unitPrice,
} from "@/lib/billing/engine";
import {
  getInvoice,
  getOpenSubscription,
  getPaymentByIdempotency,
  getPaymentByProviderId,
  getPlan,
  getPlanByCode,
  getPlatformBillingSettings,
  getSubscription,
  getWebhookEvent,
  insertAdjustment,
  insertPlanPriceHistory,
  insertSubscriptionHistory,
  listInvoices,
  listInvoiceLines,
  listPayments,
  listPlans,
  nextInvoiceNumber,
  replaceInvoiceLines,
  replacePlanEntitlements,
  upsertBillingProfile,
  upsertInvoice,
  upsertPayment,
  upsertPlan,
  upsertPlatformBillingSettings,
  upsertSubscription,
  upsertWebhookEvent,
  getBillingProfile,
} from "@/lib/billing/repository";
import {
  isPaymentProviderConfigured,
  parseWebhook,
  providerStatus,
  unconfiguredCheckoutMessage,
  verifyPaymentSignature,
  type CheckoutRequest,
} from "@/lib/billing/provider";
import { persistUsage } from "@/lib/billing/usage";
import type { BillingCycle, PlanStatus, SubscriptionEventType, SubscriptionStatus } from "@/lib/constants";
import type {
  BillingInvoice,
  BillingInvoiceLine,
  BillingPayment,
  BillingProfile,
  OrganizationSubscription,
  PaymentWebhookEvent,
  PlanEntitlementRow,
  PlatformBillingSettings,
  SubscriptionPlan,
} from "@/types";

function stamp() {
  return new Date().toISOString();
}

function today() {
  return isoDate(new Date());
}

async function recordHistory(input: {
  organizationId: string;
  subscriptionId: string;
  eventType: SubscriptionEventType;
  fromStatus?: string | null;
  toStatus?: string | null;
  fromPlanCode?: string | null;
  toPlanCode?: string | null;
  actorId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await insertSubscriptionHistory({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    subscription_id: input.subscriptionId,
    event_type: input.eventType,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    from_plan_code: input.fromPlanCode ?? null,
    to_plan_code: input.toPlanCode ?? null,
    actor_user_id: input.actorId ?? null,
    reason: input.reason ?? null,
    metadata_json: JSON.stringify(input.metadata ?? {}),
    created_at: stamp(),
  });
}

function defaultPlatformSettings(): PlatformBillingSettings {
  const now = stamp();
  return {
    id: true,
    legal_name: "BSB Payroll",
    billing_email: null,
    address_line1: null,
    address_line2: null,
    city: null,
    state: null,
    pin: null,
    country: "IN",
    gstin: null,
    pan: null,
    tax_label: null,
    tax_rate: null,
    currency: "INR",
    invoice_prefix: "BSB",
    tax_configured: false,
    updated_by: null,
    created_at: now,
    updated_at: now,
  };
}

export async function platformSettings() {
  return (await getPlatformBillingSettings()) ?? defaultPlatformSettings();
}

export async function savePlatformSettings(row: PlatformBillingSettings, actorId: string) {
  const saved = await upsertPlatformBillingSettings({ ...row, updated_by: actorId, updated_at: stamp() });
  await writeAudit({
    organizationId: null,
    actorUserId: actorId,
    action: "billing_platform_settings_updated",
    entityType: "platform_billing_settings",
    entityId: null,
  });
  return saved;
}

export async function savePlan(input: {
  existing?: SubscriptionPlan | null;
  values: Omit<SubscriptionPlan, "id" | "created_at" | "updated_at" | "created_by" | "updated_by"> & {
    id?: string;
  };
  entitlements: Array<{ key: string; limit: number | null; enabled: boolean }>;
  actorId: string;
  reason?: string;
}) {
  const now = stamp();
  const existing = input.existing ?? (input.values.id ? await getPlan(input.values.id) : null);
  const duplicate = await getPlanByCode(input.values.code);
  if (duplicate && duplicate.id !== existing?.id) {
    throw new Error("Plan code already exists.");
  }
  const row: SubscriptionPlan = {
    id: existing?.id ?? input.values.id ?? crypto.randomUUID(),
    code: input.values.code.trim().toUpperCase(),
    name: input.values.name.trim(),
    description: input.values.description,
    billing_cycle_default: input.values.billing_cycle_default,
    monthly_price: Number(input.values.monthly_price),
    annual_price: Number(input.values.annual_price),
    currency: input.values.currency || "INR",
    trial_days: Number(input.values.trial_days) || 0,
    employee_limit: input.values.employee_limit,
    branch_limit: input.values.branch_limit,
    biometric_device_limit: input.values.biometric_device_limit,
    modules_json: input.values.modules_json || "[]",
    entitlements_json: input.values.entitlements_json || "{}",
    status: input.values.status,
    effective_from: input.values.effective_from,
    effective_to: input.values.effective_to,
    created_by: existing?.created_by ?? input.actorId,
    updated_by: input.actorId,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  const saved = await upsertPlan(row);
  if (
    existing &&
    (existing.monthly_price !== row.monthly_price ||
      existing.annual_price !== row.annual_price ||
      existing.employee_limit !== row.employee_limit ||
      existing.branch_limit !== row.branch_limit ||
      existing.biometric_device_limit !== row.biometric_device_limit ||
      existing.entitlements_json !== row.entitlements_json)
  ) {
    await insertPlanPriceHistory({
      id: crypto.randomUUID(),
      plan_id: saved.id,
      monthly_price: existing.monthly_price,
      annual_price: existing.annual_price,
      currency: existing.currency,
      employee_limit: existing.employee_limit,
      branch_limit: existing.branch_limit,
      biometric_device_limit: existing.biometric_device_limit,
      entitlements_json: existing.entitlements_json,
      changed_by: input.actorId,
      reason: input.reason ?? "Plan updated. Historical price preserved.",
      created_at: now,
    });
  }
  const entitlementRows: PlanEntitlementRow[] = input.entitlements.map((item) => ({
    id: crypto.randomUUID(),
    plan_id: saved.id,
    entitlement_key: item.key,
    limit_value: item.limit,
    enabled: item.enabled,
    notes: null,
    created_at: now,
    updated_at: now,
  }));
  await replacePlanEntitlements(saved.id, entitlementRows);
  await writeAudit({
    actorUserId: input.actorId,
    action: existing ? "subscription_plan_updated" : "subscription_plan_created",
    entityType: "subscription_plan",
    entityId: saved.id,
    metadata: { code: saved.code, status: saved.status },
  });
  return saved;
}

export async function retirePlan(planId: string, actorId: string) {
  const plan = await getPlan(planId);
  if (!plan) throw new Error("Plan not found.");
  const saved = await upsertPlan({
    ...plan,
    status: "RETIRED" as PlanStatus,
    updated_by: actorId,
    updated_at: stamp(),
  });
  await writeAudit({
    actorUserId: actorId,
    action: "subscription_plan_retired",
    entityType: "subscription_plan",
    entityId: saved.id,
  });
  return saved;
}

function periodFor(cycle: BillingCycle, start = today()) {
  return { start, end: periodEnd(start, cycle), renewsAt: addDays(periodEnd(start, cycle), 1) };
}

export async function startSubscription(input: {
  organizationId: string;
  planId: string;
  cycle: BillingCycle;
  actorId: string | null;
  startTrial?: boolean;
  notes?: string;
}) {
  const existing = await getOpenSubscription(input.organizationId);
  if (existing) throw new Error("An open subscription already exists for this organization.");
  const plan = await getPlan(input.planId);
  if (!plan || plan.status !== "ACTIVE") throw new Error("Select an active plan.");
  const now = stamp();
  const startTrial = Boolean(input.startTrial && plan.trial_days > 0);
  const period = periodFor(input.cycle);
  const trialEnds = startTrial ? addDays(today(), plan.trial_days) : null;
  const row: OrganizationSubscription = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    plan_id: plan.id,
    plan_code: plan.code,
    plan_name: plan.name,
    billing_cycle: input.cycle,
    status: startTrial ? "TRIAL" : "ACTIVE",
    unit_price: unitPrice(plan, input.cycle),
    currency: plan.currency,
    trial_starts_at: startTrial ? now : null,
    trial_ends_at: trialEnds ? `${trialEnds}T00:00:00.000Z` : null,
    current_period_start: period.start,
    current_period_end: startTrial && trialEnds ? trialEnds : period.end,
    renews_at: startTrial && trialEnds ? trialEnds : period.renewsAt,
    cancelled_at: null,
    cancel_at_period_end: false,
    grace_ends_at: null,
    plan_snapshot_json: snapshotPlan(plan),
    notes: input.notes ?? null,
    created_by: input.actorId,
    updated_by: input.actorId,
    created_at: now,
    updated_at: now,
  };
  if (!startTrial) {
    row.status = "ACTIVE";
  }
  const saved = await upsertSubscription(row);
  await recordHistory({
    organizationId: input.organizationId,
    subscriptionId: saved.id,
    eventType: startTrial ? "TRIAL_STARTED" : "CREATED",
    toStatus: saved.status,
    toPlanCode: saved.plan_code,
    actorId: input.actorId,
  });
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorId,
    action: startTrial ? "subscription_trial_started" : "subscription_activated",
    entityType: "organization_subscription",
    entityId: saved.id,
    metadata: { plan: saved.plan_code, status: saved.status },
  });
  if (!startTrial) {
    await issueInvoiceForSubscription(saved, input.actorId);
  }
  return saved;
}

export async function changePlan(input: {
  organizationId: string;
  planId: string;
  cycle: BillingCycle;
  actorId: string;
  reason?: string;
}) {
  const current = await getOpenSubscription(input.organizationId);
  if (!current) throw new Error("No open subscription to change.");
  if (["CANCELLED", "EXPIRED"].includes(current.status)) throw new Error("Cancelled or expired subscriptions cannot change plan.");
  const plan = await getPlan(input.planId);
  if (!plan || plan.status !== "ACTIVE") throw new Error("Select an active plan.");
  const now = stamp();
  const period = periodFor(input.cycle, current.current_period_start);
  const nextPrice = unitPrice(plan, input.cycle);
  const upgraded = nextPrice >= current.unit_price;
  const saved = await upsertSubscription({
    ...current,
    plan_id: plan.id,
    plan_code: plan.code,
    plan_name: plan.name,
    billing_cycle: input.cycle,
    unit_price: nextPrice,
    currency: plan.currency,
    current_period_start: period.start,
    current_period_end: period.end,
    renews_at: period.renewsAt,
    plan_snapshot_json: snapshotPlan(plan),
    updated_by: input.actorId,
    updated_at: now,
  });
  await recordHistory({
    organizationId: input.organizationId,
    subscriptionId: saved.id,
    eventType: upgraded ? "UPGRADED" : "DOWNGRADED",
    fromStatus: current.status,
    toStatus: saved.status,
    fromPlanCode: current.plan_code,
    toPlanCode: saved.plan_code,
    actorId: input.actorId,
    reason: input.reason ?? null,
  });
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorId,
    action: upgraded ? "subscription_upgraded" : "subscription_downgraded",
    entityType: "organization_subscription",
    entityId: saved.id,
    metadata: { from: current.plan_code, to: saved.plan_code },
  });
  return saved;
}

export async function cancelSubscription(input: {
  organizationId: string;
  actorId: string;
  atPeriodEnd?: boolean;
  reason?: string;
}) {
  const current = await getOpenSubscription(input.organizationId);
  if (!current) throw new Error("No open subscription to cancel.");
  const now = stamp();
  const nextStatus: SubscriptionStatus = input.atPeriodEnd ? current.status : "CANCELLED";
  if (!input.atPeriodEnd && !canTransition(current.status, "CANCELLED")) {
    throw new Error(`Cannot cancel a ${current.status} subscription.`);
  }
  const saved = await upsertSubscription({
    ...current,
    status: nextStatus,
    cancel_at_period_end: Boolean(input.atPeriodEnd),
    cancelled_at: now,
    updated_by: input.actorId,
    updated_at: now,
  });
  await recordHistory({
    organizationId: input.organizationId,
    subscriptionId: saved.id,
    eventType: "CANCELLED",
    fromStatus: current.status,
    toStatus: saved.status,
    actorId: input.actorId,
    reason: input.reason ?? null,
  });
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorId,
    action: "subscription_cancelled",
    entityType: "organization_subscription",
    entityId: saved.id,
    metadata: { atPeriodEnd: Boolean(input.atPeriodEnd), dataPreserved: true },
  });
  return saved;
}

export async function overrideSubscription(input: {
  organizationId: string;
  status: SubscriptionStatus;
  actorId: string;
  reason: string;
}) {
  const current = await getOpenSubscription(input.organizationId);
  if (!current) throw new Error("No open subscription to override.");
  if (!input.reason.trim()) throw new Error("Override reason is required.");
  const saved = await upsertSubscription({
    ...current,
    status: input.status,
    updated_by: input.actorId,
    updated_at: stamp(),
  });
  await recordHistory({
    organizationId: input.organizationId,
    subscriptionId: saved.id,
    eventType: "OVERRIDE",
    fromStatus: current.status,
    toStatus: saved.status,
    actorId: input.actorId,
    reason: input.reason,
  });
  await insertAdjustment({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    subscription_id: saved.id,
    invoice_id: null,
    kind: "ENTITLEMENT_OVERRIDE",
    amount: 0,
    reason: input.reason,
    created_by: input.actorId,
    created_at: stamp(),
  });
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorId,
    action: "subscription_overridden",
    entityType: "organization_subscription",
    entityId: saved.id,
    metadata: { from: current.status, to: saved.status, reason: input.reason },
  });
  return saved;
}

export async function applyLifecycle(subscription: OrganizationSubscription, asOf = today()) {
  let next: SubscriptionStatus = subscription.status;
  if (subscription.status === "TRIAL" && subscription.trial_ends_at && isoDate(subscription.trial_ends_at) < asOf) {
    next = "EXPIRED";
  } else if (subscription.cancel_at_period_end && subscription.current_period_end < asOf) {
    next = "CANCELLED";
  } else if (subscription.status === "PAST_DUE" && subscription.grace_ends_at && subscription.grace_ends_at < asOf) {
    next = "SUSPENDED";
  } else if (subscription.status === "GRACE_PERIOD" && subscription.grace_ends_at && subscription.grace_ends_at < asOf) {
    next = "SUSPENDED";
  } else if (
    ["ACTIVE", "TRIAL"].includes(subscription.status) &&
    subscription.current_period_end < asOf &&
    !subscription.cancel_at_period_end
  ) {
    next = "PAST_DUE";
  }
  if (next === subscription.status) return subscription;
  if (!canTransition(subscription.status, next)) return subscription;
  const saved = await upsertSubscription({
    ...subscription,
    status: next,
    grace_ends_at: next === "PAST_DUE" ? addDays(asOf, 7) : subscription.grace_ends_at,
    updated_at: stamp(),
  });
  await recordHistory({
    organizationId: saved.organization_id,
    subscriptionId: saved.id,
    eventType:
      next === "EXPIRED"
        ? "TRIAL_EXPIRED"
        : next === "SUSPENDED"
          ? "SUSPENDED"
          : next === "PAST_DUE"
            ? "PAST_DUE"
            : next === "CANCELLED"
              ? "CANCELLED"
              : "OVERRIDE",
    fromStatus: subscription.status,
    toStatus: next,
  });
  return saved;
}

export async function expireDueSubscriptions(asOf = today()) {
  const { listSubscriptions } = await import("@/lib/billing/repository");
  const rows = await listSubscriptions();
  const updated: OrganizationSubscription[] = [];
  for (const row of rows) {
    const next = await applyLifecycle(row, asOf);
    if (next.status !== row.status) updated.push(next);
  }
  return updated;
}

function partySnapshot(input: {
  legal_name: string | null;
  billing_email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  country: string | null;
  gstin: string | null;
  pan: string | null;
  tax_id?: string | null;
}) {
  return JSON.stringify(input);
}

export async function issueInvoiceForSubscription(subscription: OrganizationSubscription, actorId: string | null) {
  const settings = await platformSettings();
  const profile = await getBillingProfile(subscription.organization_id);
  const taxConfigured = Boolean(settings.tax_configured && settings.tax_rate !== null);
  const totals = invoiceTotals({
    subtotal: subscription.unit_price,
    taxRate: settings.tax_rate,
    taxConfigured,
  });
  const invoiceNumber = await nextInvoiceNumber(settings.invoice_prefix || "BSB");
  const now = stamp();
  const invoice: BillingInvoice = {
    id: crypto.randomUUID(),
    organization_id: subscription.organization_id,
    subscription_id: subscription.id,
    invoice_number: invoiceNumber,
    status: "ISSUED",
    billing_cycle: subscription.billing_cycle,
    period_start: subscription.current_period_start,
    period_end: subscription.current_period_end,
    plan_id: subscription.plan_id,
    plan_code: subscription.plan_code,
    plan_name: subscription.plan_name,
    currency: subscription.currency,
    subtotal: totals.subtotal,
    discount_amount: totals.discountAmount,
    tax_label: taxConfigured ? settings.tax_label : null,
    tax_rate: taxConfigured ? settings.tax_rate : null,
    tax_amount: totals.taxAmount,
    total: totals.total,
    amount_paid: 0,
    outstanding: totals.outstanding,
    due_date: addDays(today(), 15),
    issued_at: now,
    paid_at: null,
    voided_at: null,
    seller_snapshot_json: partySnapshot(settings),
    customer_snapshot_json: partySnapshot({
      legal_name: profile?.legal_name ?? null,
      billing_email: profile?.billing_email ?? null,
      address_line1: profile?.address_line1 ?? null,
      address_line2: profile?.address_line2 ?? null,
      city: profile?.city ?? null,
      state: profile?.state ?? null,
      pin: profile?.pin ?? null,
      country: profile?.country ?? "IN",
      gstin: profile?.gstin ?? null,
      pan: profile?.pan ?? null,
      tax_id: profile?.tax_id ?? null,
    }),
    tax_configured: taxConfigured,
    notes: taxConfigured
      ? null
      : "Tax configuration is incomplete. This invoice does not claim GST-compliant tax.",
    created_by: actorId,
    updated_by: actorId,
    created_at: now,
    updated_at: now,
  };
  await upsertInvoice(invoice);
  const lines: BillingInvoiceLine[] = [
    {
      id: crypto.randomUUID(),
      invoice_id: invoice.id,
      organization_id: subscription.organization_id,
      line_type: "SUBSCRIPTION",
      description: `${subscription.plan_name} (${subscription.billing_cycle.toLowerCase()}) ${subscription.current_period_start} to ${subscription.current_period_end}`,
      quantity: 1,
      unit_price: totals.subtotal,
      amount: totals.subtotal,
      sort_order: 1,
      created_at: now,
    },
  ];
  if (totals.taxAmount > 0) {
    lines.push({
      id: crypto.randomUUID(),
      invoice_id: invoice.id,
      organization_id: subscription.organization_id,
      line_type: "TAX",
      description: `${settings.tax_label || "Tax"} ${settings.tax_rate}%`,
      quantity: 1,
      unit_price: totals.taxAmount,
      amount: totals.taxAmount,
      sort_order: 2,
      created_at: now,
    });
  }
  await replaceInvoiceLines(invoice.id, lines);
  await writeAudit({
    organizationId: subscription.organization_id,
    actorUserId: actorId,
    action: "billing_invoice_issued",
    entityType: "billing_invoice",
    entityId: invoice.id,
    metadata: { invoiceNumber, total: invoice.total, taxConfigured },
  });
  return invoice;
}

export async function voidInvoice(organizationId: string, invoiceId: string, actorId: string) {
  const invoice = await getInvoice(organizationId, invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "PAID") throw new Error("Paid invoices cannot be voided.");
  const saved = await upsertInvoice({
    ...invoice,
    status: "VOID",
    voided_at: stamp(),
    outstanding: 0,
    updated_by: actorId,
    updated_at: stamp(),
  });
  await writeAudit({
    organizationId,
    actorUserId: actorId,
    action: "billing_invoice_voided",
    entityType: "billing_invoice",
    entityId: saved.id,
  });
  return saved;
}

async function applyVerifiedPayment(payment: BillingPayment) {
  if (!payment.invoice_id) return payment;
  const invoice = await getInvoice(payment.organization_id, payment.invoice_id);
  if (!invoice || invoice.status === "VOID") return payment;
  const amountPaid = invoice.amount_paid + payment.amount;
  const outstanding = Math.max(0, invoice.total - amountPaid);
  const status = invoiceStatusFromAmounts(invoice.total, amountPaid, invoice.due_date, today(), invoice.status);
  const updated = await upsertInvoice({
    ...invoice,
    amount_paid: amountPaid,
    outstanding,
    status,
    paid_at: status === "PAID" ? stamp() : invoice.paid_at,
    updated_at: stamp(),
  });
  if (status === "PAID" && invoice.subscription_id) {
    const subscription = await getSubscription(invoice.subscription_id);
    if (subscription && ["TRIAL", "PAST_DUE", "GRACE_PERIOD", "SUSPENDED", "ACTIVE"].includes(subscription.status)) {
      const start = addDays(subscription.current_period_end, 1);
      const end = periodEnd(start, subscription.billing_cycle);
      const next = await upsertSubscription({
        ...subscription,
        status: "ACTIVE",
        current_period_start: start,
        current_period_end: end,
        renews_at: addDays(end, 1),
        grace_ends_at: null,
        updated_at: stamp(),
      });
      await recordHistory({
        organizationId: next.organization_id,
        subscriptionId: next.id,
        eventType: "RENEWED",
        fromStatus: subscription.status,
        toStatus: "ACTIVE",
        metadata: { invoiceId: updated.id, paymentId: payment.id },
      });
    }
  }
  return payment;
}

export async function createPendingCheckout(input: CheckoutRequest & { actorId: string | null }) {
  if (!isPaymentProviderConfigured()) {
    return { ok: false as const, message: unconfiguredCheckoutMessage() };
  }
  const invoice = await getInvoice(input.organizationId, input.invoiceId);
  if (!invoice) return { ok: false as const, message: "Invoice not found." };
  if (invoice.status === "VOID" || invoice.status === "PAID") {
    return { ok: false as const, message: "Invoice is not payable." };
  }
  const { createCheckout } = await import("@/lib/billing/provider");
  const checkout = await createCheckout(input);
  if (!checkout.configured) return { ok: false as const, message: checkout.message };
  const payment = await upsertPayment({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    invoice_id: invoice.id,
    subscription_id: invoice.subscription_id,
    provider: checkout.provider,
    provider_order_id: checkout.orderId,
    provider_payment_id: null,
    amount: invoice.outstanding,
    currency: invoice.currency,
    status: "PENDING",
    failure_reason: null,
    verified: false,
    verified_at: null,
    refunded_at: null,
    idempotency_key: `checkout:${invoice.id}:${checkout.orderId}`,
    created_by: input.actorId,
    created_at: stamp(),
    updated_at: stamp(),
  });
  return { ok: true as const, checkout, payment };
}

export async function verifyAndCapturePayment(input: {
  organizationId: string;
  orderId: string;
  paymentId: string;
  signature: string;
  actorId: string | null;
}) {
  if (!isPaymentProviderConfigured()) {
    return { ok: false as const, message: unconfiguredCheckoutMessage() };
  }
  const existing = await getPaymentByProviderId("RAZORPAY", input.paymentId);
  if (existing?.verified && existing.status === "SUCCESS") {
    return { ok: true as const, payment: existing, duplicate: true };
  }
  if (!verifyPaymentSignature({ orderId: input.orderId, paymentId: input.paymentId, signature: input.signature })) {
    const failed = await upsertPayment({
      id: existing?.id ?? crypto.randomUUID(),
      organization_id: input.organizationId,
      invoice_id: existing?.invoice_id ?? null,
      subscription_id: existing?.subscription_id ?? null,
      provider: "RAZORPAY",
      provider_order_id: input.orderId,
      provider_payment_id: input.paymentId,
      amount: existing?.amount ?? 0,
      currency: existing?.currency ?? "INR",
      status: "FAILED",
      failure_reason: "Invalid payment signature.",
      verified: false,
      verified_at: null,
      refunded_at: null,
      idempotency_key: existing?.idempotency_key ?? `verify:${input.paymentId}`,
      created_by: input.actorId,
      created_at: existing?.created_at ?? stamp(),
      updated_at: stamp(),
    });
    return { ok: false as const, message: "Payment signature is invalid.", payment: failed };
  }
  const pending =
    existing ??
    (await listPayments(input.organizationId)).find((row) => row.provider_order_id === input.orderId) ??
    null;
  const payment = await upsertPayment({
    id: pending?.id ?? crypto.randomUUID(),
    organization_id: input.organizationId,
    invoice_id: pending?.invoice_id ?? null,
    subscription_id: pending?.subscription_id ?? null,
    provider: "RAZORPAY",
    provider_order_id: input.orderId,
    provider_payment_id: input.paymentId,
    amount: pending?.amount ?? 0,
    currency: pending?.currency ?? "INR",
    status: "SUCCESS",
    failure_reason: null,
    verified: true,
    verified_at: stamp(),
    refunded_at: null,
    idempotency_key: pending?.idempotency_key ?? `verify:${input.paymentId}`,
    created_by: input.actorId,
    created_at: pending?.created_at ?? stamp(),
    updated_at: stamp(),
  });
  await applyVerifiedPayment(payment);
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorId,
    action: "billing_payment_verified",
    entityType: "billing_payment",
    entityId: payment.id,
    metadata: { providerPaymentId: input.paymentId },
  });
  return { ok: true as const, payment, duplicate: false };
}

export async function processProviderWebhook(rawBody: string, signature: string) {
  const parsed = parseWebhook(rawBody, signature);
  const existing = await getWebhookEvent(parsed.provider, parsed.eventId);
  if (existing?.processed) {
    return { ok: true as const, duplicate: true, event: existing };
  }
  const event: PaymentWebhookEvent = {
    id: existing?.id ?? crypto.randomUUID(),
    provider: parsed.provider,
    provider_event_id: parsed.eventId,
    event_type: parsed.eventType,
    organization_id: existing?.organization_id ?? null,
    payment_id: existing?.payment_id ?? null,
    signature_valid: parsed.signatureValid,
    processed: false,
    processed_at: null,
    error_message: parsed.signatureValid ? null : "Invalid webhook signature.",
    payload_json: rawBody.slice(0, 8000),
    created_at: existing?.created_at ?? stamp(),
  };
  if (!parsed.signatureValid) {
    await upsertWebhookEvent(event);
    return { ok: false as const, duplicate: false, event, message: "Invalid webhook signature." };
  }
  if (parsed.paymentId) {
    const payment = await getPaymentByProviderId(parsed.provider, parsed.paymentId);
    if (payment) {
      event.organization_id = payment.organization_id;
      event.payment_id = payment.id;
      if (parsed.status === "SUCCESS" && !payment.verified) {
        const updated = await upsertPayment({
          ...payment,
          status: "SUCCESS",
          verified: true,
          verified_at: stamp(),
          updated_at: stamp(),
        });
        await applyVerifiedPayment(updated);
      } else if (parsed.status === "FAILED") {
        await upsertPayment({
          ...payment,
          status: "FAILED",
          failure_reason: payment.failure_reason ?? parsed.eventType,
          updated_at: stamp(),
        });
      } else if (parsed.status === "REFUNDED") {
        await upsertPayment({
          ...payment,
          status: "REFUNDED",
          refunded_at: stamp(),
          updated_at: stamp(),
        });
      }
    }
  }
  event.processed = true;
  event.processed_at = stamp();
  const saved = await upsertWebhookEvent(event);
  return { ok: true as const, duplicate: false, event: saved };
}

export async function saveCustomerBillingProfile(row: BillingProfile, actorId: string) {
  const saved = await upsertBillingProfile({ ...row, updated_by: actorId, updated_at: stamp() });
  await writeAudit({
    organizationId: row.organization_id,
    actorUserId: actorId,
    action: "billing_profile_updated",
    entityType: "billing_profile",
    entityId: row.organization_id,
  });
  return saved;
}

export async function refreshUsage(organizationId: string) {
  const subscription = await getOpenSubscription(organizationId);
  return persistUsage(organizationId, subscription);
}

export async function adminOverview() {
  const [plans, subscriptions, invoices, payments] = await Promise.all([
    listPlans(),
    (await import("@/lib/billing/repository")).listSubscriptions(),
    listInvoices(),
    listPayments(),
  ]);
  return {
    plans,
    subscriptions,
    invoices,
    payments,
    provider: providerStatus(),
    renewals: subscriptions.filter((row) => row.renews_at && row.renews_at <= addDays(today(), 14)),
    failedPayments: payments.filter((row) => row.status === "FAILED"),
  };
}

export { getPaymentByIdempotency, listInvoiceLines, listPlans };
