import { defaultNotificationPlan } from "@/lib/events/catalog";
import {
  insertNotificationDelivery,
  listNotificationDeliveries,
  listNotificationPreferences,
  listNotificationTemplates,
  listRetryableDeliveries,
  updateNotificationDelivery,
  upsertNotificationPreference,
  upsertNotificationTemplate,
} from "@/lib/events/repository";
import { getEmailProviderStatus, sendTransactionalEmail } from "@/lib/notifications/email";
import { renderTemplate, templateContext, validateTemplateVariables } from "@/lib/notifications/templates";
import { DEFAULT_TEMPLATES } from "@/lib/events/catalog";
import { insertNotification, listNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/ess/repository";
import { listOrgUsersWithRoles } from "@/lib/ess/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { emailForUser } from "@/lib/notifications/recipients";
import type { DomainEvent, EssNotification, NotificationDelivery, NotificationPreference, NotificationTemplate } from "@/types";
import type { RoleCode } from "@/lib/constants";

function stamp() {
  return new Date().toISOString();
}

function parsePayload(event: DomainEvent): Record<string, unknown> {
  try {
    return JSON.parse(event.payload_json || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function resolveRecipients(
  organizationId: string,
  plan: { recipientRoles?: RoleCode[]; toEmployee?: boolean },
  payload: Record<string, unknown>
) {
  const users = await listOrgUsersWithRoles(organizationId);
  const ids = new Set<string>();
  if (plan.recipientRoles?.length) {
    for (const row of users) {
      if (plan.recipientRoles.includes(row.roleCode)) ids.add(row.profile.id);
    }
  }
  if (plan.toEmployee) {
    const employeeId = String(payload.employeeId ?? "");
    if (employeeId) {
      const catalog = await loadOrgCatalog(organizationId);
      const userId = catalog.employees.find((item) => item.id === employeeId)?.user_id;
      if (userId) ids.add(userId);
    }
    const directUserId = String(payload.userId ?? "");
    if (directUserId) ids.add(directUserId);
  }
  return users.filter((row) => ids.has(row.profile.id));
}

function preferenceFor(prefs: NotificationPreference[], userId: string, eventType: string) {
  return prefs.find((item) => item.user_id === userId && item.event_type === eventType);
}

export async function applyDefaultNotifications(event: DomainEvent) {
  const payload = parsePayload(event);
  const plan = defaultNotificationPlan(event.event_type, payload);
  if (!plan) return [];
  const prefs = await listNotificationPreferences(event.organization_id);
  const recipients = await resolveRecipients(event.organization_id, plan, payload);
  const created: EssNotification[] = [];
  for (const recipient of recipients) {
    const pref = preferenceFor(prefs, recipient.profile.id, event.event_type);
    const inApp = pref ? pref.in_app : true;
    if (inApp) {
      const notification = await insertNotification({
        id: crypto.randomUUID(),
        organization_id: event.organization_id,
        user_id: recipient.profile.id,
        type: plan.type,
        title: plan.title,
        body: plan.body,
        href: plan.href,
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        event_type: event.event_type,
        delivery_status: "IN_APP",
        read_at: null,
        created_at: stamp(),
      });
      created.push(notification);
      await insertNotificationDelivery({
        id: crypto.randomUUID(),
        organization_id: event.organization_id,
        notification_id: notification.id,
        template_id: null,
        user_id: recipient.profile.id,
        channel: "IN_APP",
        event_type: event.event_type,
        to_address: null,
        subject: plan.title,
        status: "SENT",
        attempt_count: 1,
        last_attempt_at: stamp(),
        next_attempt_at: null,
        provider: "in-app",
        error_message: null,
        event_id: event.id,
        created_at: stamp(),
        updated_at: stamp(),
      });
    }
    const emailOn = pref ? pref.email : false;
    if (emailOn) {
      await queueEmailDelivery({
        organizationId: event.organization_id,
        userId: recipient.profile.id,
        to: await emailForUser(event.organization_id, recipient.profile.id),
        event,
        payload,
        title: plan.title,
        body: plan.body,
      });
    }
  }
  return created;
}

async function queueEmailDelivery(input: {
  organizationId: string;
  userId: string;
  to: string | null;
  event: DomainEvent;
  payload: Record<string, unknown>;
  title: string;
  body: string;
}) {
  const templates = await listNotificationTemplates(input.organizationId);
  const template =
    templates.find((item) => item.event_type === input.event.event_type && item.status === "ACTIVE" && item.channel === "EMAIL") ??
    null;
  const ctx = templateContext(input.payload, { title: input.title, body: input.body });
  const subject = template ? renderTemplate(template.subject, ctx) : input.title;
  const text = template ? renderTemplate(template.body_text, ctx) : input.body;
  const html = template?.body_html ? renderTemplate(template.body_html, ctx) : null;
  const delivery = await insertNotificationDelivery({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    notification_id: null,
    template_id: template?.id ?? null,
    user_id: input.userId,
    channel: "EMAIL",
    event_type: input.event.event_type,
    to_address: input.to,
    subject,
    status: "QUEUED",
    attempt_count: 0,
    last_attempt_at: null,
    next_attempt_at: stamp(),
    provider: null,
    error_message: null,
    event_id: input.event.id,
    created_at: stamp(),
    updated_at: stamp(),
  });
  await attemptEmailDelivery(delivery, { subject, text, html });
}

export async function attemptEmailDelivery(
  delivery: NotificationDelivery,
  content?: { subject: string; text: string; html?: string | null }
) {
  if (!delivery.to_address) {
    await updateNotificationDelivery(delivery.id, {
      status: "SKIPPED",
      error_message: "No email address on the user profile.",
      attempt_count: delivery.attempt_count + 1,
      last_attempt_at: stamp(),
    });
    return;
  }
  const result = await sendTransactionalEmail({
    to: delivery.to_address,
    subject: content?.subject ?? delivery.subject ?? "",
    text: content?.text ?? delivery.subject ?? "",
    html: content?.html,
  });
  const nextAttempt =
    result.status === "FAILED"
      ? new Date(Date.now() + Math.min(30 * 60_000, 2 ** (delivery.attempt_count + 1) * 30_000)).toISOString()
      : null;
  await updateNotificationDelivery(delivery.id, {
    status: result.status,
    provider: result.provider,
    error_message: result.error,
    attempt_count: delivery.attempt_count + 1,
    last_attempt_at: stamp(),
    next_attempt_at: nextAttempt,
  });
}

export async function retryFailedEmails() {
  const rows = await listRetryableDeliveries();
  for (const row of rows) {
    await attemptEmailDelivery(row);
  }
  return rows.length;
}

export async function loadInbox(organizationId: string, userId: string, filters?: { unread?: boolean; type?: string; q?: string; page?: number }) {
  const all = await listNotifications(organizationId, userId);
  let rows = all;
  if (filters?.unread) rows = rows.filter((item) => !item.read_at);
  if (filters?.type) rows = rows.filter((item) => item.type === filters.type);
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    rows = rows.filter((item) => item.title.toLowerCase().includes(q) || (item.body ?? "").toLowerCase().includes(q));
  }
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = 20;
  const start = (page - 1) * pageSize;
  return {
    items: rows.slice(start, start + pageSize),
    total: rows.length,
    unread: all.filter((item) => !item.read_at).length,
    page,
    pageSize,
  };
}

export async function markRead(id: string, userId: string) {
  return markNotificationRead(id, userId);
}

export async function markAllRead(organizationId: string, userId: string) {
  return markAllNotificationsRead(organizationId, userId);
}

export async function savePreference(row: NotificationPreference) {
  return upsertNotificationPreference(row);
}

export async function loadPreferences(organizationId: string, userId: string) {
  return listNotificationPreferences(organizationId, userId);
}

export async function loadTemplates(organizationId: string) {
  return listNotificationTemplates(organizationId);
}

export async function saveTemplate(row: NotificationTemplate) {
  const unknown = [
    ...validateTemplateVariables(row.subject),
    ...validateTemplateVariables(row.body_text),
    ...validateTemplateVariables(row.body_html ?? ""),
  ];
  if (unknown.length) throw new Error(`Unknown template variables: ${[...new Set(unknown)].join(", ")}`);
  return upsertNotificationTemplate(row);
}

export async function previewTemplate(row: Pick<NotificationTemplate, "subject" | "body_text" | "body_html">, vars: Record<string, string>) {
  return {
    subject: renderTemplate(row.subject, vars),
    body_text: renderTemplate(row.body_text, vars),
    body_html: row.body_html ? renderTemplate(row.body_html, vars) : null,
  };
}

export async function ensureDefaultTemplates(organizationId: string, actorId: string | null) {
  const existing = await listNotificationTemplates(organizationId);
  const created: NotificationTemplate[] = [];
  for (const def of DEFAULT_TEMPLATES) {
    if (existing.some((item) => item.key === def.key)) continue;
    const row = await upsertNotificationTemplate({
      id: crypto.randomUUID(),
      organization_id: organizationId,
      key: def.key,
      name: def.name,
      event_type: def.eventType,
      channel: "EMAIL",
      language: "en",
      subject: def.subject,
      body_text: def.body,
      body_html: `<p>${def.body}</p>`,
      variables_json: JSON.stringify(["employee_name", "status", "period", "organization_name", "title", "body"]),
      status: "ACTIVE",
      created_by: actorId,
      updated_by: actorId,
      created_at: stamp(),
      updated_at: stamp(),
    });
    created.push(row);
  }
  return created;
}

export async function loadDeliveries(organizationId: string) {
  return listNotificationDeliveries(organizationId);
}

export { getEmailProviderStatus };
