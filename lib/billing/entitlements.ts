import { RESTRICTED_SUBSCRIPTION_STATUSES, type EntitlementKey } from "@/lib/constants";
import { entitlementsFromSnapshot, remainingCapacity } from "@/lib/billing/engine";
import { getLatestSubscription, getOpenSubscription, getPlan } from "@/lib/billing/repository";
import { measureUsage } from "@/lib/billing/usage";
import type { OrganizationSubscription, PlanEntitlements, SubscriptionPlan } from "@/types";

export type EntitlementDecision = {
  allowed: boolean;
  key: EntitlementKey;
  current: number;
  limit: number | null;
  remaining: number | null;
  reason: string | null;
  upgradeHref: string;
  restricted: boolean;
  subscription: OrganizationSubscription | null;
  plan: SubscriptionPlan | null;
  entitlements: PlanEntitlements | null;
};

const UPGRADE_HREF = "/settings/subscription";

export function entitlementsFromSubscription(subscription: OrganizationSubscription | null, plan: SubscriptionPlan | null): PlanEntitlements | null {
  return entitlementsFromSnapshot(subscription, plan);
}

export async function loadEntitlementContext(organizationId: string) {
  const open = await getOpenSubscription(organizationId);
  const latest = await getLatestSubscription(organizationId);
  const subscription =
    open ??
    (latest && RESTRICTED_SUBSCRIPTION_STATUSES.includes(latest.status) ? latest : null);
  const plan = subscription ? await getPlan(subscription.plan_id) : null;
  const entitlements = entitlementsFromSnapshot(subscription, plan);
  const restricted = subscription ? RESTRICTED_SUBSCRIPTION_STATUSES.includes(subscription.status) : false;
  return { subscription, plan, entitlements, restricted };
}

export async function checkEntitlement(
  organizationId: string,
  key: EntitlementKey,
  extra = 0
): Promise<EntitlementDecision> {
  const { subscription, plan, entitlements, restricted } = await loadEntitlementContext(organizationId);
  const usage = await measureUsage(organizationId, subscription);
  const metric =
    key === "employees"
      ? usage.find((row) => row.metric_key === "active_employees")
      : key === "branches"
        ? usage.find((row) => row.metric_key === "active_branches")
        : key === "biometric_devices"
          ? usage.find((row) => row.metric_key === "registered_biometric_devices")
          : null;
  const current = metric?.quantity ?? 0;
  const limit =
    key === "employees"
      ? entitlements?.employeeLimit ?? null
      : key === "branches"
        ? entitlements?.branchLimit ?? null
        : key === "biometric_devices"
          ? entitlements?.biometricDeviceLimit ?? null
          : null;
  const featureEnabled =
    key === "api_access"
      ? entitlements?.apiAccess !== false
      : key === "advanced_analytics"
        ? entitlements?.advancedAnalytics === true
        : key === "reports_export"
          ? entitlements?.reportsExport !== false
          : true;

  if (!subscription) {
    return {
      allowed: true,
      key,
      current,
      limit: null,
      remaining: null,
      reason: "No subscription is assigned. Limits are not enforced until a plan is selected.",
      upgradeHref: UPGRADE_HREF,
      restricted: false,
      subscription,
      plan,
      entitlements,
    };
  }

  if (restricted && (key === "employees" || key === "branches" || key === "biometric_devices" || key === "api_access")) {
    return {
      allowed: false,
      key,
      current,
      limit,
      remaining: remainingCapacity(current, limit),
      reason: `Subscription is ${subscription.status}. Existing data is preserved. Billing and authorized exports remain available.`,
      upgradeHref: UPGRADE_HREF,
      restricted: true,
      subscription,
      plan,
      entitlements,
    };
  }

  if (!featureEnabled) {
    return {
      allowed: false,
      key,
      current,
      limit,
      remaining: remainingCapacity(current, limit),
      reason: `The ${key.replaceAll("_", " ")} feature is not included in ${subscription.plan_name}.`,
      upgradeHref: UPGRADE_HREF,
      restricted,
      subscription,
      plan,
      entitlements,
    };
  }

  if (limit === null || limit === undefined) {
    return {
      allowed: true,
      key,
      current,
      limit: null,
      remaining: null,
      reason: null,
      upgradeHref: UPGRADE_HREF,
      restricted,
      subscription,
      plan,
      entitlements,
    };
  }

  const projected = current + extra;
  if (projected > limit) {
    return {
      allowed: false,
      key,
      current,
      limit,
      remaining: remainingCapacity(current, limit),
      reason: `${current} of ${limit} ${key.replaceAll("_", " ")} are in use. Upgrade the plan to add more. Existing records are not changed.`,
      upgradeHref: UPGRADE_HREF,
      restricted,
      subscription,
      plan,
      entitlements,
    };
  }

  return {
    allowed: true,
    key,
    current,
    limit,
    remaining: remainingCapacity(projected, limit),
    reason: null,
    upgradeHref: UPGRADE_HREF,
    restricted,
    subscription,
    plan,
    entitlements,
  };
}

export function entitlementMessage(decision: EntitlementDecision) {
  if (decision.allowed) return null;
  return decision.reason ?? "This action is not allowed on the current subscription.";
}
