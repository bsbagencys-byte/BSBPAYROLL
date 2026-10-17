import {
  insertChangeRequest,
  insertNotification,
  listChangeRequests,
  listNotifications,
  listOrgUsersWithRoles,
  markAllNotificationsRead as repoMarkAllNotificationsRead,
  markNotificationRead as repoMarkNotificationRead,
  updateChangeRequest,
} from "@/lib/ess/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import type { EssChangeCategory, EssChangeRequest, EssChangeRequestListItem, EssNotification, EssNotificationType } from "@/types";

const REVIEWER_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "HR"]);

export async function loadNotifications(organizationId: string, userId: string): Promise<EssNotification[]> {
  return listNotifications(organizationId, userId);
}

export async function loadChangeRequests(organizationId: string): Promise<EssChangeRequestListItem[]> {
  const [requests, catalog, users] = await Promise.all([
    listChangeRequests(organizationId),
    loadOrgCatalog(organizationId),
    listOrgUsersWithRoles(organizationId),
  ]);
  const byId = new Map(users.map((row) => [row.profile.id, row.profile]));
  return requests.map((request) => {
    const employee = catalog.employees.find((item) => item.id === request.employee_id) ?? null;
    return {
      request,
      employeeName: employee?.display_name ?? "Unknown",
      employeeCode: employee?.employee_code ?? "—",
      requestedByName: byId.get(request.requested_by)?.display_name ?? "—",
      reviewerName: request.reviewer_id ? byId.get(request.reviewer_id)?.display_name ?? null : null,
    };
  });
}

export async function notifyUser(input: {
  organizationId: string;
  userId: string;
  type: EssNotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}): Promise<EssNotification> {
  return insertNotification({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    read_at: null,
    created_at: new Date().toISOString(),
  });
}

/**
 * Delivers an in-app notification to the user linked to an employee, when one exists.
 * This is the extension point for other modules; no email or WhatsApp channel is claimed.
 */
export async function notifyEmployeeUser(
  organizationId: string,
  employeeId: string,
  payload: Omit<Parameters<typeof notifyUser>[0], "organizationId" | "userId">
): Promise<EssNotification | null> {
  const catalog = await loadOrgCatalog(organizationId);
  const userId = catalog.employees.find((item) => item.id === employeeId)?.user_id;
  if (!userId) return null;
  return notifyUser({ organizationId, userId, ...payload });
}

export async function createChangeRequest(input: {
  organizationId: string;
  actorId: string;
  employeeId: string;
  category: EssChangeCategory;
  fieldKey: string;
  currentValue: string | null;
  requestedValue: string;
  reason: string | null;
}): Promise<EssChangeRequest> {
  const now = new Date().toISOString();
  const saved = await insertChangeRequest({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    employee_id: input.employeeId,
    requested_by: input.actorId,
    category: input.category,
    field_key: input.fieldKey,
    current_value: input.currentValue,
    requested_value: input.requestedValue,
    reason: input.reason,
    status: "PENDING",
    reviewer_id: null,
    review_reason: null,
    reviewed_at: null,
    created_at: now,
    updated_at: now,
  });

  const [users, catalog] = await Promise.all([
    listOrgUsersWithRoles(input.organizationId),
    loadOrgCatalog(input.organizationId),
  ]);
  const employeeName = catalog.employees.find((item) => item.id === input.employeeId)?.display_name ?? "An employee";
  const reviewers = users.filter((row) => REVIEWER_ROLES.has(row.roleCode) && row.profile.status === "ACTIVE");
  await Promise.all(
    reviewers.map((row) =>
      notifyUser({
        organizationId: input.organizationId,
        userId: row.profile.id,
        type: "ACTION",
        title: "Profile change request awaiting review",
        body: `${employeeName} requested a ${input.category.toLowerCase()} change.`,
        href: "/my/requests",
        entityType: "ess_change_request",
        entityId: saved.id,
      })
    )
  );
  return saved;
}

export async function decideChangeRequest(input: {
  organizationId: string;
  actorId: string;
  requestId: string;
  decision: "APPROVED" | "REJECTED";
  reason: string | null;
}): Promise<{ error: string | null; request?: EssChangeRequest | null }> {
  const existing = (await listChangeRequests(input.organizationId)).find((row) => row.id === input.requestId);
  if (!existing) return { error: "Change request not found." };
  if (existing.status !== "PENDING") return { error: "This request has already been decided." };

  const updated = await updateChangeRequest(input.requestId, {
    status: input.decision,
    reviewer_id: input.actorId,
    review_reason: input.reason,
    reviewed_at: new Date().toISOString(),
  });

  await notifyUser({
    organizationId: input.organizationId,
    userId: existing.requested_by,
    type: input.decision === "APPROVED" ? "APPROVAL" : "ALERT",
    title: `Profile change ${input.decision.toLowerCase()}`,
    body: input.reason || `Your ${existing.category.toLowerCase()} change was ${input.decision.toLowerCase()}.`,
    href: "/my/requests",
    entityType: "ess_change_request",
    entityId: existing.id,
  });

  return { error: null, request: updated };
}

export async function cancelChangeRequest(input: {
  organizationId: string;
  actorId: string;
  requestId: string;
}): Promise<{ error: string | null }> {
  const existing = (await listChangeRequests(input.organizationId)).find((row) => row.id === input.requestId);
  if (!existing) return { error: "Change request not found." };
  if (existing.requested_by !== input.actorId) return { error: "You can only cancel your own requests." };
  if (existing.status !== "PENDING") return { error: "Only pending requests can be cancelled." };
  await updateChangeRequest(input.requestId, { status: "CANCELLED" });
  return { error: null };
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await repoMarkNotificationRead(id, userId);
}

export async function markAllNotificationsRead(organizationId: string, userId: string): Promise<void> {
  await repoMarkAllNotificationsRead(organizationId, userId);
}
