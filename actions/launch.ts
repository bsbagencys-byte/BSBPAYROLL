"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { flattenErrors, optional } from "@/lib/form-errors";
import {
  biometricRecordSchema,
  checklistToggleSchema,
  feedbackSchema,
  incidentResolveSchema,
  incidentSchema,
  parallelCompareSchema,
  pilotSignoffSchema,
  uatResultSchema,
} from "@/lib/validations/launch";
import {
  compareParallelRun,
  createFeedback,
  createIncident,
  recordBiometricVerification,
  recordLaunchDecision,
  recordUatResult,
  resolveIncident,
  signOffPilot,
  togglePilotChecklist,
} from "@/lib/launch/service";
import type { ActionResult } from "@/types";

function refresh() {
  revalidatePath("/admin/launch");
  revalidatePath("/admin/ops");
}

async function requireLaunch(manage = false) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." as const, user: null };
  if (user.roleCode !== "SUPER_ADMIN") {
    return { error: "Platform administrator access is required." as const, user: null };
  }
  const permission = manage ? "launch.manage" : "launch.view";
  if (!hasPermission(user, permission)) {
    return { error: "You do not have permission for this action." as const, user: null };
  }
  return { error: null, user };
}

export async function recordLaunchDecisionAction(): Promise<ActionResult> {
  const access = await requireLaunch(true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const row = await recordLaunchDecision(access.user.id);
  refresh();
  return { success: true, message: `Recorded ${row.decision.split("_").join(" ")}.` };
}

export async function createIncidentAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireLaunch(true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = incidentSchema.safeParse({
    title: formData.get("title"),
    severity: formData.get("severity"),
    impact: formData.get("impact"),
    organizationId: optional(formData.get("organizationId")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Incident details are incomplete." };
  const row = await createIncident({
    title: parsed.data.title,
    severity: parsed.data.severity,
    impact: parsed.data.impact,
    organizationId: parsed.data.organizationId,
    actorId: access.user.id,
  });
  refresh();
  return { success: true, message: `${row.incident_number} opened.` };
}

export async function resolveIncidentAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireLaunch(true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = incidentResolveSchema.safeParse({
    incidentId: formData.get("incidentId"),
    resolution: formData.get("resolution"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Resolution is required." };
  await resolveIncident(parsed.data.incidentId, parsed.data.resolution, access.user.id);
  refresh();
  return { success: true, message: "Incident resolved. Tenant data was not deleted." };
}

export async function createFeedbackAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireLaunch(true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = feedbackSchema.safeParse({
    pilotId: formData.get("pilotId"),
    moduleKey: formData.get("moduleKey"),
    kind: formData.get("kind"),
    severity: formData.get("severity"),
    summary: formData.get("summary"),
    reproduction: optional(formData.get("reproduction")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Feedback is incomplete." };
  await createFeedback({
    ...parsed.data,
    reproduction: parsed.data.reproduction,
    actorId: access.user.id,
  });
  refresh();
  return { success: true, message: parsed.data.kind === "FEATURE_REQUEST" ? "Feature request filed separately from defects." : "Defect recorded." };
}

export async function recordUatResultAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireLaunch(true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = uatResultSchema.safeParse({
    itemId: formData.get("itemId"),
    status: formData.get("status"),
    tester: formData.get("tester"),
    evidence: optional(formData.get("evidence")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "UAT result is incomplete." };
  try {
    await recordUatResult(parsed.data.itemId, parsed.data.status, parsed.data.tester, parsed.data.evidence || null, access.user.id);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "UAT update failed." };
  }
  refresh();
  return { success: true, message: "UAT result saved." };
}

export async function compareParallelRunAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireLaunch(true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = parallelCompareSchema.safeParse({
    runId: formData.get("runId"),
    expectedNet: formData.get("expectedNet"),
    calculatedNet: formData.get("calculatedNet"),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Comparison values are required." };
  const expected = Number(parsed.data.expectedNet);
  const calculated = Number(parsed.data.calculatedNet);
  if (!Number.isFinite(expected) || !Number.isFinite(calculated)) {
    return { success: false, message: "Net amounts must be numbers." };
  }
  try {
    const row = await compareParallelRun(parsed.data.runId, expected, calculated, parsed.data.notes || null, access.user.id);
    refresh();
    return {
      success: true,
      message: row.mismatch_count === 0
        ? "Amounts match. Payroll remains unfinalized."
        : "Mismatch recorded. Do not finalize or pay this pilot payroll.",
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Comparison failed." };
  }
}

export async function recordBiometricAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireLaunch(true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = biometricRecordSchema.safeParse({
    vendor: formData.get("vendor"),
    model: formData.get("model"),
    method: formData.get("method"),
    advertised: formData.get("advertised") ?? undefined,
    result: formData.get("result"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Verification details are incomplete." };
  try {
    await recordBiometricVerification({
      vendor: parsed.data.vendor,
      model: parsed.data.model,
      method: parsed.data.method,
      advertised: Boolean(parsed.data.advertised),
      result: parsed.data.result,
      notes: parsed.data.notes,
    });
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Verification was rejected." };
  }
  refresh();
  return { success: true, message: "Hardware verification recorded without over-claiming compatibility." };
}

export async function signOffPilotAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireLaunch(true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = pilotSignoffSchema.safeParse({
    pilotId: formData.get("pilotId"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { success: false, message: "Confirm sign-off is required." };
  try {
    await signOffPilot(parsed.data.pilotId, access.user.id);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Sign-off failed." };
  }
  refresh();
  return { success: true, message: "Pilot signed off for tested workflows only." };
}

export async function toggleChecklistAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireLaunch(true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = checklistToggleSchema.safeParse({
    itemId: formData.get("itemId"),
    complete: formData.get("complete") ?? undefined,
    evidence: optional(formData.get("evidence")),
  });
  if (!parsed.success) return { success: false, message: "Checklist update is incomplete." };
  try {
    await togglePilotChecklist(parsed.data.itemId, Boolean(parsed.data.complete), parsed.data.evidence || null, access.user.id);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Checklist update failed." };
  }
  refresh();
  return { success: true, message: "Checklist updated from recorded evidence." };
}
