import { EVENT_TO_TRIGGER } from "@/lib/events/catalog";
import {
  getAutomationRule,
  insertAutomationTask,
  insertRuleRun,
  listAutomationRules,
  listAutomationTasks,
  listRuleRuns,
  upsertAutomationRule,
} from "@/lib/events/repository";
import { insertNotification } from "@/lib/ess/repository";
import { listOrgUsersWithRoles } from "@/lib/ess/repository";
import { sendTransactionalEmail } from "@/lib/notifications/email";
import { insertNotificationDelivery } from "@/lib/events/repository";
import { emailForUser } from "@/lib/notifications/recipients";
import type { AutomationActionType, AutomationTriggerType, RoleCode } from "@/lib/constants";
import type { AutomationRule, DomainEvent } from "@/types";

function stamp() {
  return new Date().toISOString();
}

export type RuleCondition = { field: string; op: "eq" | "neq" | "contains"; value: string };
export type RuleAction = {
  type: AutomationActionType;
  roles?: RoleCode[];
  title?: string;
  body?: string;
  href?: string;
};

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw || "null") as T ?? fallback;
  } catch {
    return fallback;
  }
}

function payloadOf(event: DomainEvent) {
  try {
    return JSON.parse(event.payload_json || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readField(payload: Record<string, unknown>, field: string) {
  return String(payload[field] ?? "");
}

function matchesConditions(payload: Record<string, unknown>, conditions: RuleCondition[]) {
  return conditions.every((condition) => {
    const actual = readField(payload, condition.field);
    if (condition.op === "eq") return actual === condition.value;
    if (condition.op === "neq") return actual !== condition.value;
    return actual.toLowerCase().includes(condition.value.toLowerCase());
  });
}

function triggerMatches(rule: AutomationRule, event: DomainEvent) {
  if (rule.trigger_type === event.event_type) return true;
  const mapped = EVENT_TO_TRIGGER[event.event_type as keyof typeof EVENT_TO_TRIGGER];
  return mapped === rule.trigger_type;
}

async function recipientsFor(organizationId: string, roles?: RoleCode[]) {
  const users = await listOrgUsersWithRoles(organizationId);
  if (!roles?.length) return users.filter((row) => ["SUPER_ADMIN", "ADMIN", "HR"].includes(row.roleCode));
  return users.filter((row) => roles.includes(row.roleCode));
}

async function runAction(rule: AutomationRule, event: DomainEvent, action: RuleAction) {
  const payload = payloadOf(event);
  const title = action.title || rule.name;
  const body = action.body || String(payload.body ?? payload.status ?? rule.name);
  const href = action.href || String(payload.href ?? "/dashboard");
  const recipients = await recipientsFor(event.organization_id, action.roles);

  if (action.type === "NOTIFY_IN_APP") {
    for (const recipient of recipients) {
      await insertNotification({
        id: crypto.randomUUID(),
        organization_id: event.organization_id,
        user_id: recipient.profile.id,
        type: "ACTION",
        title,
        body,
        href,
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        event_type: event.event_type,
        delivery_status: "IN_APP",
        read_at: null,
        created_at: stamp(),
      });
    }
    return { action: action.type, recipients: recipients.length };
  }

  if (action.type === "SEND_EMAIL") {
    const results = [];
    for (const recipient of recipients) {
      const to = await emailForUser(event.organization_id, recipient.profile.id);
      if (!to) {
        results.push({ userId: recipient.profile.id, status: "SKIPPED" });
        continue;
      }
      const sent = await sendTransactionalEmail({ to, subject: title, text: body });
      await insertNotificationDelivery({
        id: crypto.randomUUID(),
        organization_id: event.organization_id,
        notification_id: null,
        template_id: null,
        user_id: recipient.profile.id,
        channel: "EMAIL",
        event_type: event.event_type,
        to_address: to,
        subject: title,
        status: sent.status,
        attempt_count: 1,
        last_attempt_at: stamp(),
        next_attempt_at: sent.status === "FAILED" ? new Date(Date.now() + 60_000).toISOString() : null,
        provider: sent.provider,
        error_message: sent.error,
        event_id: event.id,
        created_at: stamp(),
        updated_at: stamp(),
      });
      results.push({ userId: recipient.profile.id, status: sent.status });
    }
    return { action: action.type, results };
  }

  if (action.type === "CREATE_TASK") {
    const assignee = recipients[0]?.profile.id ?? null;
    await insertAutomationTask({
      id: crypto.randomUUID(),
      organization_id: event.organization_id,
      title,
      body,
      href,
      assignee_user_id: assignee,
      event_type: event.event_type,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      status: "OPEN",
      due_at: null,
      created_by: event.actor_id,
      created_at: stamp(),
      updated_at: stamp(),
    });
    return { action: action.type, assignee };
  }

  if (action.type === "INVOKE_WEBHOOK") {
    const { deliverWebhooksForEvent } = await import("@/lib/webhooks/service");
    await deliverWebhooksForEvent(event);
    return { action: action.type };
  }

  return { action: action.type, skipped: true };
}

export async function applyAutomationRules(event: DomainEvent) {
  const rules = (await listAutomationRules(event.organization_id)).filter((item) => item.enabled);
  const applied: string[] = [];
  for (const rule of rules) {
    if (!triggerMatches(rule, event)) continue;
    const conditions = parseJson<RuleCondition[]>(rule.conditions_json, []);
    const payload = payloadOf(event);
    if (!matchesConditions(payload, conditions)) {
      await insertRuleRun({
        id: crypto.randomUUID(),
        organization_id: event.organization_id,
        rule_id: rule.id,
        event_id: event.id,
        status: "SKIPPED",
        result_json: JSON.stringify({ reason: "conditions" }),
        created_at: stamp(),
      });
      continue;
    }
    const recorded = await insertRuleRun({
      id: crypto.randomUUID(),
      organization_id: event.organization_id,
      rule_id: rule.id,
      event_id: event.id,
      status: "APPLIED",
      result_json: null,
      created_at: stamp(),
    });
    if (!recorded) continue;
    const actions = parseJson<RuleAction[]>(rule.actions_json, []);
    const results = [];
    for (const action of actions) {
      results.push(await runAction(rule, event, action));
    }
    applied.push(rule.id);
    if (rule.stop_on_match) break;
  }
  return applied;
}

export async function saveRule(row: AutomationRule) {
  const actions = parseJson<RuleAction[]>(row.actions_json, []);
  if (!actions.length) throw new Error("At least one action is required.");
  if (actions.some((item) => !["NOTIFY_IN_APP", "SEND_EMAIL", "CREATE_TASK", "INVOKE_WEBHOOK"].includes(item.type))) {
    throw new Error("Unknown automation action.");
  }
  return upsertAutomationRule(row);
}

export async function testRule(organizationId: string, ruleId: string, actorId: string | null) {
  const rule = await getAutomationRule(organizationId, ruleId);
  if (!rule) throw new Error("Rule not found.");
  const event: DomainEvent = {
    id: crypto.randomUUID(),
    organization_id: organizationId,
    event_type: rule.trigger_type,
    version: 1,
    entity_type: "automation_rule",
    entity_id: rule.id,
    actor_id: actorId,
    idempotency_key: `test:${rule.id}:${Date.now()}`,
    payload_json: JSON.stringify({ status: "TEST", title: rule.name, body: "Rule test event.", href: "/automation/rules" }),
    status: "PROCESSING",
    attempt_count: 1,
    available_at: stamp(),
    processed_at: null,
    locked_at: stamp(),
    locked_by: "test",
    error_message: null,
    created_at: stamp(),
  };
  const applied = await applyAutomationRules(event);
  return { eventId: event.id, applied };
}

export { listAutomationRules, listAutomationTasks, listRuleRuns, getAutomationRule };

export const ALLOWED_TRIGGERS: AutomationTriggerType[] = [
  "leave.request.updated",
  "payroll.run.status_changed",
  "payslip.generated",
  "claim.status_changed",
  "loan.installment.due",
  "loan.installment.overdue",
  "employee.created",
  "employee.exit.updated",
  "contractor.engagement.expiring",
  "biometric.device.error",
  "payment.failed",
  "approval.overdue",
];
