"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors, optional } from "@/lib/form-errors";
import { createApiKey, revokeApiKey, rotateApiKey } from "@/lib/api/keys";
import { createWebhookEndpoint, replayWebhookAttempt, rotateWebhookSecret, updateWebhookEndpoint } from "@/lib/webhooks/service";
import { WEBHOOK_EVENT_TYPES, API_SCOPES } from "@/lib/constants";
import { apiKeySchema, webhookSchema } from "@/lib/validations/automation";
import type { ActionResult } from "@/types";

function revalidateDevelopers() {
  revalidatePath("/settings/developers");
  revalidatePath("/settings/developers/webhooks");
  revalidatePath("/settings/developers/webhook-logs");
  revalidatePath("/settings/developers/api-keys");
  revalidatePath("/settings/developers/api-logs");
}

export async function createWebhookAction(
  _prev: ActionResult<{ secret: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ secret: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, message: "Sign in required." };
  if (!hasPermission(user, "developers.webhooks.manage")) {
    return { success: false, message: "You do not have permission for this action." };
  }
  const eventTypes = formData.getAll("eventTypes").map(String).filter((item) => (WEBHOOK_EVENT_TYPES as readonly string[]).includes(item));
  const parsed = webhookSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
    eventTypes,
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Webhook is invalid." };
  try {
    const result = await createWebhookEndpoint({
      organizationId: user.organization.id,
      name: parsed.data.name,
      url: parsed.data.url,
      eventTypes: parsed.data.eventTypes,
      actorId: user.id,
    });
    await writeAudit({
      organizationId: user.organization.id,
      actorUserId: user.id,
      action: "webhook_created",
      entityType: "webhook_endpoints",
      entityId: result.endpoint.id,
      metadata: { urlHost: new URL(result.endpoint.url).host },
    });
    revalidateDevelopers();
    return { success: true, message: "Webhook created. Copy the secret now; it is shown only once.", data: { secret: result.secret } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not create webhook." };
  }
}

export async function rotateWebhookAction(
  _prev: ActionResult<{ secret: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ secret: string }>> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "developers.webhooks.manage")) {
    return { success: false, message: "You do not have permission for this action." };
  }
  const id = optional(formData.get("id"));
  try {
    const result = await rotateWebhookSecret(user.organization.id, id);
    await writeAudit({
      organizationId: user.organization.id,
      actorUserId: user.id,
      action: "webhook_secret_rotated",
      entityType: "webhook_endpoints",
      entityId: id,
    });
    revalidateDevelopers();
    return { success: true, message: "Secret rotated. Copy it now.", data: { secret: result.secret } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not rotate secret." };
  }
}

export async function toggleWebhookAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "developers.webhooks.manage")) return;
  const id = optional(formData.get("id"));
  const status = optional(formData.get("status")) === "ACTIVE" ? "ACTIVE" : "DISABLED";
  await updateWebhookEndpoint(user.organization.id, id, { status });
  revalidateDevelopers();
}

export async function replayWebhookAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "developers.webhooks.replay")) return;
  const id = optional(formData.get("id"));
  await replayWebhookAttempt(user.organization.id, id);
  revalidateDevelopers();
}

export async function createApiKeyAction(
  _prev: ActionResult<{ plaintext: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ plaintext: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, message: "Sign in required." };
  if (!hasPermission(user, "developers.api_keys.manage")) {
    return { success: false, message: "You do not have permission for this action." };
  }
  const scopes = formData.getAll("scopes").map(String).filter((item) => (API_SCOPES as readonly string[]).includes(item));
  const parsed = apiKeySchema.safeParse({
    name: formData.get("name"),
    scopes,
    expiresAt: formData.get("expiresAt"),
    rateLimitPerMinute: formData.get("rateLimitPerMinute") || 60,
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "API key is invalid." };
  try {
    const result = await createApiKey({
      organizationId: user.organization.id,
      name: parsed.data.name,
      scopes: parsed.data.scopes,
      expiresAt: parsed.data.expiresAt || null,
      rateLimitPerMinute: parsed.data.rateLimitPerMinute,
      actorId: user.id,
    });
    await writeAudit({
      organizationId: user.organization.id,
      actorUserId: user.id,
      action: "api_key_created",
      entityType: "api_keys",
      entityId: result.key.id,
      metadata: { prefix: result.key.key_prefix, scopes: parsed.data.scopes },
    });
    revalidateDevelopers();
    return { success: true, message: "API key created. Copy it now; the secret is shown only once.", data: { plaintext: result.plaintext } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not create API key." };
  }
}

export async function revokeApiKeyAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "developers.api_keys.manage")) return;
  const id = optional(formData.get("id"));
  await revokeApiKey(user.organization.id, id, user.id);
  await writeAudit({
    organizationId: user.organization.id,
    actorUserId: user.id,
    action: "api_key_revoked",
    entityType: "api_keys",
    entityId: id,
  });
  revalidateDevelopers();
}

export async function rotateApiKeyAction(
  _prev: ActionResult<{ plaintext: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ plaintext: string }>> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "developers.api_keys.manage")) {
    return { success: false, message: "You do not have permission for this action." };
  }
  const id = optional(formData.get("id"));
  try {
    const result = await rotateApiKey(user.organization.id, id, user.id);
    await writeAudit({
      organizationId: user.organization.id,
      actorUserId: user.id,
      action: "api_key_rotated",
      entityType: "api_keys",
      entityId: id,
    });
    revalidateDevelopers();
    return { success: true, message: "API key rotated. Copy the new secret now.", data: { plaintext: result.plaintext } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not rotate API key." };
  }
}
