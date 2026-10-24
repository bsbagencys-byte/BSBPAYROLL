import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { toCsv } from "@/lib/payroll/engine";
import { loadAnalyticsSnapshot } from "@/lib/analytics/metrics";
import { listAnalyticsAlerts } from "@/lib/analytics/repository";
import { writeAudit } from "@/lib/audit";

export async function analyticsCsvResponse(kind: string, period?: string) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!hasPermission(user, "analytics.view") && !hasPermission(user, "analytics.export")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const snapshot = await loadAnalyticsSnapshot(user.organization.id, user.organization.timezone, period || undefined);
  let headers: string[] = [];
  let rows: Array<Array<string | number | boolean | null | undefined>> = [];
  let filename = "analytics.csv";

  if (kind === "kpis") {
    filename = `analytics-kpis-${snapshot.period}.csv`;
    headers = ["Key", "Label", "Value", "Display", "Source", "Draft"];
    rows = snapshot.kpis.map((item) => [item.key, item.label, item.value, item.display, item.source, item.draft]);
  } else if (kind === "variance") {
    filename = `analytics-variance-${snapshot.period}.csv`;
    headers = [
      "Employee code",
      "Employee",
      "Department",
      "Current net",
      "Previous net",
      "Delta",
      "Delta %",
      "Current gross",
      "Previous gross",
      "Current LOP",
      "Previous LOP",
      "Draft",
    ];
    rows = snapshot.variance.map((row) => [
      row.employeeCode,
      row.employeeName,
      row.departmentName,
      row.currentNet,
      row.previousNet,
      row.delta,
      row.deltaPercent,
      row.currentGross,
      row.previousGross,
      row.currentLop,
      row.previousLop,
      row.draft,
    ]);
  } else if (kind === "alerts") {
    const alerts = await listAnalyticsAlerts(user.organization.id);
    filename = "analytics-alerts.csv";
    headers = ["Title", "Rule", "Period", "Severity", "Status", "Actual", "Baseline", "Threshold", "Explanation"];
    rows = alerts.map((row) => [
      row.title,
      row.rule_code,
      row.period,
      row.severity,
      row.status,
      row.actual_value,
      row.baseline_value,
      row.threshold_value,
      row.explanation,
    ]);
  } else {
    return new Response("Unknown export", { status: 404 });
  }

  if (hasPermission(user, "analytics.export")) {
    await writeAudit({
      organizationId: user.organization.id,
      actorUserId: user.id,
      action: "analytics.export",
      entityType: "analytics_export",
      entityId: kind,
      metadata: { period: snapshot.period, rows: rows.length },
    });
  }

  return new Response(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
