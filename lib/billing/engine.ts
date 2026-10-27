import { OPEN_SUBSCRIPTION_STATUSES, type BillingCycle, type SubscriptionStatus } from "@/lib/constants";
import type { PlanEntitlements, SubscriptionPlan } from "@/types";

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isoDate(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function addMonths(date: string, months: number) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1 + months, day));
  return next.toISOString().slice(0, 10);
}

export function periodEnd(start: string, cycle: BillingCycle) {
  const exclusive = cycle === "ANNUAL" ? addMonths(start, 12) : addMonths(start, 1);
  return addDays(exclusive, -1);
}

export function unitPrice(plan: SubscriptionPlan, cycle: BillingCycle) {
  return roundMoney(cycle === "ANNUAL" ? Number(plan.annual_price) : Number(plan.monthly_price));
}

export function entitlementsFromSnapshot(subscription: { plan_snapshot_json: string } | null, plan: SubscriptionPlan | null): PlanEntitlements | null {
  if (subscription?.plan_snapshot_json) {
    try {
      const snapshot = JSON.parse(subscription.plan_snapshot_json) as SubscriptionPlan;
      return parseEntitlements(snapshot);
    } catch {
      /* fall through */
    }
  }
  if (plan) return parseEntitlements(plan);
  return null;
}

export function parseEntitlements(plan: Pick<SubscriptionPlan, "employee_limit" | "branch_limit" | "biometric_device_limit" | "modules_json" | "entitlements_json">): PlanEntitlements {
  let extra: Record<string, unknown> = {};
  try {
    extra = JSON.parse(plan.entitlements_json || "{}") as Record<string, unknown>;
  } catch {
    extra = {};
  }
  let modules: string[] = [];
  try {
    const parsed = JSON.parse(plan.modules_json || "[]");
    modules = Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    modules = [];
  }
  return {
    employeeLimit: plan.employee_limit,
    branchLimit: plan.branch_limit,
    biometricDeviceLimit: plan.biometric_device_limit,
    modules,
    apiAccess: extra.apiAccess !== false,
    advancedAnalytics: extra.advancedAnalytics === true,
    reportsExport: extra.reportsExport !== false,
  };
}

export function snapshotPlan(plan: SubscriptionPlan) {
  return JSON.stringify({
    id: plan.id,
    code: plan.code,
    name: plan.name,
    monthly_price: plan.monthly_price,
    annual_price: plan.annual_price,
    currency: plan.currency,
    trial_days: plan.trial_days,
    employee_limit: plan.employee_limit,
    branch_limit: plan.branch_limit,
    biometric_device_limit: plan.biometric_device_limit,
    modules_json: plan.modules_json,
    entitlements_json: plan.entitlements_json,
    captured_at: new Date().toISOString(),
  });
}

export function isOpenSubscription(status: SubscriptionStatus) {
  return OPEN_SUBSCRIPTION_STATUSES.includes(status);
}

export function canTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  if (from === to) return true;
  const allowed: Record<SubscriptionStatus, SubscriptionStatus[]> = {
    TRIAL: ["ACTIVE", "EXPIRED", "CANCELLED", "SUSPENDED"],
    ACTIVE: ["PAST_DUE", "GRACE_PERIOD", "CANCELLED", "SUSPENDED", "EXPIRED", "ACTIVE"],
    PAST_DUE: ["GRACE_PERIOD", "ACTIVE", "SUSPENDED", "CANCELLED", "EXPIRED"],
    GRACE_PERIOD: ["ACTIVE", "SUSPENDED", "CANCELLED", "EXPIRED"],
    SUSPENDED: ["ACTIVE", "CANCELLED", "EXPIRED"],
    CANCELLED: ["EXPIRED"],
    EXPIRED: [],
  };
  return allowed[from].includes(to);
}

export function remainingCapacity(quantity: number, limit: number | null) {
  if (limit === null || limit === undefined) return null;
  return Math.max(0, limit - quantity);
}

export function taxAmount(subtotal: number, taxRate: number | null, taxConfigured: boolean) {
  if (!taxConfigured || taxRate === null || taxRate === undefined) return 0;
  return roundMoney((subtotal * taxRate) / 100);
}

export function invoiceTotals(input: {
  subtotal: number;
  discountAmount?: number;
  taxRate: number | null;
  taxConfigured: boolean;
  amountPaid?: number;
}) {
  const subtotal = roundMoney(input.subtotal);
  const discountAmount = roundMoney(input.discountAmount ?? 0);
  const taxable = Math.max(0, roundMoney(subtotal - discountAmount));
  const tax = taxAmount(taxable, input.taxRate, input.taxConfigured);
  const total = roundMoney(taxable + tax);
  const amountPaid = roundMoney(input.amountPaid ?? 0);
  const outstanding = roundMoney(Math.max(0, total - amountPaid));
  return { subtotal, discountAmount, taxAmount: tax, total, amountPaid, outstanding };
}

export function invoiceStatusFromAmounts(total: number, amountPaid: number, dueDate: string | null, today: string, current: "DRAFT" | "VOID" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE") {
  if (current === "DRAFT" || current === "VOID") return current;
  if (amountPaid <= 0) {
    if (dueDate && dueDate < today) return "OVERDUE";
    return "ISSUED";
  }
  if (amountPaid + 0.001 >= total) return "PAID";
  if (dueDate && dueDate < today) return "OVERDUE";
  return "PARTIALLY_PAID";
}

export function formatInvoiceNumber(prefix: string, year: number, sequence: number) {
  return `${prefix}-${year}-${String(sequence).padStart(6, "0")}`;
}
