"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { flattenErrors, optional } from "@/lib/form-errors";
import {
  dataExportSchema,
  importConfirmSchema,
  importPreviewSchema,
  offboardingConfirmSchema,
  offboardingSchema,
  skipAttendanceSchema,
  supportReplySchema,
  supportStatusSchema,
  supportTicketSchema,
} from "@/lib/validations/onboarding";
import {
  confirmImport,
  confirmOffboarding,
  createSupportTicket,
  downloadDataExport,
  previewImport,
  refreshOnboarding,
  replySupportTicket,
  requestDataExport,
  requestOffboarding,
  skipAttendanceStep,
  updateSupportStatus,
} from "@/lib/onboarding/service";
import type { ActionResult } from "@/types";
import type { PermissionCode } from "@/lib/constants";

function refresh() {
  revalidatePath("/onboarding");
  revalidatePath("/support");
  revalidatePath("/settings/data-migration");
  revalidatePath("/settings/data-export");
  revalidatePath("/admin/support");
  revalidatePath("/admin/ops");
}

async function requireOnboarding(permission: PermissionCode, platformOnly = false) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." as const, user: null };
  if (platformOnly && user.roleCode !== "SUPER_ADMIN") {
    return { error: "Platform administrator access is required." as const, user: null };
  }
  if (!hasPermission(user, permission)) {
    return { error: "You do not have permission for this action." as const, user: null };
  }
  return { error: null, user };
}

export async function refreshOnboardingAction(): Promise<ActionResult> {
  const access = await requireOnboarding("onboarding.view");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  await refreshOnboarding(access.user.organization.id, access.user.id);
  refresh();
  return { success: true, message: "Checklist refreshed from stored data." };
}

export async function skipAttendanceAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireOnboarding("onboarding.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = skipAttendanceSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please explain why attendance is skipped." };
  await skipAttendanceStep(access.user.organization.id, access.user.id, parsed.data.reason);
  refresh();
  return { success: true, message: "Attendance step skipped. It remains optional until Phase 4 exists." };
}

export async function previewImportAction(
  _prev: ActionResult<{ jobId: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ jobId: string }>> {
  const access = await requireOnboarding("migration.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = importPreviewSchema.safeParse({ entityType: formData.get("entityType") });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Choose an import type." };
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name) return { success: false, message: "Upload a CSV file." };
  try {
    const text = await file.text();
    const result = await previewImport({
      organizationId: access.user.organization.id,
      actorId: access.user.id,
      entityType: parsed.data.entityType,
      fileName: file.name,
      text,
    });
    refresh();
    return {
      success: true,
      message: `Preview ready. ${result.job.ready_rows} row(s) can import, ${result.job.error_rows} error(s). Confirm is required before write.`,
      data: { jobId: result.job.id },
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Preview failed." };
  }
}

export async function confirmImportAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireOnboarding("migration.manage");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = importConfirmSchema.safeParse({
    jobId: formData.get("jobId"),
    confirm: optional(formData.get("confirm")) || undefined,
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Confirm the previewed job." };
  if (parsed.data.confirm !== "true" && parsed.data.confirm !== "on") {
    return { success: false, message: "Tick confirm. Imports never run from preview alone." };
  }
  try {
    const result = await confirmImport(access.user.organization.id, parsed.data.jobId, access.user.id);
    refresh();
    return {
      success: true,
      message: `Import ${result.job.status.toLowerCase()}. ${result.job.imported_rows} imported, ${result.job.skipped_rows} skipped.`,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Confirm failed." };
  }
}

export async function createSupportTicketAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const access = await requireOnboarding("support.create");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = supportTicketSchema.safeParse({
    subject: formData.get("subject"),
    category: formData.get("category"),
    priority: formData.get("priority") || "NORMAL",
    body: formData.get("body"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Please complete the ticket." };
  const ticket = await createSupportTicket({
    organizationId: access.user.organization.id,
    actorId: access.user.id,
    subject: parsed.data.subject,
    category: parsed.data.category,
    priority: parsed.data.priority,
    body: parsed.data.body,
  });
  refresh();
  return { success: true, message: `Ticket ${ticket.ticket_number} opened.`, data: { id: ticket.id } };
}

export async function replySupportTicketAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { success: false, message: "Sign in required." };
  const platform = user.roleCode === "SUPER_ADMIN" && hasPermission(user, "support.platform");
  if (!platform && !hasPermission(user, "support.create") && !hasPermission(user, "support.manage")) {
    return { success: false, message: "You do not have permission for this action." };
  }
  const parsed = supportReplySchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
    visibility: optional(formData.get("visibility")) || "CUSTOMER",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Enter a reply." };
  try {
    await replySupportTicket({
      organizationId: user.organization.id,
      ticketId: parsed.data.ticketId,
      actorId: user.id,
      body: parsed.data.body,
      visibility: parsed.data.visibility ?? "CUSTOMER",
      platform,
    });
    refresh();
    return { success: true, message: "Reply saved." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Reply failed." };
  }
}

export async function updateSupportStatusAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { success: false, message: "Sign in required." };
  const platform = user.roleCode === "SUPER_ADMIN" && hasPermission(user, "support.platform");
  if (!platform && !hasPermission(user, "support.manage")) {
    return { success: false, message: "You do not have permission for this action." };
  }
  const parsed = supportStatusSchema.safeParse({
    ticketId: formData.get("ticketId"),
    action: formData.get("action"),
    organizationId: optional(formData.get("organizationId")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Choose a status action." };
  try {
    await updateSupportStatus({
      organizationId: parsed.data.organizationId || user.organization.id,
      ticketId: parsed.data.ticketId,
      actorId: user.id,
      action: parsed.data.action,
      platform,
    });
    refresh();
    return { success: true, message: "Ticket status updated." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Status update failed." };
  }
}

export async function requestDataExportAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const access = await requireOnboarding("data.export");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = dataExportSchema.safeParse({ kind: formData.get("kind") });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Choose an export kind." };
  const job = await requestDataExport(access.user.organization.id, parsed.data.kind, access.user.id);
  refresh();
  if (job.status !== "READY") {
    return { success: false, message: job.error_message || "Export failed.", data: { id: job.id } };
  }
  return { success: true, message: "Export is ready for 72 hours. Tenant data is not deleted when it expires.", data: { id: job.id } };
}

export async function downloadDataExportAction(jobId: string): Promise<ActionResult<{ fileName: string; content: string }>> {
  const access = await requireOnboarding("data.export");
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  try {
    const job = await downloadDataExport(access.user.organization.id, jobId, access.user.id);
    return {
      success: true,
      data: { fileName: job.file_name || "export.csv", content: job.content || "" },
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Download failed." };
  }
}

export async function requestOffboardingAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireOnboarding("data.offboard", true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = offboardingSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Enter an offboarding reason." };
  await requestOffboarding(access.user.organization.id, parsed.data.reason, access.user.id);
  refresh();
  return { success: true, message: "Offboarding requested. A full export was prepared. Confirm does not delete tenant data." };
}

export async function confirmOffboardingAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireOnboarding("data.offboard", true);
  if (access.error || !access.user) return { success: false, message: access.error ?? "Unauthorized." };
  const parsed = offboardingConfirmSchema.safeParse({
    requestId: formData.get("requestId"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Confirm offboarding explicitly." };
  try {
    await confirmOffboarding(access.user.organization.id, parsed.data.requestId, access.user.id);
    refresh();
    return { success: true, message: "Offboarding recorded. Existing history is preserved. Nothing was deleted." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Confirm failed." };
  }
}
