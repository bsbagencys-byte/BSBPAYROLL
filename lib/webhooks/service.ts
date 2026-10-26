import { WEBHOOK_EVENT_TYPES } from "@/lib/constants";
import { sha256, tokenHint } from "@/lib/biometric/hash";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";
import { generateWebhookSecret, signWebhookPayload } from "@/lib/webhooks/signature";
import {
  getWebhookAttempt,
  getWebhookEndpoint,
  insertWebhookAttempt,
  listRetryableWebhookAttempts,
  listWebhookAttempts,
  listWebhookEndpoints,
  updateWebhookAttempt,
  upsertWebhookEndpoint,
} from "@/lib/events/repository";
import { getDomainEvent } from "@/lib/events/repository";
import { assertSafeWebhookUrl } from "@/lib/webhooks/ssrf";
import type { DomainEvent, WebhookDeliveryAttempt, WebhookEndpoint } from "@/types";

const secrets = new Map<string, string>();

function stamp() {
  return new Date().toISOString();
}

function parseTypes(raw: string): string[] {
  try {
    const value = JSON.parse(raw || "[]") as unknown;
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

export { generateWebhookSecret, signWebhookPayload };
export { verifyWebhookSignature } from "@/lib/webhooks/signature";

function publicPayload(event: DomainEvent) {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(event.payload_json || "{}") as Record<string, unknown>;
  } catch {
    payload = {};
  }
  return {
    id: event.id,
    type: event.event_type,
    version: event.version,
    occurred_at: event.created_at,
    organization_id: event.organization_id,
    entity_type: event.entity_type,
    entity_id: event.entity_id,
    data: payload,
  };
}

async function postSigned(endpoint: WebhookEndpoint, event: DomainEvent, secret: string) {
  const body = JSON.stringify(publicPayload(event));
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signWebhookPayload(secret, timestamp, body);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "BSB-Payroll-Webhooks/1",
        "x-bsb-event": event.event_type,
        "x-bsb-event-id": event.id,
        "x-bsb-timestamp": timestamp,
        "x-bsb-signature": `sha256=${signature}`,
      },
      body,
      signal: controller.signal,
      redirect: "error",
    });
    const excerpt = (await response.text()).slice(0, 200);
    return { httpStatus: response.status, excerpt, ok: response.ok };
  } finally {
    clearTimeout(timer);
  }
}

export async function createWebhookEndpoint(input: {
  organizationId: string;
  name: string;
  url: string;
  eventTypes: string[];
  actorId: string | null;
}) {
  const url = await assertSafeWebhookUrl(input.url);
  const types = input.eventTypes.filter((item) => (WEBHOOK_EVENT_TYPES as readonly string[]).includes(item));
  if (!types.length) throw new Error("Select at least one supported event.");
  const secret = generateWebhookSecret();
  const row: WebhookEndpoint = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    name: input.name,
    url,
    secret_hash: sha256(secret),
    secret_hint: tokenHint(secret),
    secret_encrypted: encryptSecret(secret),
    status: "ACTIVE",
    event_types_json: JSON.stringify(types),
    created_by: input.actorId,
    rotated_at: null,
    created_at: stamp(),
    updated_at: stamp(),
  };
  const saved = await upsertWebhookEndpoint(row);
  secrets.set(saved.id, secret);
  return { endpoint: saved, secret };
}

export async function rotateWebhookSecret(organizationId: string, id: string) {
  const existing = await getWebhookEndpoint(organizationId, id);
  if (!existing) throw new Error("Webhook endpoint not found.");
  const secret = generateWebhookSecret();
  const saved = await upsertWebhookEndpoint({
    ...existing,
    secret_hash: sha256(secret),
    secret_hint: tokenHint(secret),
    secret_encrypted: encryptSecret(secret),
    rotated_at: stamp(),
    updated_at: stamp(),
  });
  secrets.set(saved.id, secret);
  return { endpoint: saved, secret };
}

export async function updateWebhookEndpoint(
  organizationId: string,
  id: string,
  patch: Partial<Pick<WebhookEndpoint, "name" | "url" | "status" | "event_types_json">>
) {
  const existing = await getWebhookEndpoint(organizationId, id);
  if (!existing) throw new Error("Webhook endpoint not found.");
  if (patch.url) patch.url = await assertSafeWebhookUrl(patch.url);
  return upsertWebhookEndpoint({ ...existing, ...patch, updated_at: stamp() });
}

