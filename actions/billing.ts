"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { flattenErrors, optional } from "@/lib/form-errors";
import {
  billingProfileSchema,
  cancelSubscriptionSchema,
  changePlanSchema,
  overrideSubscriptionSchema,
  planSchema,
  platformBillingSchema,
  startSubscriptionSchema,
} from "@/lib/validations/billing";
import {
  cancelSubscription,
  changePlan,
  createPendingCheckout,
  overrideSubscription,
  retirePlan,
  saveCustomerBillingProfile,
  savePlan,
  savePlatformSettings,
  startSubscription,
  voidInvoice,
  platformSettings,
} from "@/lib/billing/service";
import { getBillingProfile, getInvoice, getPlan } from "@/lib/billing/repository";
import { unconfiguredCheckoutMessage } from "@/lib/billing/provider";
import type { ActionResult, SubscriptionPlan } from "@/types";
import type { PermissionCode } from "@/lib/constants";

function refresh() {
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/subscriptions/plans");
  revalidatePath("/settings/subscription");
  revalidatePath("/settings/subscription/usage");
  revalidatePath("/billing/invoices");
  revalidatePath("/billing/payments");
}

function limitOrNull(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return null;
  return value;
}

async function requireBilling(permission: PermissionCode, platformOnly = false) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." as const, user: null };
  if (platformOnly && user.roleCode !== "SUPER_ADMIN") {
    return { error: "Platform administrator access is required." as const, user: null };
  }
  if (!hasPermission(user, permission)) {
    return { error: "You do not have permission for this billing action." as const, user: null };
  }
  return { error: null, user };
}

