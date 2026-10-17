"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors, optional } from "@/lib/form-errors";
import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PermissionCode } from "@/lib/constants";
import { changeRequestDecisionSchema, changeRequestSchema } from "@/lib/validations/ess";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import {
  cancelChangeRequest,
  createChangeRequest,
  decideChangeRequest,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/ess/service";
import type { ActionResult } from "@/types";

function refresh() {
  revalidatePath("/my");
  revalidatePath("/my/profile");
  revalidatePath("/my/requests");
  revalidatePath("/my/notifications");
}

async function requireAccess(permission: PermissionCode) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." as const, user: null };
  if (!user.permissions.includes(permission)) return { error: "You do not have permission for this action." as const, user: null };
  return { error: null, user };
}

export async function submitChangeRequestAction(
  _prev: ActionResult<{ requestId: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ requestId: string }>> {
  const access = await requireAccess("self.profile.update");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };

  const parsed = changeRequestSchema.safeParse({
    category: formData.get("category"),
    fieldKey: formData.get("fieldKey"),
    currentValue: optional(formData.get("currentValue")),
    requestedValue: formData.get("requestedValue"),
    reason: optional(formData.get("reason")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };

  const identity = await resolveSelfEmployee(access.user);
  if (!identity) return { success: false, message: "No employee profile is linked to this account." };

  try {
    const saved = await createChangeRequest({
      organizationId: access.user.organization.id,
      actorId: access.user.id,
      employeeId: identity.employee.id,
      category: parsed.data.category,
      fieldKey: parsed.data.fieldKey,
      currentValue: parsed.data.currentValue || null,
      requestedValue: parsed.data.requestedValue,
      reason: parsed.data.reason || null,
    });
    await writeAudit({
      organizationId: access.user.organization.id,
      actorUserId: access.user.id,
      action: "self.change_request.submit",
      entityType: "ess_change_request",
      entityId: saved.id,
      metadata: { category: parsed.data.category, fieldKey: parsed.data.fieldKey },
    });
    refresh();
    return { success: true, message: "Change request submitted for review.", data: { requestId: saved.id } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not submit the change request." };
  }
}

export async function decideChangeRequestAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireAccess("self.change_request.review");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };

  const parsed = changeRequestDecisionSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    reason: optional(formData.get("reason")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  if (parsed.data.decision === "REJECTED" && !parsed.data.reason) {
    return { success: false, message: "A reason is required to reject a change request." };
  }

  const result = await decideChangeRequest({
    organizationId: access.user.organization.id,
    actorId: access.user.id,
    requestId: parsed.data.requestId,
    decision: parsed.data.decision,
    reason: parsed.data.reason || null,
  });
  if (result.error) return { success: false, message: result.error };
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: `self.change_request.${parsed.data.decision.toLowerCase()}`,
    entityType: "ess_change_request",
    entityId: parsed.data.requestId,
    metadata: { reason: parsed.data.reason ?? null },
  });
  refresh();
  return { success: true, message: `Change request ${parsed.data.decision.toLowerCase()}.` };
}

export async function cancelChangeRequestAction(formData: FormData): Promise<void> {
  const access = await requireAccess("self.profile.update");
  if (access.error || !access.user) return;
  const requestId = optional(formData.get("requestId"));
  if (!requestId) return;
  const result = await cancelChangeRequest({
    organizationId: access.user.organization.id,
    actorId: access.user.id,
    requestId,
  });
  if (result.error) return;
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "self.change_request.cancel",
    entityType: "ess_change_request",
    entityId: requestId,
  });
  refresh();
}

/**
 * Creates a short-lived signed download link for a document that belongs to the
 * signed-in user's own employee record. A document id from the browser is never
 * trusted for authorisation: ownership is re-checked against the session.
 */
export async function getSelfDocumentUrlAction(
  documentId: string
): Promise<ActionResult<{ url: string; fileName: string }>> {
  const access = await requireAccess("self.view");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const identity = await resolveSelfEmployee(access.user);
  if (!identity) return { success: false, message: "No employee profile is linked to this account." };

  if (!hasSupabaseConfig() || isDemoMode()) {
    const store = getDemoStore();
    const doc = store.employeeDocuments.find(
      (item) => item.id === documentId && item.employee_id === identity.employee.id
    );
    if (!doc) return { success: false, message: "Document not found." };
    const blob = store.documentBlobs[doc.file_path];
    if (!blob) return { success: false, message: "File is no longer available in this demo session." };
    return { success: true, data: { url: blob.dataUrl, fileName: doc.file_name } };
  }

  const admin = createAdminClient();
  if (!admin) return { success: false, message: "Storage is not configured." };
  const { data: doc } = await admin
    .from("employee_documents")
    .select("file_path, file_name, employee_id, organization_id")
    .eq("id", documentId)
    .eq("organization_id", access.user.organization.id)
    .maybeSingle();
  if (!doc || doc.employee_id !== identity.employee.id) {
    return { success: false, message: "Document not found." };
  }
  const { data, error } = await admin.storage.from("employee-documents").createSignedUrl(doc.file_path, 60);
  if (error || !data?.signedUrl) return { success: false, message: error?.message ?? "Unable to create a download link." };
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "self.document.download",
    entityType: "employee_documents",
    entityId: doc.employee_id,
    metadata: { documentId },
  });
  return { success: true, data: { url: data.signedUrl, fileName: doc.file_name } };
}

export async function getSelfTaxProofUrlAction(
  proofId: string
): Promise<ActionResult<{ url: string; fileName: string }>> {
  const access = await requireAccess("self.view");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const identity = await resolveSelfEmployee(access.user);
  if (!identity) return { success: false, message: "No employee profile is linked to this account." };

  if (!hasSupabaseConfig() || isDemoMode()) {
    return { success: false, message: "Proof downloads are available in a live environment." };
  }
  const admin = createAdminClient();
  if (!admin) return { success: false, message: "Storage is not configured." };
  const { data: proof } = await admin
    .from("employee_tax_proofs")
    .select("file_path, file_name, employee_id, organization_id")
    .eq("id", proofId)
    .eq("organization_id", access.user.organization.id)
    .maybeSingle();
  if (!proof || proof.employee_id !== identity.employee.id) {
    return { success: false, message: "Proof not found." };
  }
  const { data, error } = await admin.storage.from("tax-proofs").createSignedUrl(proof.file_path, 60);
  if (error || !data?.signedUrl) return { success: false, message: error?.message ?? "Unable to create a download link." };
  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "self.tax_proof.download",
    entityType: "employee_tax_proofs",
    entityId: proof.employee_id,
    metadata: { proofId },
  });
  return { success: true, data: { url: data.signedUrl, fileName: proof.file_name } };
}

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const access = await requireAccess("self.view");
  if (access.error || !access.user) return;
  const id = optional(formData.get("id"));
  if (!id) return;
  await markNotificationRead(access.user.id, id);
  refresh();
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const access = await requireAccess("self.view");
  if (access.error || !access.user) return;
  await markAllNotificationsRead(access.user.organization.id, access.user.id);
  refresh();
}
