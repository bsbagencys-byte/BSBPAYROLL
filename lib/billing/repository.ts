import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BillingAdjustment,
  BillingInvoice,
  BillingInvoiceLine,
  BillingPayment,
  BillingProfile,
  OrganizationSubscription,
  PaymentWebhookEvent,
  PlanEntitlementRow,
  PlanPriceHistory,
  PlatformBillingSettings,
  SubscriptionHistory,
  SubscriptionPlan,
  SubscriptionUsage,
} from "@/types";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

function stamp() {
  return new Date().toISOString();
}

export async function listPlans() {
  if (demoEnabled()) return getDemoStore().subscriptionPlans.slice();
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("subscription_plans").select("*").order("created_at", { ascending: true });
  return (data ?? []) as SubscriptionPlan[];
}

export async function listActivePlans() {
  const rows = await listPlans();
  return rows.filter((row) => row.status === "ACTIVE");
}

export async function getPlan(id: string) {
  const rows = await listPlans();
  return rows.find((row) => row.id === id) ?? null;
}

export async function getPlanByCode(code: string) {
  const rows = await listPlans();
  return rows.find((row) => row.code.toLowerCase() === code.toLowerCase()) ?? null;
}

export async function upsertPlan(row: SubscriptionPlan) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const index = store.subscriptionPlans.findIndex((item) => item.id === row.id);
    if (index >= 0) store.subscriptionPlans[index] = row;
    else store.subscriptionPlans.push(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("subscription_plans").upsert(row).select("*").single();
  if (error) throw error;
  return data as SubscriptionPlan;
}

