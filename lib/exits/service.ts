import { emitSafe } from "@/lib/events/emit";
import { addDays, todayInZone } from "@/lib/leave/dates";
import { loadOrgCatalog } from "@/lib/org-data";
import { getDemoStore } from "@/lib/demo-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { asBool, asNumber, DEFAULT_CLEARANCE_TEMPLATES, nextReference } from "@/lib/exits/engine";
import { exitBlocksOrdinaryPayroll } from "@/lib/exits/eligibility";
import {
  insertClearanceItem,
  insertClearanceTask,
  insertEmployeeExit,
  listClearanceItems,
  listClearanceTasks,
  listEmployeeExits,
  updateClearanceItem,
  updateClearanceTask,
  updateEmployeeExit,
} from "@/lib/exits/repository";
import type {
  EmployeeExit,
  ExitClearanceItem,
  ExitClearanceTask,
  Organization,
} from "@/types";
import type { ClearanceTaskStatus, EmployeeStatus, ExitStatus, ExitType } from "@/lib/constants";

function stamp() {
  return new Date().toISOString();
}

async function setEmployeeStatus(organizationId: string, employeeId: string, status: EmployeeStatus, actorId: string) {
  const now = stamp();
  if (!hasSupabaseConfig() || isDemoMode()) {
    const employee = getDemoStore().employees.find((item) => item.id === employeeId && item.organization_id === organizationId);
    if (employee) {
      employee.status = status;
      employee.updated_by = actorId;
      employee.updated_at = now;
    }
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("employees").update({ status, updated_by: actorId }).eq("id", employeeId).eq("organization_id", organizationId);
}

export function activeExitStatuses(): ExitStatus[] {
  return ["DRAFT", "SUBMITTED", "APPROVED", "IN_NOTICE", "CLEARANCE_PENDING", "SETTLEMENT_PENDING"];
}

export async function ensureDefaultClearanceItems(organizationId: string, actorId: string | null) {
  const existing = await listClearanceItems(organizationId);
  if (existing.length) return existing;
  const now = stamp();
  const rows: ExitClearanceItem[] = [];
  for (const item of DEFAULT_CLEARANCE_TEMPLATES) {
    rows.push(
      await insertClearanceItem({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        department: item.department,
        code: item.code,
        name: item.name,
        description: null,
        required: item.required,
        default_due_days: item.default_due_days,
        sort_order: item.sort_order,
        status: "ACTIVE",
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      })
    );
  }
  return rows;
}

export async function saveClearanceItemRow(input: {
  organizationId: string;
  actorId: string;
  id?: string;
  department: ExitClearanceItem["department"];
  code: string;
  name: string;
  description?: string;
  required?: boolean;
  defaultDueDays?: number;
}) {
  const now = stamp();
  if (input.id) {
    const row = await updateClearanceItem(input.id, {
      department: input.department,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description || null,
      required: input.required ?? true,
      default_due_days: input.defaultDueDays ?? 7,
      updated_by: input.actorId,
    });
    if (!row) throw new Error("Clearance item not found.");
    return row;
  }
  return insertClearanceItem({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    department: input.department,
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    description: input.description || null,
    required: input.required ?? true,
    default_due_days: input.defaultDueDays ?? 7,
    sort_order: 100,
    status: "ACTIVE",
    created_by: input.actorId,
    updated_by: input.actorId,
    created_at: now,
    updated_at: now,
  });
}

async function spawnClearanceTasks(exitRow: EmployeeExit, actorId: string | null) {
  const items = (await ensureDefaultClearanceItems(exitRow.organization_id, actorId)).filter((item) => item.status === "ACTIVE");
  const existing = (await listClearanceTasks(exitRow.organization_id)).filter((item) => item.exit_id === exitRow.id);
  if (existing.length) return existing;
  const now = stamp();
  const rows: ExitClearanceTask[] = [];
  for (const item of items) {
    rows.push(
      await insertClearanceTask({
        id: crypto.randomUUID(),
        organization_id: exitRow.organization_id,
        exit_id: exitRow.id,
        item_id: item.id,
        department: item.department,
        name: item.name,
        required: item.required,
        owner_id: item.department === "MANAGER" ? exitRow.approver_id : null,
        due_date: addDays(exitRow.last_working_date, item.default_due_days),
        status: "PENDING",
        remarks: null,
        completed_by: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      })
    );
  }
  return rows;
}

export function requiredClearanceOpen(tasks: ExitClearanceTask[]) {
  const required = tasks.filter((item) => item.required);
  return {
    pending: required.filter((item) => item.status === "PENDING").length,
    blocked: required.filter((item) => item.status === "BLOCKED").length,
    cleared: required.filter((item) => item.status === "CLEARED" || item.status === "NOT_APPLICABLE").length,
    complete: required.every((item) => item.status === "CLEARED" || item.status === "NOT_APPLICABLE"),
  };
}

export async function saveEmployeeExit(input: {
  organizationId: string;
  actorId: string;
  id?: string;
  employeeId: string;
  exitType: ExitType;
  noticeDate: string;
  lastWorkingDate: string;
  noticePeriodDays: number;
  noticeServedDays: number;
  reason?: string;
  remarks?: string;
  attachmentName?: string;
  approverId?: string | null;
}) {
  if (input.lastWorkingDate < input.noticeDate) throw new Error("Last working date cannot be before notice date.");
  const catalog = await loadOrgCatalog(input.organizationId);
  const employee = catalog.employees.find((item) => item.id === input.employeeId);
  if (!employee) throw new Error("Employee not found.");
  const exits = await listEmployeeExits(input.organizationId);
  const duplicate = exits.find(
    (item) => item.employee_id === input.employeeId && item.id !== input.id && activeExitStatuses().includes(item.status)
  );
  if (duplicate) throw new Error("This employee already has an active exit.");
  const now = stamp();
  if (input.id) {
    const current = exits.find((item) => item.id === input.id);
    if (!current) throw new Error("Exit not found.");
    if (current.status !== "DRAFT") throw new Error("Only draft exits can be edited.");
    const row = await updateEmployeeExit(input.id, {
      employee_id: input.employeeId,
      exit_type: input.exitType,
      notice_date: input.noticeDate,
      last_working_date: input.lastWorkingDate,
      notice_period_days: input.noticePeriodDays,
      notice_served_days: input.noticeServedDays,
      reason: input.reason || null,
      remarks: input.remarks || null,
      attachment_name: input.attachmentName || null,
      approver_id: input.approverId || null,
      updated_by: input.actorId,
    });
    if (!row) throw new Error("Exit not found.");
    return row;
  }
  return insertEmployeeExit({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    employee_id: input.employeeId,
    reference_number: nextReference("EX-", exits.map((item) => item.reference_number)),
    exit_type: input.exitType,
    notice_date: input.noticeDate,
    last_working_date: input.lastWorkingDate,
    notice_period_days: input.noticePeriodDays,
    notice_served_days: input.noticeServedDays,
    reason: input.reason || null,
    remarks: input.remarks || null,
    attachment_name: input.attachmentName || null,
    approver_id: input.approverId || null,
    status: "DRAFT",
    submitted_at: null,
    approved_at: null,
    cancelled_at: null,
    cancel_reason: null,
    created_by: input.actorId,
    updated_by: input.actorId,
    created_at: now,
    updated_at: now,
  });
}

export async function submitEmployeeExit(organizationId: string, exitId: string, actorId: string) {
  const exits = await listEmployeeExits(organizationId);
  const row = exits.find((item) => item.id === exitId);
  if (!row) throw new Error("Exit not found.");
  if (row.status !== "DRAFT") throw new Error("Only draft exits can be submitted.");
  const updated = await updateEmployeeExit(exitId, {
    status: "SUBMITTED",
    submitted_at: stamp(),
    updated_by: actorId,
  });
  if (!updated) throw new Error("Exit not found.");
  return updated;
}

export async function decideEmployeeExit(input: {
  organizationId: string;
  organization: Organization;
  exitId: string;
  actorId: string;
  decision: "APPROVED" | "REJECTED";
  reason?: string;
}) {
  const exits = await listEmployeeExits(input.organizationId);
  const row = exits.find((item) => item.id === input.exitId);
  if (!row) throw new Error("Exit not found.");
  if (row.status !== "SUBMITTED") throw new Error("Only submitted exits can be decided.");
  if (input.decision === "REJECTED") {
    const updated = await updateEmployeeExit(input.exitId, {
      status: "DRAFT",
      cancel_reason: input.reason || "Returned for correction",
      updated_by: input.actorId,
    });
    if (!updated) throw new Error("Exit not found.");
    return updated;
  }
  const today = todayInZone(input.organization.timezone);
  const inNotice = today < row.last_working_date;
  const status: ExitStatus = inNotice ? "IN_NOTICE" : "CLEARANCE_PENDING";
  const updated = await updateEmployeeExit(input.exitId, {
    status,
    approved_at: stamp(),
    updated_by: input.actorId,
  });
  if (!updated) throw new Error("Exit not found.");
  await spawnClearanceTasks(updated, input.actorId);
  await setEmployeeStatus(
    input.organizationId,
    updated.employee_id,
    inNotice ? "ON_NOTICE" : updated.exit_type === "TERMINATION" ? "TERMINATED" : "RESIGNED",
    input.actorId
  );
  await emitSafe({
    organizationId: input.organizationId,
    eventType: "employee.exit.updated",
    entityType: "employee_exit",
    entityId: updated.id,
    actorId: input.actorId,
    payload: { employeeId: updated.employee_id, status: updated.status, href: "/employees/exits" },
    idempotencyKey: `employee.exit.updated:${updated.id}:${updated.status}`,
  });
  return updated;
}

export async function refreshExitLifecycle(organizationId: string, timezone: string) {
  const today = todayInZone(timezone);
  const exits = await listEmployeeExits(organizationId);
  const tasks = await listClearanceTasks(organizationId);
  for (const row of exits) {
    let status = row.status;
    if (status === "IN_NOTICE" && today >= row.last_working_date) {
      await updateEmployeeExit(row.id, { status: "CLEARANCE_PENDING" });
      await setEmployeeStatus(
        organizationId,
        row.employee_id,
        row.exit_type === "TERMINATION" ? "TERMINATED" : "RESIGNED",
        row.updated_by ?? row.created_by ?? ""
      );
      status = "CLEARANCE_PENDING";
    }
    if (status === "CLEARANCE_PENDING") {
      const summary = requiredClearanceOpen(tasks.filter((item) => item.exit_id === row.id));
      if (summary.complete) await updateEmployeeExit(row.id, { status: "SETTLEMENT_PENDING" });
    }
  }
}

export async function updateClearanceTaskStatus(input: {
  organizationId: string;
  taskId: string;
  actorId: string;
  status: ClearanceTaskStatus;
  remarks?: string;
  timezone: string;
}) {
  const tasks = await listClearanceTasks(input.organizationId);
  const task = tasks.find((item) => item.id === input.taskId);
  if (!task) throw new Error("Clearance task not found.");
  const now = stamp();
  const completed = input.status === "CLEARED" || input.status === "NOT_APPLICABLE";
  const updated = await updateClearanceTask(input.taskId, {
    status: input.status,
    remarks: input.remarks || null,
    completed_by: completed ? input.actorId : null,
    completed_at: completed ? now : null,
  });
  if (!updated) throw new Error("Clearance task not found.");
  await refreshExitLifecycle(input.organizationId, input.timezone);
  return updated;
}

export async function cancelEmployeeExit(input: {
  organizationId: string;
  exitId: string;
  actorId: string;
  reason: string;
}) {
  const exits = await listEmployeeExits(input.organizationId);
  const row = exits.find((item) => item.id === input.exitId);
  if (!row) throw new Error("Exit not found.");
  if (row.status === "SETTLED") throw new Error("Settled exits cannot be cancelled.");
  const updated = await updateEmployeeExit(input.exitId, {
    status: "CANCELLED",
    cancelled_at: stamp(),
    cancel_reason: input.reason,
    updated_by: input.actorId,
  });
  if (!updated) throw new Error("Exit not found.");
  await setEmployeeStatus(input.organizationId, row.employee_id, "ACTIVE", input.actorId);
  return updated;
}

export async function markExitSettled(organizationId: string, exitId: string, actorId: string) {
  return updateEmployeeExit(exitId, { status: "SETTLED", updated_by: actorId });
}

export async function employeeExcludedFromOrdinaryPayroll(organizationId: string, employeeId: string, periodFrom: string) {
  const exits = await listEmployeeExits(organizationId);
  return exits.some((item) => exitBlocksOrdinaryPayroll(item, employeeId, periodFrom));
}

export { asBool, asNumber };
