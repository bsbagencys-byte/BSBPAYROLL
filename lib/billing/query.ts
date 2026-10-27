import { applyLifecycle } from "@/lib/billing/service";
import { providerStatus } from "@/lib/billing/provider";
import {
  getBillingProfile,
  getInvoice,
  getOpenSubscription,
  getPlan,
  listInvoices,
  listInvoiceLines,
  listPayments,
  listPlanPriceHistory,
  listPlans,
  listSubscriptionHistory,
  listSubscriptions,
} from "@/lib/billing/repository";
import { measureUsage } from "@/lib/billing/usage";
import { platformSettings } from "@/lib/billing/service";

export async function loadOrgBilling(organizationId: string) {
  const raw = await getOpenSubscription(organizationId);
  const subscription = raw ? await applyLifecycle(raw) : null;
  const [plans, invoices, payments, history, profile, settings] = await Promise.all([
    listPlans(),
    listInvoices(organizationId),
    listPayments(organizationId),
    subscription ? listSubscriptionHistory(organizationId, subscription.id) : listSubscriptionHistory(organizationId),
    getBillingProfile(organizationId),
    platformSettings(),
  ]);
  const plan = subscription ? await getPlan(subscription.plan_id) : null;
  const usage = await measureUsage(organizationId, subscription);
  return {
    subscription,
    plan,
    plans: plans.filter((item) => item.status === "ACTIVE" || item.id === subscription?.plan_id),
    invoices,
    payments,
    history,
    profile,
    settings,
    usage,
    provider: providerStatus(),
  };
}

export async function loadInvoiceDetail(organizationId: string, invoiceId: string) {
  const invoice = await getInvoice(organizationId, invoiceId);
  if (!invoice) return null;
  const lines = await listInvoiceLines(invoice.id);
  return { invoice, lines };
}

export async function loadAdminBilling(filters?: {
  organizationId?: string;
  planId?: string;
  status?: string;
  paymentStatus?: string;
}) {
  const [plans, subscriptions, invoices, payments] = await Promise.all([
    listPlans(),
    listSubscriptions(filters?.organizationId),
    listInvoices(filters?.organizationId),
    listPayments(filters?.organizationId),
  ]);
  return {
    plans,
    subscriptions: subscriptions.filter((row) => {
      if (filters?.planId && row.plan_id !== filters.planId) return false;
      if (filters?.status && row.status !== filters.status) return false;
      return true;
    }),
    invoices,
    payments: payments.filter((row) => {
      if (filters?.paymentStatus && row.status !== filters.paymentStatus) return false;
      return true;
    }),
    provider: providerStatus(),
  };
}

export async function loadPlanDetail(planId: string) {
  const plan = await getPlan(planId);
  if (!plan) return null;
  const history = await listPlanPriceHistory(planId);
  return { plan, history };
}
