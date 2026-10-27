import { USAGE_METRIC_KEYS, USAGE_METRIC_LABELS, type UsageMetricKey } from "@/lib/constants";
import { entitlementsFromSnapshot, remainingCapacity } from "@/lib/billing/engine";
import {
  countActiveBranches,
  countActiveEmployees,
  countApiRequests30d,
  countRegisteredDevices,
  getPlan,
  insertUsageSnapshot,
} from "@/lib/billing/repository";
import type { OrganizationSubscription, SubscriptionUsage } from "@/types";

export type UsageRow = {
  metric_key: UsageMetricKey;
  quantity: number;
  limit_value: number | null;
  remaining: number | null;
  measured_at: string;
};

export async function measureUsage(organizationId: string, subscription: OrganizationSubscription | null): Promise<UsageRow[]> {
  const plan = subscription ? await getPlan(subscription.plan_id) : null;
  const entitlements = entitlementsFromSnapshot(subscription, plan);
  const measuredAt = new Date().toISOString();
  const employees = await countActiveEmployees(organizationId);
  const branches = await countActiveBranches(organizationId);
  const devices = await countRegisteredDevices(organizationId);
  const apiRequests = await countApiRequests30d(organizationId);
  const rows: UsageRow[] = [
    {
      metric_key: "active_employees",
      quantity: employees,
      limit_value: entitlements?.employeeLimit ?? null,
      remaining: remainingCapacity(employees, entitlements?.employeeLimit ?? null),
      measured_at: measuredAt,
    },
    {
      metric_key: "active_branches",
      quantity: branches,
      limit_value: entitlements?.branchLimit ?? null,
      remaining: remainingCapacity(branches, entitlements?.branchLimit ?? null),
      measured_at: measuredAt,
    },
    {
      metric_key: "registered_biometric_devices",
      quantity: devices,
      limit_value: entitlements?.biometricDeviceLimit ?? null,
      remaining: remainingCapacity(devices, entitlements?.biometricDeviceLimit ?? null),
      measured_at: measuredAt,
    },
    {
      metric_key: "api_requests_30d",
      quantity: apiRequests,
      limit_value: null,
      remaining: null,
      measured_at: measuredAt,
    },
  ];
  return rows;
}

export async function persistUsage(organizationId: string, subscription: OrganizationSubscription | null) {
  const rows = await measureUsage(organizationId, subscription);
  const stored: SubscriptionUsage[] = [];
  for (const row of rows) {
    stored.push(
      await insertUsageSnapshot({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        subscription_id: subscription?.id ?? null,
        metric_key: row.metric_key,
        quantity: row.quantity,
        limit_value: row.limit_value,
        remaining: row.remaining,
        measured_at: row.measured_at,
        source: "LIVE",
      })
    );
  }
  return { live: rows, stored };
}

export function usageLabel(key: string) {
  if ((USAGE_METRIC_KEYS as readonly string[]).includes(key)) {
    return USAGE_METRIC_LABELS[key as UsageMetricKey];
  }
  return key.replaceAll("_", " ");
}
