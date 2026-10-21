import { emitDomainEvent } from "@/lib/events/bus";
import type { AutomationEventType } from "@/lib/constants";
import type { EventPayload } from "@/lib/events/catalog";

export async function emitSafe(input: {
  organizationId: string;
  eventType: AutomationEventType;
  entityType?: string | null;
  entityId?: string | null;
  actorId?: string | null;
  payload?: EventPayload;
  idempotencyKey?: string | null;
}) {
  try {
    await emitDomainEvent(input);
  } catch {
    return;
  }
}
