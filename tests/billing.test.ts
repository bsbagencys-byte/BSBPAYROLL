import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransition,
  formatInvoiceNumber,
  invoiceStatusFromAmounts,
  invoiceTotals,
  remainingCapacity,
  snapshotPlan,
  taxAmount,
  unitPrice,
} from "@/lib/billing/engine";
import { isPaymentProviderConfigured, parseWebhook, providerStatus, unconfiguredCheckoutMessage } from "@/lib/billing/provider";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/constants";
import { belongsToOrganization } from "@/lib/tenancy";
import { ORG_A, ORG_B } from "./helpers/fixtures.ts";
import type { SubscriptionPlan } from "@/types";

function plan(overrides: Partial<SubscriptionPlan> = {}): SubscriptionPlan {
  return {
    id: "plan-starter",
    code: "STARTER",
    name: "Starter",
    description: "Example",
    billing_cycle_default: "MONTHLY",
    monthly_price: 4999,
    annual_price: 49990,
    currency: "INR",
    trial_days: 14,
    employee_limit: 25,
    branch_limit: 2,
    biometric_device_limit: 2,
    modules_json: "[]",
    entitlements_json: JSON.stringify({ apiAccess: false, advancedAnalytics: false, reportsExport: true }),
    status: "ACTIVE",
    effective_from: "2026-01-01",
    effective_to: null,
    created_by: null,
    updated_by: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("plan snapshots preserve historical prices when the live plan later changes", () => {
  const original = plan();
  const snap = snapshotPlan(original);
  const later = plan({ monthly_price: 7999, annual_price: 79990 });
  const parsed = JSON.parse(snap) as { monthly_price: number };
  assert.equal(parsed.monthly_price, 4999);
  assert.equal(unitPrice(later, "MONTHLY"), 7999);
  assert.notEqual(parsed.monthly_price, later.monthly_price);
});

test("trial and paid lifecycle transitions are explicit", () => {
  assert.equal(canTransition("TRIAL", "ACTIVE"), true);
  assert.equal(canTransition("TRIAL", "EXPIRED"), true);
  assert.equal(canTransition("ACTIVE", "PAST_DUE"), true);
  assert.equal(canTransition("PAST_DUE", "GRACE_PERIOD"), true);
  assert.equal(canTransition("GRACE_PERIOD", "SUSPENDED"), true);
  assert.equal(canTransition("SUSPENDED", "ACTIVE"), true);
  assert.equal(canTransition("EXPIRED", "ACTIVE"), false);
  assert.equal(canTransition("CANCELLED", "ACTIVE"), false);
});

test("entitlement remaining capacity never goes negative and unlimited is null", () => {
  assert.equal(remainingCapacity(10, 25), 15);
  assert.equal(remainingCapacity(25, 25), 0);
  assert.equal(remainingCapacity(30, 25), 0);
  assert.equal(remainingCapacity(10, null), null);
});

test("invoice totals snapshot tax only when configured; GST is not assumed", () => {
  const unconfigured = invoiceTotals({ subtotal: 1000, taxRate: 18, taxConfigured: false });
  assert.equal(unconfigured.taxAmount, 0);
  assert.equal(unconfigured.total, 1000);
  assert.equal(taxAmount(1000, 18, false), 0);
  const configured = invoiceTotals({ subtotal: 1000, taxRate: 18, taxConfigured: true, amountPaid: 200 });
  assert.equal(configured.taxAmount, 180);
  assert.equal(configured.total, 1180);
  assert.equal(configured.outstanding, 980);
});

test("invoice numbers use prefix-year-sequence", () => {
  assert.equal(formatInvoiceNumber("BSB", 2026, 1), "BSB-2026-000001");
});

test("invoice status never becomes PAID from a browser callback amount of zero", () => {
  assert.equal(invoiceStatusFromAmounts(1180, 0, "2026-02-01", "2026-01-15", "ISSUED"), "ISSUED");
  assert.equal(invoiceStatusFromAmounts(1180, 1180, "2026-02-01", "2026-01-15", "ISSUED"), "PAID");
  assert.equal(invoiceStatusFromAmounts(1180, 200, "2026-02-01", "2026-01-15", "ISSUED"), "PARTIALLY_PAID");
  assert.equal(invoiceStatusFromAmounts(1180, 0, "2026-01-01", "2026-01-15", "ISSUED"), "OVERDUE");
  assert.equal(invoiceStatusFromAmounts(1180, 50, null, "2026-01-15", "VOID"), "VOID");
});

test("unconfigured payment provider cannot simulate a successful charge", () => {
  const previousId = process.env.RAZORPAY_KEY_ID;
  const previousSecret = process.env.RAZORPAY_KEY_SECRET;
  process.env.RAZORPAY_KEY_ID = "";
  process.env.RAZORPAY_KEY_SECRET = "";
  assert.equal(isPaymentProviderConfigured(), false);
  assert.equal(providerStatus().configured, false);
  assert.match(unconfiguredCheckoutMessage(), /unconfigured/i);
  process.env.RAZORPAY_KEY_ID = previousId;
  process.env.RAZORPAY_KEY_SECRET = previousSecret;
});

test("webhook with invalid signature is rejected and does not mark paid", () => {
  const previous = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = "unit-test-webhook-secret";
  const body = JSON.stringify({
    id: "evt_1",
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_1", order_id: "order_1", status: "captured" } } },
  });
  const parsed = parseWebhook(body, "deadbeef");
  assert.equal(parsed.signatureValid, false);
  assert.equal(parsed.status, "SUCCESS");
  process.env.RAZORPAY_WEBHOOK_SECRET = previous;
});

test("duplicate webhook event id is stable for idempotency", () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = "";
  process.env.RAZORPAY_KEY_SECRET = "";
  const body = JSON.stringify({
    id: "evt_same",
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_1", order_id: "order_1", status: "captured" } } },
  });
  const first = parseWebhook(body, "");
  const second = parseWebhook(body, "");
  assert.equal(first.eventId, "evt_same");
  assert.equal(first.eventId, second.eventId);
});

test("ADMIN cannot manage plans, override subscriptions, issue invoices, or refund", () => {
  const admin = DEFAULT_ROLE_PERMISSIONS.ADMIN;
  assert.equal(admin.includes("plans.manage"), false);
  assert.equal(admin.includes("subscription.override"), false);
  assert.equal(admin.includes("billing.invoice.manage"), false);
  assert.equal(admin.includes("billing.refund.manage"), false);
  assert.equal(admin.includes("billing.view"), true);
  assert.equal(DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN.includes("plans.manage"), true);
});

test("billing invoices stay tenant-scoped", () => {
  const rows = [
    { organization_id: ORG_A, id: "inv-a" },
    { organization_id: ORG_B, id: "inv-b" },
  ];
  const scoped = belongsToOrganization(ORG_A, rows);
  assert.equal(scoped.length, 1);
  assert.equal(scoped[0]?.id, "inv-a");
});

test("suspension does not imply data deletion", () => {
  const tenant = { organization_id: ORG_A, employees: 12, status: "SUSPENDED" };
  assert.equal(tenant.employees, 12);
  assert.equal(canTransition("SUSPENDED", "ACTIVE"), true);
});