function secretFor(endpoint: WebhookEndpoint) {
  return secrets.get(endpoint.id) ?? decryptSecret(endpoint.secret_encrypted) ?? null;
}

export async function deliverWebhooksForEvent(event: DomainEvent) {
  if (!(WEBHOOK_EVENT_TYPES as readonly string[]).includes(event.event_type)) return [];
  const endpoints = (await listWebhookEndpoints(event.organization_id)).filter((item) => item.status === "ACTIVE");
  const attempts: WebhookDeliveryAttempt[] = [];
  for (const endpoint of endpoints) {
    const types = parseTypes(endpoint.event_types_json);
    if (!types.includes(event.event_type)) continue;
    const existing = await insertWebhookAttempt({
      id: crypto.randomUUID(),
      organization_id: event.organization_id,
      endpoint_id: endpoint.id,
      event_id: event.id,
      status: "QUEUED",
      attempt_count: 0,
      http_status: null,
      response_excerpt: null,
      error_message: null,
      signature_timestamp: null,
      next_attempt_at: stamp(),
      delivered_at: null,
      created_at: stamp(),
      updated_at: stamp(),
    });
    if (existing) attempts.push(await attemptWebhookDelivery(existing, endpoint, event));
  }
  return attempts;
}

export async function attemptWebhookDelivery(
  attempt: WebhookDeliveryAttempt,
  endpoint?: WebhookEndpoint | null,
  event?: DomainEvent | null
) {
  const ep = endpoint ?? (await getWebhookEndpoint(attempt.organization_id, attempt.endpoint_id));
  const ev = event ?? (await getDomainEvent(attempt.organization_id, attempt.event_id));
  if (!ep || !ev) {
    await updateWebhookAttempt(attempt.id, { status: "FAILED", error_message: "Endpoint or event missing." });
    return attempt;
  }
  try {
    await assertSafeWebhookUrl(ep.url);
  } catch (error) {
    await updateWebhookAttempt(attempt.id, {
      status: "BLOCKED",
      error_message: error instanceof Error ? error.message : "Blocked destination.",
      attempt_count: attempt.attempt_count + 1,
    });
    return { ...attempt, status: "BLOCKED" as const };
  }
  const secret = secretFor(ep);
  if (!secret) {
    await updateWebhookAttempt(attempt.id, {
      status: "FAILED",
      error_message: "Webhook signing secret is unavailable. Set SESSION_SECRET and rotate the secret to deliver.",
      attempt_count: attempt.attempt_count + 1,
      next_attempt_at: null,
    });
    return attempt;
  }
  try {
    const result = await postSigned(ep, ev, secret);
    const ok = result.ok;
    const dead = !ok && attempt.attempt_count + 1 >= 5;
    await updateWebhookAttempt(attempt.id, {
      status: ok ? "DELIVERED" : dead ? "DEAD" : "FAILED",
      http_status: result.httpStatus,
      response_excerpt: result.excerpt,
      error_message: ok ? null : `HTTP ${result.httpStatus}`,
      signature_timestamp: String(Math.floor(Date.now() / 1000)),
      attempt_count: attempt.attempt_count + 1,
      delivered_at: ok ? stamp() : null,
      next_attempt_at: ok || dead ? null : new Date(Date.now() + Math.min(30 * 60_000, 2 ** (attempt.attempt_count + 1) * 30_000)).toISOString(),
    });
  } catch (error) {
    const dead = attempt.attempt_count + 1 >= 5;
    await updateWebhookAttempt(attempt.id, {
      status: dead ? "DEAD" : "FAILED",
      error_message: error instanceof Error ? error.message.slice(0, 300) : "Delivery failed.",
      attempt_count: attempt.attempt_count + 1,
      next_attempt_at: dead ? null : new Date(Date.now() + 60_000).toISOString(),
    });
  }
  return attempt;
}

export async function retryWebhookAttempts() {
  const rows = await listRetryableWebhookAttempts();
  for (const row of rows) await attemptWebhookDelivery(row);
  return rows.length;
}

export async function replayWebhookAttempt(organizationId: string, id: string) {
  const attempt = await getWebhookAttempt(organizationId, id);
  if (!attempt) throw new Error("Delivery attempt not found.");
  await updateWebhookAttempt(attempt.id, { status: "QUEUED", next_attempt_at: stamp() });
  return attemptWebhookDelivery({ ...attempt, status: "QUEUED" });
}

export { listWebhookEndpoints, listWebhookAttempts, getWebhookEndpoint };