export async function listPlanEntitlements(planId: string) {
  if (demoEnabled()) return getDemoStore().planEntitlements.filter((row) => row.plan_id === planId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("plan_entitlements").select("*").eq("plan_id", planId);
  return (data ?? []) as PlanEntitlementRow[];
}

export async function replacePlanEntitlements(planId: string, rows: PlanEntitlementRow[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.planEntitlements = store.planEntitlements.filter((row) => row.plan_id !== planId).concat(rows);
    return rows;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("plan_entitlements").delete().eq("plan_id", planId);
  if (!rows.length) return [];
  const { data, error } = await admin.from("plan_entitlements").insert(rows).select("*");
  if (error) throw error;
  return (data ?? []) as PlanEntitlementRow[];
}

export async function insertPlanPriceHistory(row: PlanPriceHistory) {
  if (demoEnabled()) {
    getDemoStore().planPriceHistory.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("plan_price_history").insert(row).select("*").single();
  if (error) throw error;
  return data as PlanPriceHistory;
}

export async function listPlanPriceHistory(planId: string) {
  if (demoEnabled()) {
    return getDemoStore()
      .planPriceHistory.filter((row) => row.plan_id === planId)
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("plan_price_history")
    .select("*")
    .eq("plan_id", planId)
    .order("created_at", { ascending: false });
  return (data ?? []) as PlanPriceHistory[];
}

export async function listSubscriptions(organizationId?: string) {
  if (demoEnabled()) {
    const rows = getDemoStore().organizationSubscriptions;
    return organizationId ? rows.filter((row) => row.organization_id === organizationId) : rows.slice();
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("organization_subscriptions").select("*").order("created_at", { ascending: false });
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data } = await query;
  return (data ?? []) as OrganizationSubscription[];
}

export async function getOpenSubscription(organizationId: string) {
  const rows = await listSubscriptions(organizationId);
  return (
    rows.find((row) => ["TRIAL", "ACTIVE", "PAST_DUE", "GRACE_PERIOD", "SUSPENDED"].includes(row.status)) ?? null
  );
}

export async function getLatestSubscription(organizationId: string) {
  const rows = await listSubscriptions(organizationId);
  return rows[0] ?? null;
}

export async function getSubscription(id: string) {
  if (demoEnabled()) return getDemoStore().organizationSubscriptions.find((row) => row.id === id) ?? null;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("organization_subscriptions").select("*").eq("id", id).maybeSingle();
  return (data as OrganizationSubscription | null) ?? null;
}

export async function upsertSubscription(row: OrganizationSubscription) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const index = store.organizationSubscriptions.findIndex((item) => item.id === row.id);
    if (index >= 0) store.organizationSubscriptions[index] = row;
    else store.organizationSubscriptions.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("organization_subscriptions").upsert(row).select("*").single();
  if (error) throw error;
  return data as OrganizationSubscription;
}

export async function insertSubscriptionHistory(row: SubscriptionHistory) {
  if (demoEnabled()) {
    getDemoStore().subscriptionHistory.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("subscription_history").insert(row).select("*").single();
  if (error) throw error;
  return data as SubscriptionHistory;
}

export async function listSubscriptionHistory(organizationId: string, subscriptionId?: string) {
  if (demoEnabled()) {
    return getDemoStore()
      .subscriptionHistory.filter(
        (row) => row.organization_id === organizationId && (!subscriptionId || row.subscription_id === subscriptionId)
      )
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin
    .from("subscription_history")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (subscriptionId) query = query.eq("subscription_id", subscriptionId);
  const { data } = await query;
  return (data ?? []) as SubscriptionHistory[];
}

export async function insertUsageSnapshot(row: SubscriptionUsage) {
  if (demoEnabled()) {
    getDemoStore().subscriptionUsage.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("subscription_usage").insert(row).select("*").single();
  if (error) throw error;
  return data as SubscriptionUsage;
}

export async function getBillingProfile(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore().billingProfiles.find((row) => row.organization_id === organizationId) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("billing_profiles").select("*").eq("organization_id", organizationId).maybeSingle();
  return (data as BillingProfile | null) ?? null;
}

export async function upsertBillingProfile(row: BillingProfile) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const index = store.billingProfiles.findIndex((item) => item.organization_id === row.organization_id);
    if (index >= 0) store.billingProfiles[index] = row;
    else store.billingProfiles.push(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("billing_profiles").upsert(row).select("*").single();
  if (error) throw error;
  return data as BillingProfile;
}

export async function getPlatformBillingSettings() {
  if (demoEnabled()) return getDemoStore().platformBillingSettings;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("platform_billing_settings").select("*").eq("id", true).maybeSingle();
  return (data as PlatformBillingSettings | null) ?? null;
}

export async function upsertPlatformBillingSettings(row: PlatformBillingSettings) {
  if (demoEnabled()) {
    getDemoStore().platformBillingSettings = row;
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("platform_billing_settings").upsert(row).select("*").single();
  if (error) throw error;
  return data as PlatformBillingSettings;
}

export async function nextInvoiceNumber(prefix: string) {
  const year = new Date().getUTCFullYear();
  const scope = `${prefix}-${year}`;
  if (demoEnabled()) {
    const store = getDemoStore();
    const current = store.billingInvoiceSequences[scope] ?? 0;
    const next = current + 1;
    store.billingInvoiceSequences[scope] = next;
    return `${prefix}-${year}-${String(next).padStart(6, "0")}`;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data: existing } = await admin
    .from("billing_invoice_sequences")
    .select("*")
    .eq("scope", scope)
    .maybeSingle();
  const last = (existing?.last_number as number | undefined) ?? 0;
  const next = last + 1;
  const { error } = await admin.from("billing_invoice_sequences").upsert({
    scope,
    last_number: next,
    prefix,
    updated_at: stamp(),
  });
  if (error) throw error;
  return `${prefix}-${year}-${String(next).padStart(6, "0")}`;
}

export async function listInvoices(organizationId?: string) {
  if (demoEnabled()) {
    const rows = getDemoStore().billingInvoices;
    return organizationId ? rows.filter((row) => row.organization_id === organizationId) : rows.slice();
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("billing_invoices").select("*").order("created_at", { ascending: false });
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data } = await query;
  return (data ?? []) as BillingInvoice[];
}

export async function getInvoice(organizationId: string, id: string) {
  const rows = await listInvoices(organizationId);
  return rows.find((row) => row.id === id) ?? null;
}

export async function getInvoiceByNumber(invoiceNumber: string) {
  if (demoEnabled()) return getDemoStore().billingInvoices.find((row) => row.invoice_number === invoiceNumber) ?? null;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("billing_invoices").select("*").eq("invoice_number", invoiceNumber).maybeSingle();
  return (data as BillingInvoice | null) ?? null;
}

export async function upsertInvoice(row: BillingInvoice) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const index = store.billingInvoices.findIndex((item) => item.id === row.id);
    if (index >= 0) store.billingInvoices[index] = row;
    else store.billingInvoices.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("billing_invoices").upsert(row).select("*").single();
  if (error) throw error;
  return data as BillingInvoice;
}

export async function listInvoiceLines(invoiceId: string) {
  if (demoEnabled()) {
    return getDemoStore()
      .billingInvoiceLines.filter((row) => row.invoice_id === invoiceId)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("billing_invoice_lines")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true });
  return (data ?? []) as BillingInvoiceLine[];
}

export async function replaceInvoiceLines(invoiceId: string, rows: BillingInvoiceLine[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.billingInvoiceLines = store.billingInvoiceLines.filter((row) => row.invoice_id !== invoiceId).concat(rows);
    return rows;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("billing_invoice_lines").delete().eq("invoice_id", invoiceId);
  if (!rows.length) return [];
  const { data, error } = await admin.from("billing_invoice_lines").insert(rows).select("*");
  if (error) throw error;
  return (data ?? []) as BillingInvoiceLine[];
}

export async function listPayments(organizationId?: string) {
  if (demoEnabled()) {
    const rows = getDemoStore().billingPayments;
    return organizationId ? rows.filter((row) => row.organization_id === organizationId) : rows.slice();
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("billing_payments").select("*").order("created_at", { ascending: false });
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data } = await query;
  return (data ?? []) as BillingPayment[];
}

export async function getPaymentByProviderId(provider: string, providerPaymentId: string) {
  if (demoEnabled()) {
    return (
      getDemoStore().billingPayments.find(
        (row) => row.provider === provider && row.provider_payment_id === providerPaymentId
      ) ?? null
    );
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("billing_payments")
    .select("*")
    .eq("provider", provider)
    .eq("provider_payment_id", providerPaymentId)
    .maybeSingle();
  return (data as BillingPayment | null) ?? null;
}

export async function getPaymentByIdempotency(organizationId: string, key: string) {
  if (demoEnabled()) {
    return (
      getDemoStore().billingPayments.find(
        (row) => row.organization_id === organizationId && row.idempotency_key === key
      ) ?? null
    );
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("billing_payments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", key)
    .maybeSingle();
  return (data as BillingPayment | null) ?? null;
}

export async function upsertPayment(row: BillingPayment) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const index = store.billingPayments.findIndex((item) => item.id === row.id);
    if (index >= 0) store.billingPayments[index] = row;
    else store.billingPayments.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("billing_payments").upsert(row).select("*").single();
  if (error) throw error;
  return data as BillingPayment;
}

export async function getWebhookEvent(provider: string, providerEventId: string) {
  if (demoEnabled()) {
    return (
      getDemoStore().paymentWebhookEvents.find(
        (row) => row.provider === provider && row.provider_event_id === providerEventId
      ) ?? null
    );
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("payment_webhook_events")
    .select("*")
    .eq("provider", provider)
    .eq("provider_event_id", providerEventId)
    .maybeSingle();
  return (data as PaymentWebhookEvent | null) ?? null;
}

export async function upsertWebhookEvent(row: PaymentWebhookEvent) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const index = store.paymentWebhookEvents.findIndex(
      (item) => item.provider === row.provider && item.provider_event_id === row.provider_event_id
    );
    if (index >= 0) store.paymentWebhookEvents[index] = row;
    else store.paymentWebhookEvents.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("payment_webhook_events").upsert(row).select("*").single();
  if (error) throw error;
  return data as PaymentWebhookEvent;
}

export async function insertAdjustment(row: BillingAdjustment) {
  if (demoEnabled()) {
    getDemoStore().billingAdjustments.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("billing_adjustments").insert(row).select("*").single();
  if (error) throw error;
  return data as BillingAdjustment;
}

export async function listAdjustments(organizationId: string) {
  if (demoEnabled()) return getDemoStore().billingAdjustments.filter((row) => row.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("billing_adjustments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as BillingAdjustment[];
}

export async function countActiveEmployees(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore().employees.filter(
      (row) => row.organization_id === organizationId && row.status === "ACTIVE"
    ).length;
  }
  const admin = createAdminClient();
  if (!admin) return 0;
  const { count } = await admin
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE");
  return count ?? 0;
}

export async function countActiveBranches(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore().branches.filter(
      (row) => row.organization_id === organizationId && row.status === "ACTIVE"
    ).length;
  }
  const admin = createAdminClient();
  if (!admin) return 0;
  const { count } = await admin
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE");
  return count ?? 0;
}

export async function countRegisteredDevices(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore().biometricDevices.filter((row) => row.organization_id === organizationId).length;
  }
  const admin = createAdminClient();
  if (!admin) return 0;
  const { count } = await admin
    .from("biometric_devices")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  return count ?? 0;
}

export async function countApiRequests30d(organizationId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  if (demoEnabled()) {
    return getDemoStore().apiRequestLogs.filter(
      (row) => row.organization_id === organizationId && row.created_at >= since
    ).length;
  }
  const admin = createAdminClient();
  if (!admin) return 0;
  const { count } = await admin
    .from("api_request_logs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("created_at", since);
  return count ?? 0;
}

export async function listOrganizationsLite() {
  if (demoEnabled()) {
    const org = getDemoStore().org;
    return [{ id: org.id, name: org.name, status: org.status }];
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("organizations").select("id,name,status").order("name");
  return (data ?? []) as Array<{ id: string; name: string; status: string }>;
}
