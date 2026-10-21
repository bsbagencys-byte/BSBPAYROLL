import { EVENT_VERSION, sanitizePayload, type EventPayload } from "@/lib/events/catalog";
import { claimPendingEvents, insertDomainEvent, updateDomainEvent } from "@/lib/events/repository";
import { applyDefaultNotifications } from "@/lib/notifications/service";
import { applyAutomationRules } from "@/lib/automation/rules";
import { deliverWebhooksForEvent } from "@/lib/webhooks/service";
import type { AutomationEventType } from "@/lib/constants";
import type { DomainEvent } from "@/types";

function stamp() {
  return new Date().toISOString();
}

export async function emitDomainEvent(input: {
  organizationId: string;
  eventType: AutomationEventType | string;
  entityType?: string | null;
  entityId?: string | null;
  actorId?: string | null;
  payload?: EventPayload;
  idempotencyKey?: string | null;
}): Promise<DomainEvent> {
  const event: DomainEvent = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    event_type: input.eventType,
    version: EVENT_VERSION,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    actor_id: input.actorId ?? null,
    idempotency_key: input.idempotencyKey ?? null,
    payload_json: JSON.stringify(sanitizePayload(input.payload ?? {})),
    status: "PENDING",
    attempt_count: 0,
    available_at: stamp(),
    processed_at: null,
    locked_at: null,
    locked_by: null,
    error_message: null,
    created_at: stamp(),
  };
  const saved = await insertDomainEvent(event);
  void processOutbox({ limit: 25 }).catch(() => undefined);
  return saved;
}

export async function processEvent(event: DomainEvent) {
  await applyDefaultNotifications(event);
  await applyAutomationRules(event);
  await deliverWebhooksForEvent(event);
  await updateDomainEvent(event.id, {
    status: "PROCESSED",
    processed_at: stamp(),
    locked_at: null,
    locked_by: null,
    error_message: null,
  });
}

export async function processOutbox(options?: { limit?: number; workerId?: string }) {
  const claimed = await claimPendingEvents(options?.limit ?? 20, options?.workerId ?? "outbox");
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const event of claimed) {
    try {
      await processEvent(event);
      results.push({ id: event.id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 300) : "Event processing failed.";
      const dead = event.attempt_count >= 5;
      const next = new Date(Date.now() + Math.min(30 * 60_000, 2 ** event.attempt_count * 30_000)).toISOString();
      await updateDomainEvent(event.id, {
        status: dead ? "DEAD" : "FAILED",
        error_message: message,
        available_at: next,
        locked_at: null,
        locked_by: null,
      });
      results.push({ id: event.id, ok: false, error: message });
    }
  }
  return { claimed: claimed.length, results };
}

export async function replayEvent(organizationId: string, eventId: string) {
  const { getDomainEvent } = await import("@/lib/events/repository");
  const event = await getDomainEvent(organizationId, eventId);
  if (!event) throw new Error("Event not found.");
  await updateDomainEvent(event.id, {
    status: "PENDING",
    available_at: stamp(),
    locked_at: null,
    locked_by: null,
    error_message: null,
  });
  return processOutbox({ limit: 5 });
}
