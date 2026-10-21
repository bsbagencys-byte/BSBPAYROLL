"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { flattenErrors } from "@/lib/form-errors";
import { recordReportExport, runReport, type ReportFilters } from "@/lib/reports/query";
import { reportByKey, type ReportKey } from "@/lib/reports/catalog";
import { reportKeySchema } from "@/lib/validations/reports";
import type { ActionResult } from "@/types";

function filtersFrom(data: {
  period?: string;
  from?: string;
  to?: string;
  branchId?: string;
  departmentId?: string;
  employeeId?: string;
  status?: string;
}): ReportFilters {
  return {
    period: data.period || undefined,
    from: data.from || undefined,
    to: data.to || undefined,
    branchId: data.branchId || undefined,
    departmentId: data.departmentId || undefined,
    employeeId: data.employeeId || undefined,
    status: data.status || undefined,
  };
}

export async function recordReportExportAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { success: false, message: "Sign in required." };
  if (!hasPermission(user, "reports.export")) return { success: false, message: "You do not have permission for this action." };
  const parsed = reportKeySchema.safeParse({
    key: formData.get("key"),
    period: formData.get("period"),
    from: formData.get("from"),
    to: formData.get("to"),
    branchId: formData.get("branchId"),
    departmentId: formData.get("departmentId"),
    employeeId: formData.get("employeeId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error), message: "Report is required." };
  const def = reportByKey(parsed.data.key);
  if (!def) return { success: false, message: "Unknown report." };
  if (!hasPermission(user, def.permission) && !hasPermission(user, "reports.view")) {
    return { success: false, message: "You do not have permission to export this report." };
  }
  try {
    const filters = filtersFrom(parsed.data);
    const table = await runReport(user.organization.id, def.key as ReportKey, filters, user.organization.timezone);
    await recordReportExport({
      organizationId: user.organization.id,
      reportKey: def.key,
      filters,
      rowCount: table.rows.length,
      actorId: user.id,
    });
    await writeAudit({
      organizationId: user.organization.id,
      actorUserId: user.id,
      action: "reports.export",
      entityType: "report_export_job",
      entityId: def.key,
      metadata: { rowCount: table.rows.length },
    });
    revalidatePath("/reports");
    revalidatePath(`/reports/${def.key}`);
    return { success: true, message: "CSV export recorded." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not export report." };
  }
}
