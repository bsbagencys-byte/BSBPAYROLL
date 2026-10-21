import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { toCsv } from "@/lib/payroll/engine";
import { recordReportExport, runReport, type ReportFilters } from "@/lib/reports/query";
import { reportByKey, type ReportKey } from "@/lib/reports/catalog";

export async function reportCsvResponse(key: string, filters: ReportFilters) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!hasPermission(user, "reports.view") && !hasPermission(user, "reports.export")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const def = reportByKey(key);
  if (!def) return new Response("Unknown report", { status: 404 });
  if (!hasPermission(user, def.permission) && !hasPermission(user, "reports.view")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const table = await runReport(user.organization.id, def.key as ReportKey, filters, user.organization.timezone);
  if (hasPermission(user, "reports.export")) {
    await recordReportExport({
      organizationId: user.organization.id,
      reportKey: def.key,
      filters,
      rowCount: table.rows.length,
      actorId: user.id,
    });
  }
  const csv = toCsv(table.headers, table.rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${def.key.replace(/\./g, "-")}.csv"`,
    },
  });
}
