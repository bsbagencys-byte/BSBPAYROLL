"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors, optional } from "@/lib/form-errors";
import { saveRule, testRule } from "@/lib/automation/rules";
import { cancelJobExecution, executeDueJobs, retryJobExecution, toggleScheduledJob } from "@/lib/jobs/service";
import { replayEvent } from "@/lib/events/bus";
import { ruleSchema, idSchema } from "@/lib/validations/automation";
import type { ActionResult } from "@/types";

function revalidateAutomation() {
  revalidatePath("/automation");
  revalidatePath("/automation/rules");
  revalidatePath("/automation/jobs");
}

export async function saveRuleAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { success: false, message: "Sign in required." };
  if (!hasPermission(user, "automation.manage")) return { success: false, message: "You do not have permission for this action." };
  const parsed = ruleSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    triggerType: formData.get("triggerType"),
    conditionField: formData.get("conditionField"),
    conditionOp: formData.get("conditionOp") || "eq",
    conditionValue: formData.get("conditionValue"),
    actionType: formData.get("actionType"),
    actionTitle: formData.get("actionTitle"),
    actionBody: formData.get("actionBody"),
    actionHref: formData.get("actionHref"),
    enabled: formData.get("enabled") ? "true" : "false",
    stopOnMatch: formData.get("stopOnMatch") ? "true" : "false",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Rule is invalid." };
  const conditions = parsed.data.conditionField
    ? [{ field: parsed.data.conditionField, op: parsed.data.conditionOp ?? "eq", value: parsed.data.conditionValue ?? "" }]
    : [];
  const now = new Date().toISOString();
  try {
    const saved = await saveRule({
      id: parsed.data.id || crypto.randomUUID(),
      organization_id: user.organization.id,
      name: parsed.data.name,
      trigger_type: parsed.data.triggerType,
      conditions_json: JSON.stringify(conditions),
      actions_json: JSON.stringify([
        {
          type: parsed.data.actionType,
          title: parsed.data.actionTitle || parsed.data.name,
          body: parsed.data.actionBody || "",
          href: parsed.data.actionHref || "/dashboard",
        },
      ]),
      enabled: parsed.data.enabled !== "false",
      stop_on_match: parsed.data.stopOnMatch === "true",
      created_by: user.id,
      updated_by: user.id,
      created_at: now,
      updated_at: now,
    });
    await writeAudit({
      organizationId: user.organization.id,
      actorUserId: user.id,
      action: "automation_rule_saved",
      entityType: "automation_rules",
      entityId: saved.id,
      metadata: { trigger: saved.trigger_type },
    });
    revalidateAutomation();
    return { success: true, message: "Rule saved." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save rule." };
  }
}

export async function toggleRuleAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "automation.manage")) return;
  const id = optional(formData.get("id"));
  const enabled = optional(formData.get("enabled")) === "true";
  const { getAutomationRule } = await import("@/lib/automation/rules");
  const rule = await getAutomationRule(user.organization.id, id);
  if (!rule) return;
  await saveRule({ ...rule, enabled, updated_by: user.id, updated_at: new Date().toISOString() });
  revalidateAutomation();
}

export async function testRuleAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { success: false, message: "Sign in required." };
  if (!hasPermission(user, "automation.manage")) return { success: false, message: "You do not have permission for this action." };
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { success: false, message: "Rule is required." };
  try {
    const result = await testRule(user.organization.id, parsed.data.id, user.id);
    revalidateAutomation();
    revalidatePath("/notifications");
    return { success: true, message: `Test event applied to ${result.applied.length} rule(s).` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not test rule." };
  }
}

export async function runJobsNowAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  if (!hasPermission(user, "automation.jobs.retry") && !hasPermission(user, "automation.manage")) return;
  const result = await executeDueJobs(`manual:${user.id}`);
  await writeAudit({
    organizationId: user.organization.id,
    actorUserId: user.id,
    action: "scheduled_jobs_run",
    entityType: "scheduled_jobs",
    entityId: user.organization.id,
    metadata: result,
  });
  revalidateAutomation();
}

export async function toggleJobAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "automation.manage")) return;
  const id = optional(formData.get("id"));
  const enabled = optional(formData.get("enabled")) === "true";
  await toggleScheduledJob(user.organization.id, id, enabled, user.id);
  revalidateAutomation();
}

export async function retryJobAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "automation.jobs.retry")) return;
  const id = optional(formData.get("id"));
  await retryJobExecution(user.organization.id, id, user.id);
  revalidateAutomation();
}

export async function cancelJobAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "automation.jobs.retry")) return;
  const id = optional(formData.get("id"));
  await cancelJobExecution(user.organization.id, id);
  revalidateAutomation();
}

export async function replayEventAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "automation.manage")) return;
  const id = optional(formData.get("id"));
  await replayEvent(user.organization.id, id);
  revalidateAutomation();
}
