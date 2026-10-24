"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors } from "@/lib/form-errors";
import { askAnalyticsAssistant } from "@/lib/ai/assistant";
import { changeAlertStatus, scanAnomalies } from "@/lib/analytics/anomalies";
import { upsertAnalyticsThreshold } from "@/lib/analytics/repository";
import {
  analyticsAlertStatusSchema,
  analyticsPeriodSchema,
  analyticsQuestionSchema,
  analyticsThresholdSchema,
} from "@/lib/validations/analytics";
import { ANALYTICS_ALERT_STATUSES, DEFAULT_ANALYTICS_THRESHOLDS, type AnalyticsRuleCode } from "@/lib/constants";
import type { ActionResult, AnalyticsAssistantAnswer } from "@/types";

function refreshAnalytics() {
  revalidatePath("/analytics");
  revalidatePath("/analytics/anomalies");
  revalidatePath("/analytics/variance");
  revalidatePath("/analytics/assistant");
}

export async function scanAnomaliesAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { success: false, message: "Sign in required." };
  if (!hasPermission(user, "analytics.alerts.manage")) {
    return { success: false, message: "You do not have permission for this action." };
  }
  const parsed = analyticsPeriodSchema.safeParse({ period: formData.get("period") });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Period is invalid." };
  try {
    const result = await scanAnomalies(user.organization.id, user.organization.timezone, user.id, parsed.data.period || undefined);
    await writeAudit({
      organizationId: user.organization.id,
      actorUserId: user.id,
      action: "analytics.scan",
      entityType: "analytics_refresh_job",
      entityId: result.snapshot.period,
      metadata: { created: result.created.length, candidates: result.candidates },
    });
    refreshAnalytics();
    return {
      success: true,
      message: result.created.length
        ? `Scan complete. ${result.created.length} alert${result.created.length === 1 ? "" : "s"} recorded.`
        : "Scan complete. No new alerts.",
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not scan anomalies." };
  }
}

export async function updateAlertStatusAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { success: false, message: "Sign in required." };
  if (!hasPermission(user, "analytics.alerts.manage")) return { success: false, message: "You do not have permission for this action." };
  const parsed = analyticsAlertStatusSchema.safeParse({
    alertId: formData.get("alertId"),
    status: formData.get("status"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Alert update is invalid." };
  if (!ANALYTICS_ALERT_STATUSES.includes(parsed.data.status)) return { success: false, message: "Unknown status." };
  try {
    const updated = await changeAlertStatus({
      organizationId: user.organization.id,
      alertId: parsed.data.alertId,
      status: parsed.data.status,
      note: parsed.data.note || undefined,
      actorId: user.id,
    });
    await writeAudit({
      organizationId: user.organization.id,
      actorUserId: user.id,
      action: "analytics.alert.status",
      entityType: "analytics_alert",
      entityId: updated.id,
      metadata: { status: updated.status },
    });
    refreshAnalytics();
    return { success: true, message: `Alert marked ${updated.status.toLowerCase()}.` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not update alert." };
  }
}

export async function saveThresholdAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { success: false, message: "Sign in required." };
  if (!hasPermission(user, "analytics.thresholds.manage")) return { success: false, message: "You do not have permission for this action." };
  const parsed = analyticsThresholdSchema.safeParse({
    ruleCode: formData.get("ruleCode"),
    thresholdValue: formData.get("thresholdValue"),
    enabled: formData.get("enabled"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Threshold is invalid." };
  const now = new Date().toISOString();
  const code = parsed.data.ruleCode as AnalyticsRuleCode;
  try {
    await upsertAnalyticsThreshold({
      id: crypto.randomUUID(),
      organization_id: user.organization.id,
      rule_code: code,
      threshold_value: parsed.data.thresholdValue,
      enabled: parsed.data.enabled !== "false",
      notes: null,
      created_by: user.id,
      updated_by: user.id,
      created_at: now,
      updated_at: now,
    });
    await writeAudit({
      organizationId: user.organization.id,
      actorUserId: user.id,
      action: "analytics.threshold.save",
      entityType: "analytics_threshold",
      entityId: code,
      metadata: { threshold: parsed.data.thresholdValue },
    });
    refreshAnalytics();
    return { success: true, message: `Saved ${code} threshold (default ${DEFAULT_ANALYTICS_THRESHOLDS[code]}).` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save threshold." };
  }
}

export async function askAssistantAction(
  _prev: ActionResult<AnalyticsAssistantAnswer> | undefined,
  formData: FormData
): Promise<ActionResult<AnalyticsAssistantAnswer>> {
  const user = await getSessionUser();
  if (!user) return { success: false, message: "Sign in required." };
  if (!hasPermission(user, "analytics.assistant.use") && !hasPermission(user, "analytics.view")) {
    return { success: false, message: "You do not have permission for this action." };
  }
  const parsed = analyticsQuestionSchema.safeParse({
    question: formData.get("question"),
    period: formData.get("period"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Question is required." };
  try {
    const data = await askAnalyticsAssistant({
      organizationId: user.organization.id,
      timezone: user.organization.timezone,
      userId: user.id,
      question: parsed.data.question,
      period: parsed.data.period || undefined,
    });
    revalidatePath("/analytics/assistant");
    return { success: true, data, message: data.status === "UNCONFIGURED" ? "Assistant unavailable; stored analytics shown." : "Answer ready." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Assistant failed." };
  }
}
