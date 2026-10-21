"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors, optional } from "@/lib/form-errors";
import {
  ensureDefaultTemplates,
  loadInbox,
  markAllRead,
  markRead,
  savePreference,
  saveTemplate,
} from "@/lib/notifications/service";
import { preferenceSchema, templateSchema } from "@/lib/validations/automation";
import type { ActionResult } from "@/types";

export async function markInboxReadAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "notifications.view")) return;
  const id = optional(formData.get("id"));
  if (!id) return;
  await markRead(id, user.id);
  revalidatePath("/notifications");
  revalidatePath("/my/notifications");
}

export async function markInboxAllReadAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "notifications.view")) return;
  await markAllRead(user.organization.id, user.id);
  revalidatePath("/notifications");
  revalidatePath("/my/notifications");
}

export async function savePreferenceAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { success: false, message: "Sign in required." };
  if (!hasPermission(user, "notifications.view")) return { success: false, message: "You do not have permission for this action." };
  const parsed = preferenceSchema.safeParse({
    eventType: formData.get("eventType"),
    inApp: formData.get("inApp") ? "true" : "false",
    email: formData.get("email") ? "true" : "false",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Preference is invalid." };
  const now = new Date().toISOString();
  await savePreference({
    id: crypto.randomUUID(),
    organization_id: user.organization.id,
    user_id: user.id,
    event_type: parsed.data.eventType,
    in_app: parsed.data.inApp !== "false",
    email: parsed.data.email === "true",
    created_at: now,
    updated_at: now,
  });
  revalidatePath("/settings/notifications");
  return { success: true, message: "Preference saved." };
}

export async function saveTemplateAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { success: false, message: "Sign in required." };
  if (!hasPermission(user, "notifications.manage")) return { success: false, message: "You do not have permission for this action." };
  const parsed = templateSchema.safeParse({
    id: formData.get("id"),
    key: formData.get("key"),
    name: formData.get("name"),
    eventType: formData.get("eventType"),
    channel: formData.get("channel"),
    subject: formData.get("subject"),
    bodyText: formData.get("bodyText"),
    bodyHtml: formData.get("bodyHtml"),
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Template is invalid." };
  const now = new Date().toISOString();
  try {
    await saveTemplate({
      id: parsed.data.id || crypto.randomUUID(),
      organization_id: user.organization.id,
      key: parsed.data.key,
      name: parsed.data.name,
      event_type: parsed.data.eventType,
      channel: parsed.data.channel,
      language: "en",
      subject: parsed.data.subject,
      body_text: parsed.data.bodyText,
      body_html: parsed.data.bodyHtml || null,
      variables_json: "[]",
      status: parsed.data.status ?? "ACTIVE",
      created_by: user.id,
      updated_by: user.id,
      created_at: now,
      updated_at: now,
    });
    await writeAudit({
      organizationId: user.organization.id,
      actorUserId: user.id,
      action: "notification_template_saved",
      entityType: "notification_templates",
      entityId: parsed.data.key,
      metadata: { eventType: parsed.data.eventType },
    });
    revalidatePath("/settings/notifications/templates");
    return { success: true, message: "Template saved." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save template." };
  }
}

export async function seedTemplatesAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "notifications.manage")) return;
  await ensureDefaultTemplates(user.organization.id, user.id);
  revalidatePath("/settings/notifications/templates");
}

export { loadInbox };