export async function savePlanAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const access = await requireBilling("plans.manage", true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = planSchema.safeParse({
    id: optional(formData.get("id")),
    code: formData.get("code"),
    name: formData.get("name"),
    description: optional(formData.get("description")),
    billingCycleDefault: formData.get("billingCycleDefault") || "MONTHLY",
    monthlyPrice: formData.get("monthlyPrice"),
    annualPrice: formData.get("annualPrice"),
    currency: formData.get("currency") || "INR",
    trialDays: formData.get("trialDays") || 0,
    employeeLimit: formData.get("employeeLimit") || undefined,
    branchLimit: formData.get("branchLimit") || undefined,
    biometricDeviceLimit: formData.get("biometricDeviceLimit") || undefined,
    modules: optional(formData.get("modules")),
    apiAccess: formData.get("apiAccess") ? "true" : "false",
    advancedAnalytics: formData.get("advancedAnalytics") ? "true" : "false",
    reportsExport: formData.get("reportsExport") ? "true" : "false",
    status: formData.get("status") || "DRAFT",
    effectiveFrom: optional(formData.get("effectiveFrom")),
    effectiveTo: optional(formData.get("effectiveTo")),
    reason: optional(formData.get("reason")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  const values = parsed.data;
  const existing = values.id ? await getPlan(values.id) : null;
  const modules = (values.modules || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  try {
    const saved = await savePlan({
      existing,
      actorId: access.user.id,
      reason: values.reason,
      values: {
        code: values.code,
        name: values.name,
        description: values.description || null,
        billing_cycle_default: values.billingCycleDefault,
        monthly_price: values.monthlyPrice,
        annual_price: values.annualPrice,
        currency: values.currency,
        trial_days: values.trialDays,
        employee_limit: limitOrNull(values.employeeLimit),
        branch_limit: limitOrNull(values.branchLimit),
        biometric_device_limit: limitOrNull(values.biometricDeviceLimit),
        modules_json: JSON.stringify(modules),
        entitlements_json: JSON.stringify({
          apiAccess: values.apiAccess !== "false",
          advancedAnalytics: values.advancedAnalytics === "true",
          reportsExport: values.reportsExport !== "false",
        }),
        status: values.status,
        effective_from: values.effectiveFrom || null,
        effective_to: values.effectiveTo || null,
      } as Omit<SubscriptionPlan, "id" | "created_at" | "updated_at" | "created_by" | "updated_by">,
      entitlements: [
        { key: "employees", limit: limitOrNull(values.employeeLimit), enabled: true },
        { key: "branches", limit: limitOrNull(values.branchLimit), enabled: true },
        { key: "biometric_devices", limit: limitOrNull(values.biometricDeviceLimit), enabled: true },
        { key: "api_access", limit: null, enabled: values.apiAccess !== "false" },
        { key: "advanced_analytics", limit: null, enabled: values.advancedAnalytics === "true" },
        { key: "reports_export", limit: null, enabled: values.reportsExport !== "false" },
      ],
    });
    refresh();
    return { success: true, message: existing ? "Plan updated. Previous prices were preserved." : "Plan created.", data: { id: saved.id } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save plan." };
  }
}

export async function retirePlanAction(planId: string): Promise<ActionResult> {
  const access = await requireBilling("plans.manage", true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  await retirePlan(planId, access.user.id);
  refresh();
  return { success: true, message: "Plan retired. Existing subscriptions keep their price snapshot." };
}

export async function startSubscriptionAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireBilling("subscriptions.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = startSubscriptionSchema.safeParse({
    planId: formData.get("planId"),
    billingCycle: formData.get("billingCycle") || "MONTHLY",
    startTrial: formData.get("startTrial") ? "true" : "false",
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };
  try {
    await startSubscription({
      organizationId: access.user.organization.id,
      planId: parsed.data.planId,
      cycle: parsed.data.billingCycle,
      actorId: access.user.id,
      startTrial: parsed.data.startTrial === "true",
      notes: parsed.data.notes,
    });
    refresh();
    return { success: true, message: parsed.data.startTrial === "true" ? "Trial started." : "Subscription activated. Payment is still required when a provider is configured." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not start subscription." };
  }
}

export async function changePlanAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireBilling("subscriptions.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = changePlanSchema.safeParse({
    planId: formData.get("planId"),
    billingCycle: formData.get("billingCycle") || "MONTHLY",
    reason: optional(formData.get("reason")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };
  try {
    await changePlan({
      organizationId: access.user.organization.id,
      planId: parsed.data.planId,
      cycle: parsed.data.billingCycle,
      actorId: access.user.id,
      reason: parsed.data.reason,
    });
    refresh();
    return { success: true, message: "Plan change recorded. Historical invoices are unchanged." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not change plan." };
  }
}

export async function cancelSubscriptionAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireBilling("subscriptions.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = cancelSubscriptionSchema.safeParse({
    atPeriodEnd: formData.get("atPeriodEnd") ? "true" : "false",
    reason: optional(formData.get("reason")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };
  try {
    await cancelSubscription({
      organizationId: access.user.organization.id,
      actorId: access.user.id,
      atPeriodEnd: parsed.data.atPeriodEnd === "true",
      reason: parsed.data.reason,
    });
    refresh();
    return { success: true, message: "Subscription cancelled. Customer data is preserved." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not cancel subscription." };
  }
}

export async function overrideSubscriptionAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireBilling("subscription.override", true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = overrideSubscriptionSchema.safeParse({
    organizationId: formData.get("organizationId"),
    status: formData.get("status"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };
  try {
    await overrideSubscription({
      organizationId: parsed.data.organizationId,
      status: parsed.data.status,
      actorId: access.user.id,
      reason: parsed.data.reason,
    });
    refresh();
    return { success: true, message: "Override recorded." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not override subscription." };
  }
}

export async function saveBillingProfileAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireBilling("billing.view");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  if (!hasPermission(access.user, "organization.edit") && !hasPermission(access.user, "billing.invoice.manage")) {
    return { success: false, message: "You cannot edit billing details." };
  }
  const parsed = billingProfileSchema.safeParse({
    legalName: optional(formData.get("legalName")),
    billingEmail: optional(formData.get("billingEmail")),
    addressLine1: optional(formData.get("addressLine1")),
    addressLine2: optional(formData.get("addressLine2")),
    city: optional(formData.get("city")),
    state: optional(formData.get("state")),
    pin: optional(formData.get("pin")),
    country: optional(formData.get("country")) || "IN",
    gstin: optional(formData.get("gstin")),
    pan: optional(formData.get("pan")),
    taxId: optional(formData.get("taxId")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };
  const existing = await getBillingProfile(access.user.organization.id);
  const now = new Date().toISOString();
  await saveCustomerBillingProfile(
    {
      organization_id: access.user.organization.id,
      legal_name: parsed.data.legalName || null,
      billing_email: parsed.data.billingEmail || null,
      address_line1: parsed.data.addressLine1 || null,
      address_line2: parsed.data.addressLine2 || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      pin: parsed.data.pin || null,
      country: parsed.data.country || "IN",
      gstin: parsed.data.gstin || null,
      pan: parsed.data.pan || null,
      tax_id: parsed.data.taxId || null,
      tax_label: existing?.tax_label ?? null,
      tax_rate: existing?.tax_rate ?? null,
      currency: existing?.currency ?? access.user.organization.currency,
      invoice_notes: existing?.invoice_notes ?? null,
      updated_by: access.user.id,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    },
    access.user.id
  );
  refresh();
  return { success: true, message: "Billing profile saved." };
}

export async function savePlatformBillingAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireBilling("plans.manage", true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = platformBillingSchema.safeParse({
    legalName: optional(formData.get("legalName")),
    billingEmail: optional(formData.get("billingEmail")),
    addressLine1: optional(formData.get("addressLine1")),
    city: optional(formData.get("city")),
    state: optional(formData.get("state")),
    pin: optional(formData.get("pin")),
    gstin: optional(formData.get("gstin")),
    pan: optional(formData.get("pan")),
    taxLabel: optional(formData.get("taxLabel")),
    taxRate: formData.get("taxRate") || undefined,
    invoicePrefix: formData.get("invoicePrefix") || "BSB",
    taxConfigured: formData.get("taxConfigured") ? "true" : "false",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };
  const existing = await platformSettings();
  const taxRate = Number.isNaN(parsed.data.taxRate as number) ? null : (parsed.data.taxRate as number | undefined) ?? null;
  await savePlatformSettings(
    {
      ...existing,
      legal_name: parsed.data.legalName || null,
      billing_email: parsed.data.billingEmail || null,
      address_line1: parsed.data.addressLine1 || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      pin: parsed.data.pin || null,
      gstin: parsed.data.gstin || null,
      pan: parsed.data.pan || null,
      tax_label: parsed.data.taxLabel || null,
      tax_rate: taxRate,
      invoice_prefix: parsed.data.invoicePrefix,
      tax_configured: parsed.data.taxConfigured === "true" && taxRate !== null,
      updated_by: access.user.id,
      updated_at: new Date().toISOString(),
    },
    access.user.id
  );
  refresh();
  return { success: true, message: parsed.data.taxConfigured === "true" && taxRate !== null ? "Platform billing saved." : "Saved. Tax remains unconfigured until a rate is set." };
}

export async function startCheckoutAction(invoiceId: string): Promise<ActionResult<{ message: string }>> {
  const access = await requireBilling("billing.view");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const invoice = await getInvoice(access.user.organization.id, invoiceId);
  if (!invoice) return { success: false, message: "Invoice not found." };
  const result = await createPendingCheckout({
    organizationId: access.user.organization.id,
    invoiceId,
    amount: invoice.outstanding,
    currency: invoice.currency,
    receipt: invoice.invoice_number,
    actorId: access.user.id,
  });
  if (!result.ok) return { success: false, message: result.message || unconfiguredCheckoutMessage() };
  refresh();
  return { success: true, message: "Checkout order created. Confirm payment only after provider verification." };
}

export async function voidInvoiceAction(invoiceId: string): Promise<ActionResult> {
  const access = await requireBilling("billing.invoice.manage", true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  try {
    await voidInvoice(access.user.organization.id, invoiceId, access.user.id);
    refresh();
    return { success: true, message: "Invoice voided." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not void invoice." };
  }
}
