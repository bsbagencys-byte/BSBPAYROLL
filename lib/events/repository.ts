import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ApiKey,
  ApiRequestLog,
  AutomationRule,
  AutomationRuleRun,
  AutomationTask,
  DomainEvent,
  JobExecution,
  NotificationDelivery,
  NotificationPreference,
  NotificationTemplate,
  ScheduledJob,
  WebhookDeliveryAttempt,
  WebhookEndpoint,
} from "@/types";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

function stamp() {
  return new Date().toISOString();
}

export { demoEnabled };

export async function insertDomainEvent(row: DomainEvent): Promise<DomainEvent> {
  if (demoEnabled()) {
    const store = getDemoStore();
    if (row.idempotency_key) {
      const existing = store.domainEvents.find(
        (item) => item.organization_id === row.organization_id && item.idempotency_key === row.idempotency_key
      );
      if (existing) return existing;
    }
    store.domainEvents.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("domain_events").insert(row).select("*").single();
  if (error) {
    if (row.idempotency_key && /duplicate|unique/i.test(error.message)) {
      const { data: existing } = await admin
        .from("domain_events")
        .select("*")
        .eq("organization_id", row.organization_id)
        .eq("idempotency_key", row.idempotency_key)
        .maybeSingle();
      if (existing) return existing as DomainEvent;
    }
    throw error;
  }
  return data as DomainEvent;
}

export async function listDomainEvents(organizationId: string, limit = 50): Promise<DomainEvent[]> {
  if (demoEnabled()) {
    return getDemoStore()
      .domainEvents.filter((item) => item.organization_id === organizationId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("domain_events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as DomainEvent[];
}

export async function getDomainEvent(organizationId: string, id: string): Promise<DomainEvent | null> {
  if (demoEnabled()) {
    return getDemoStore().domainEvents.find((item) => item.organization_id === organizationId && item.id === id) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("domain_events").select("*").eq("organization_id", organizationId).eq("id", id).maybeSingle();
  return (data as DomainEvent | null) ?? null;
}

export async function claimPendingEvents(limit = 20, workerId = "worker"): Promise<DomainEvent[]> {
  const now = stamp();
  if (demoEnabled()) {
    const claimed: DomainEvent[] = [];
    for (const row of getDemoStore().domainEvents) {
      if (claimed.length >= limit) break;
      if (row.status !== "PENDING" && row.status !== "FAILED") continue;
      if (row.available_at > now) continue;
      row.status = "PROCESSING";
      row.locked_at = now;
      row.locked_by = workerId;
      row.attempt_count += 1;
      claimed.push(row);
    }
    return claimed;
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("domain_events")
    .select("*")
    .in("status", ["PENDING", "FAILED"])
    .lte("available_at", now)
    .order("created_at", { ascending: true })
    .limit(limit);
  const rows = (data ?? []) as DomainEvent[];
  const claimed: DomainEvent[] = [];
  for (const row of rows) {
    const { data: updated } = await admin
      .from("domain_events")
      .update({
        status: "PROCESSING",
        locked_at: now,
        locked_by: workerId,
        attempt_count: row.attempt_count + 1,
      })
      .eq("id", row.id)
      .in("status", ["PENDING", "FAILED"])
      .select("*")
      .maybeSingle();
    if (updated) claimed.push(updated as DomainEvent);
  }
  return claimed;
}

export async function updateDomainEvent(id: string, patch: Partial<DomainEvent>): Promise<void> {
  if (demoEnabled()) {
    const row = getDemoStore().domainEvents.find((item) => item.id === id);
    if (row) Object.assign(row, patch);
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("domain_events").update(patch).eq("id", id);
}

export async function listNotificationPreferences(organizationId: string, userId?: string): Promise<NotificationPreference[]> {
  if (demoEnabled()) {
    return getDemoStore().notificationPreferences.filter(
      (item) => item.organization_id === organizationId && (!userId || item.user_id === userId)
    );
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("notification_preferences").select("*").eq("organization_id", organizationId);
  if (userId) query = query.eq("user_id", userId);
  const { data } = await query;
  return (data ?? []) as NotificationPreference[];
}

export async function upsertNotificationPreference(row: NotificationPreference): Promise<NotificationPreference> {
  if (demoEnabled()) {
    const store = getDemoStore();
    const existing = store.notificationPreferences.find(
      (item) => item.organization_id === row.organization_id && item.user_id === row.user_id && item.event_type === row.event_type
    );
    if (existing) {
      Object.assign(existing, row, { updated_at: stamp() });
      return existing;
    }
    store.notificationPreferences.push(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin
    .from("notification_preferences")
    .upsert(row, { onConflict: "organization_id,user_id,event_type" })
    .select("*")
    .single();
  if (error) throw error;
  return data as NotificationPreference;
}

export async function listNotificationTemplates(organizationId: string): Promise<NotificationTemplate[]> {
  if (demoEnabled()) {
    return getDemoStore().notificationTemplates.filter((item) => item.organization_id === organizationId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("notification_templates").select("*").eq("organization_id", organizationId).order("name");
  return (data ?? []) as NotificationTemplate[];
}

export async function getNotificationTemplate(organizationId: string, id: string): Promise<NotificationTemplate | null> {
  if (demoEnabled()) {
    return getDemoStore().notificationTemplates.find((item) => item.organization_id === organizationId && item.id === id) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("notification_templates").select("*").eq("organization_id", organizationId).eq("id", id).maybeSingle();
  return (data as NotificationTemplate | null) ?? null;
}

export async function upsertNotificationTemplate(row: NotificationTemplate): Promise<NotificationTemplate> {
  if (demoEnabled()) {
    const store = getDemoStore();
    const existing = store.notificationTemplates.find((item) => item.id === row.id);
    if (existing) {
      Object.assign(existing, row, { updated_at: stamp() });
      return existing;
    }
    store.notificationTemplates.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("notification_templates").upsert(row).select("*").single();
  if (error) throw error;
  return data as NotificationTemplate;
}

export async function insertNotificationDelivery(row: NotificationDelivery): Promise<NotificationDelivery> {
  if (demoEnabled()) {
    getDemoStore().notificationDeliveries.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("notification_deliveries").insert(row).select("*").single();
  if (error) throw error;
  return data as NotificationDelivery;
}

export async function updateNotificationDelivery(id: string, patch: Partial<NotificationDelivery>): Promise<void> {
  if (demoEnabled()) {
    const row = getDemoStore().notificationDeliveries.find((item) => item.id === id);
    if (row) Object.assign(row, patch, { updated_at: stamp() });
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("notification_deliveries").update({ ...patch, updated_at: stamp() }).eq("id", id);
}

export async function listNotificationDeliveries(organizationId: string, limit = 50): Promise<NotificationDelivery[]> {
  if (demoEnabled()) {
    return getDemoStore()
      .notificationDeliveries.filter((item) => item.organization_id === organizationId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("notification_deliveries")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as NotificationDelivery[];
}

export async function listAutomationRules(organizationId: string): Promise<AutomationRule[]> {
  if (demoEnabled()) {
    return getDemoStore().automationRules.filter((item) => item.organization_id === organizationId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("automation_rules").select("*").eq("organization_id", organizationId).order("name");
  return (data ?? []) as AutomationRule[];
}

export async function getAutomationRule(organizationId: string, id: string): Promise<AutomationRule | null> {
  if (demoEnabled()) {
    return getDemoStore().automationRules.find((item) => item.organization_id === organizationId && item.id === id) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("automation_rules").select("*").eq("organization_id", organizationId).eq("id", id).maybeSingle();
  return (data as AutomationRule | null) ?? null;
}

export async function upsertAutomationRule(row: AutomationRule): Promise<AutomationRule> {
  if (demoEnabled()) {
    const store = getDemoStore();
    const existing = store.automationRules.find((item) => item.id === row.id);
    if (existing) {
      Object.assign(existing, row, { updated_at: stamp() });
      return existing;
    }
    store.automationRules.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("automation_rules").upsert(row).select("*").single();
  if (error) throw error;
  return data as AutomationRule;
}

export async function insertRuleRun(row: AutomationRuleRun): Promise<AutomationRuleRun | null> {
  if (demoEnabled()) {
    const store = getDemoStore();
    const existing = store.automationRuleRuns.find((item) => item.rule_id === row.rule_id && item.event_id === row.event_id);
    if (existing) return null;
    store.automationRuleRuns.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return row;
  const { data, error } = await admin.from("automation_rule_runs").insert(row).select("*").maybeSingle();
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return null;
    throw error;
  }
  return (data as AutomationRuleRun) ?? row;
}

export async function listRuleRuns(organizationId: string, limit = 50): Promise<AutomationRuleRun[]> {
  if (demoEnabled()) {
    return getDemoStore()
      .automationRuleRuns.filter((item) => item.organization_id === organizationId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("automation_rule_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AutomationRuleRun[];
}

export async function insertAutomationTask(row: AutomationTask): Promise<AutomationTask> {
  if (demoEnabled()) {
    getDemoStore().automationTasks.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("automation_tasks").insert(row).select("*").single();
  if (error) throw error;
  return data as AutomationTask;
}

export async function listAutomationTasks(organizationId: string): Promise<AutomationTask[]> {
  if (demoEnabled()) {
    return getDemoStore()
      .automationTasks.filter((item) => item.organization_id === organizationId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("automation_tasks").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
  return (data ?? []) as AutomationTask[];
}

export async function listScheduledJobs(organizationId?: string): Promise<ScheduledJob[]> {
  if (demoEnabled()) {
    return getDemoStore().scheduledJobs.filter((item) => !organizationId || item.organization_id === organizationId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("scheduled_jobs").select("*");
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data } = await query.order("name");
  return (data ?? []) as ScheduledJob[];
}

export async function getScheduledJob(organizationId: string, id: string): Promise<ScheduledJob | null> {
  if (demoEnabled()) {
    return getDemoStore().scheduledJobs.find((item) => item.organization_id === organizationId && item.id === id) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("scheduled_jobs").select("*").eq("organization_id", organizationId).eq("id", id).maybeSingle();
  return (data as ScheduledJob | null) ?? null;
}

export async function upsertScheduledJob(row: ScheduledJob): Promise<ScheduledJob> {
  if (demoEnabled()) {
    const store = getDemoStore();
    const existing = store.scheduledJobs.find((item) => item.id === row.id);
    if (existing) {
      Object.assign(existing, row, { updated_at: stamp() });
      return existing;
    }
    store.scheduledJobs.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("scheduled_jobs").upsert(row).select("*").single();
  if (error) throw error;
  return data as ScheduledJob;
}

export async function insertJobExecution(row: JobExecution): Promise<JobExecution | null> {
  if (demoEnabled()) {
    const store = getDemoStore();
    const existing = store.jobExecutions.find((item) => item.job_id === row.job_id && item.scheduled_for === row.scheduled_for);
    if (existing) return null;
    store.jobExecutions.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return row;
  const { data, error } = await admin.from("job_executions").insert(row).select("*").maybeSingle();
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return null;
    throw error;
  }
  return (data as JobExecution) ?? row;
}

export async function updateJobExecution(id: string, patch: Partial<JobExecution>): Promise<void> {
  if (demoEnabled()) {
    const row = getDemoStore().jobExecutions.find((item) => item.id === id);
    if (row) Object.assign(row, patch);
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("job_executions").update(patch).eq("id", id);
}

export async function listJobExecutions(organizationId: string, limit = 50): Promise<JobExecution[]> {
  if (demoEnabled()) {
    return getDemoStore()
      .jobExecutions.filter((item) => item.organization_id === organizationId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("job_executions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as JobExecution[];
}

export async function getJobExecution(organizationId: string, id: string): Promise<JobExecution | null> {
  if (demoEnabled()) {
    return getDemoStore().jobExecutions.find((item) => item.organization_id === organizationId && item.id === id) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("job_executions").select("*").eq("organization_id", organizationId).eq("id", id).maybeSingle();
  return (data as JobExecution | null) ?? null;
}

export async function listWebhookEndpoints(organizationId: string): Promise<WebhookEndpoint[]> {
  if (demoEnabled()) {
    return getDemoStore().webhookEndpoints.filter((item) => item.organization_id === organizationId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("webhook_endpoints").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
  return (data ?? []) as WebhookEndpoint[];
}

export async function getWebhookEndpoint(organizationId: string, id: string): Promise<WebhookEndpoint | null> {
  if (demoEnabled()) {
    return getDemoStore().webhookEndpoints.find((item) => item.organization_id === organizationId && item.id === id) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("webhook_endpoints").select("*").eq("organization_id", organizationId).eq("id", id).maybeSingle();
  return (data as WebhookEndpoint | null) ?? null;
}

export async function upsertWebhookEndpoint(row: WebhookEndpoint): Promise<WebhookEndpoint> {
  if (demoEnabled()) {
    const store = getDemoStore();
    const existing = store.webhookEndpoints.find((item) => item.id === row.id);
    if (existing) {
      Object.assign(existing, row, { updated_at: stamp() });
      return existing;
    }
    store.webhookEndpoints.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("webhook_endpoints").upsert(row).select("*").single();
  if (error) throw error;
  return data as WebhookEndpoint;
}

export async function insertWebhookAttempt(row: WebhookDeliveryAttempt): Promise<WebhookDeliveryAttempt | null> {
  if (demoEnabled()) {
    const store = getDemoStore();
    const existing = store.webhookDeliveryAttempts.find((item) => item.endpoint_id === row.endpoint_id && item.event_id === row.event_id);
    if (existing) return existing;
    store.webhookDeliveryAttempts.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return row;
  const { data, error } = await admin.from("webhook_delivery_attempts").insert(row).select("*").maybeSingle();
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      const { data: existing } = await admin
        .from("webhook_delivery_attempts")
        .select("*")
        .eq("endpoint_id", row.endpoint_id)
        .eq("event_id", row.event_id)
        .maybeSingle();
      return (existing as WebhookDeliveryAttempt | null) ?? null;
    }
    throw error;
  }
  return (data as WebhookDeliveryAttempt) ?? row;
}

export async function updateWebhookAttempt(id: string, patch: Partial<WebhookDeliveryAttempt>): Promise<void> {
  if (demoEnabled()) {
    const row = getDemoStore().webhookDeliveryAttempts.find((item) => item.id === id);
    if (row) Object.assign(row, patch, { updated_at: stamp() });
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("webhook_delivery_attempts").update({ ...patch, updated_at: stamp() }).eq("id", id);
}

export async function listWebhookAttempts(organizationId: string, limit = 50): Promise<WebhookDeliveryAttempt[]> {
  if (demoEnabled()) {
    return getDemoStore()
      .webhookDeliveryAttempts.filter((item) => item.organization_id === organizationId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("webhook_delivery_attempts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as WebhookDeliveryAttempt[];
}

export async function getWebhookAttempt(organizationId: string, id: string): Promise<WebhookDeliveryAttempt | null> {
  if (demoEnabled()) {
    return getDemoStore().webhookDeliveryAttempts.find((item) => item.organization_id === organizationId && item.id === id) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("webhook_delivery_attempts").select("*").eq("organization_id", organizationId).eq("id", id).maybeSingle();
  return (data as WebhookDeliveryAttempt | null) ?? null;
}

export async function listApiKeys(organizationId: string): Promise<ApiKey[]> {
  if (demoEnabled()) {
    return getDemoStore().apiKeys.filter((item) => item.organization_id === organizationId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("api_keys").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
  return (data ?? []) as ApiKey[];
}

export async function getApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
  if (demoEnabled()) {
    return getDemoStore().apiKeys.find((item) => item.key_hash === keyHash) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("api_keys").select("*").eq("key_hash", keyHash).maybeSingle();
  return (data as ApiKey | null) ?? null;
}

export async function upsertApiKey(row: ApiKey): Promise<ApiKey> {
  if (demoEnabled()) {
    const store = getDemoStore();
    const existing = store.apiKeys.find((item) => item.id === row.id);
    if (existing) {
      Object.assign(existing, row, { updated_at: stamp() });
      return existing;
    }
    store.apiKeys.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("api_keys").upsert(row).select("*").single();
  if (error) throw error;
  return data as ApiKey;
}

export async function insertApiRequestLog(row: ApiRequestLog): Promise<void> {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.apiRequestLogs.unshift(row);
    if (store.apiRequestLogs.length > 200) store.apiRequestLogs.length = 200;
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("api_request_logs").insert(row);
}

export async function listApiRequestLogs(organizationId: string, limit = 50): Promise<ApiRequestLog[]> {
  if (demoEnabled()) {
    return getDemoStore()
      .apiRequestLogs.filter((item) => item.organization_id === organizationId)
      .slice(0, limit);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("api_request_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ApiRequestLog[];
}

export async function listRetryableDeliveries(): Promise<NotificationDelivery[]> {
  const now = stamp();
  if (demoEnabled()) {
    return getDemoStore().notificationDeliveries.filter(
      (item) => item.status === "FAILED" && item.next_attempt_at && item.next_attempt_at <= now && item.attempt_count < 5
    );
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("notification_deliveries")
    .select("*")
    .eq("status", "FAILED")
    .lte("next_attempt_at", now)
    .lt("attempt_count", 5)
    .limit(20);
  return (data ?? []) as NotificationDelivery[];
}

export async function listRetryableWebhookAttempts(): Promise<WebhookDeliveryAttempt[]> {
  const now = stamp();
  if (demoEnabled()) {
    return getDemoStore().webhookDeliveryAttempts.filter(
      (item) => item.status === "FAILED" && item.next_attempt_at && item.next_attempt_at <= now && item.attempt_count < 5
    );
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("webhook_delivery_attempts")
    .select("*")
    .eq("status", "FAILED")
    .lte("next_attempt_at", now)
    .lt("attempt_count", 5)
    .limit(20);
  return (data ?? []) as WebhookDeliveryAttempt[];
}

export async function listDueScheduledJobs(): Promise<ScheduledJob[]> {
  const now = stamp();
  if (demoEnabled()) {
    return getDemoStore().scheduledJobs.filter((item) => item.enabled && item.next_run_at && item.next_run_at <= now);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("scheduled_jobs").select("*").eq("enabled", true).lte("next_run_at", now);
  return (data ?? []) as ScheduledJob[];
}
