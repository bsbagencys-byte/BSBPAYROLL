import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AnalyticsAlert,
  AnalyticsAlertHistory,
  AnalyticsRefreshJob,
  AnalyticsThreshold,
  AiUsageLog,
  BiometricCompatibilityEntry,
} from "@/types";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

function stamp() {
  return new Date().toISOString();
}

export async function listAnalyticsThresholds(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore().analyticsThresholds.filter((row) => row.organization_id === organizationId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("analytics_thresholds").select("*").eq("organization_id", organizationId);
  return (data ?? []) as AnalyticsThreshold[];
}

export async function upsertAnalyticsThreshold(row: AnalyticsThreshold) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const index = store.analyticsThresholds.findIndex(
      (item) => item.organization_id === row.organization_id && item.rule_code === row.rule_code
    );
    if (index >= 0) store.analyticsThresholds[index] = row;
    else store.analyticsThresholds.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin
    .from("analytics_thresholds")
    .upsert(row, { onConflict: "organization_id,rule_code" })
    .select("*")
    .single();
  if (error) throw error;
  return data as AnalyticsThreshold;
}

export async function listAnalyticsAlerts(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore()
      .analyticsAlerts.filter((row) => row.organization_id === organizationId)
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("analytics_alerts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as AnalyticsAlert[];
}

export async function getAnalyticsAlert(organizationId: string, id: string) {
  const rows = await listAnalyticsAlerts(organizationId);
  return rows.find((row) => row.id === id) ?? null;
}

export async function insertAnalyticsAlert(row: AnalyticsAlert) {
  if (demoEnabled()) {
    const store = getDemoStore();
    if (row.idempotency_key) {
      const existing = store.analyticsAlerts.find(
        (item) => item.organization_id === row.organization_id && item.idempotency_key === row.idempotency_key
      );
      if (existing) return existing;
    }
    store.analyticsAlerts.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  if (row.idempotency_key) {
    const { data: existing } = await admin
      .from("analytics_alerts")
      .select("*")
      .eq("organization_id", row.organization_id)
      .eq("idempotency_key", row.idempotency_key)
      .maybeSingle();
    if (existing) return existing as AnalyticsAlert;
  }
  const { data, error } = await admin.from("analytics_alerts").insert(row).select("*").single();
  if (error) throw error;
  return data as AnalyticsAlert;
}

export async function updateAnalyticsAlert(row: AnalyticsAlert) {
  const next = { ...row, updated_at: stamp() };
  if (demoEnabled()) {
    const store = getDemoStore();
    const index = store.analyticsAlerts.findIndex((item) => item.id === row.id);
    if (index >= 0) store.analyticsAlerts[index] = next;
    return next;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("analytics_alerts").update(next).eq("id", row.id).select("*").single();
  if (error) throw error;
  return data as AnalyticsAlert;
}

export async function insertAlertHistory(row: AnalyticsAlertHistory) {
  if (demoEnabled()) {
    getDemoStore().analyticsAlertHistory.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("analytics_alert_history").insert(row).select("*").single();
  if (error) throw error;
  return data as AnalyticsAlertHistory;
}

export async function listAlertHistory(organizationId: string, alertId: string) {
  if (demoEnabled()) {
    return getDemoStore()
      .analyticsAlertHistory.filter((row) => row.organization_id === organizationId && row.alert_id === alertId)
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("analytics_alert_history")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("alert_id", alertId)
    .order("created_at", { ascending: false });
  return (data ?? []) as AnalyticsAlertHistory[];
}

export async function insertRefreshJob(row: AnalyticsRefreshJob) {
  if (demoEnabled()) {
    getDemoStore().analyticsRefreshJobs.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("analytics_refresh_jobs").insert(row).select("*").single();
  if (error) throw error;
  return data as AnalyticsRefreshJob;
}

export async function listRefreshJobs(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore()
      .analyticsRefreshJobs.filter((row) => row.organization_id === organizationId)
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("analytics_refresh_jobs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as AnalyticsRefreshJob[];
}

export async function listCompatibilityRegistry(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore().biometricCompatibilityRegistry.filter(
      (row) => row.organization_id === null || row.organization_id === organizationId
    );
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("biometric_compatibility_registry")
    .select("*")
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`);
  return (data ?? []) as BiometricCompatibilityEntry[];
}

export async function insertAiUsageLog(row: AiUsageLog) {
  if (demoEnabled()) {
    getDemoStore().aiUsageLogs.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return row;
  const { data, error } = await admin.from("ai_usage_logs").insert(row).select("*").single();
  if (error) return row;
  return data as AiUsageLog;
}

export async function listAiUsageLogs(organizationId: string, userId?: string) {
  if (demoEnabled()) {
    return getDemoStore()
      .aiUsageLogs.filter((row) => row.organization_id === organizationId && (!userId || row.user_id === userId))
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("ai_usage_logs").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(20);
  if (userId) query = query.eq("user_id", userId);
  const { data } = await query;
  return (data ?? []) as AiUsageLog[];
}
