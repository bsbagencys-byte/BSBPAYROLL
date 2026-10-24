import { PageHeader } from "@/components/layout/app-shell";
import { AnalyticsSubnav } from "@/components/analytics/subnav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listAnalyticsAlerts, listAnalyticsThresholds, listRefreshJobs } from "@/lib/analytics/repository";
import { ScanForm } from "@/components/analytics/scan-form";
import { AlertStatusForm } from "@/components/analytics/alert-status-form";
import { ThresholdForm } from "@/components/analytics/threshold-form";
import {
  ANALYTICS_ALERT_SEVERITY_LABELS,
  ANALYTICS_ALERT_STATUS_LABELS,
  ANALYTICS_RULE_CODES,
  DEFAULT_ANALYTICS_THRESHOLDS,
  type AnalyticsAlertSeverity,
  type AnalyticsRuleCode,
} from "@/lib/constants";
import { currentPeriod } from "@/lib/payroll/engine";

export const metadata = { title: "Anomalies" };

const severityVariant: Record<AnalyticsAlertSeverity, "muted" | "warning" | "danger"> = {
  LOW: "muted",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

function first(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AnalyticsAnomaliesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermissionOrRedirect("analytics.view");
  const params = await searchParams;
  const period = first(params, "period") || currentPeriod(user.organization.timezone);
  const [alerts, thresholds, jobs] = await Promise.all([
    listAnalyticsAlerts(user.organization.id),
    listAnalyticsThresholds(user.organization.id),
    listRefreshJobs(user.organization.id),
  ]);
  const canManage = hasPermission(user, "analytics.alerts.manage");
  const canThresholds = hasPermission(user, "analytics.thresholds.manage");
  const canExport = hasPermission(user, "analytics.export");
  const csvHref = "/api/analytics/alerts";
  const thresholdByCode = new Map(thresholds.map((row) => [row.rule_code, row]));

  return (
    <div>
      <PageHeader
        title="Anomaly detection"
        description="Deterministic rules on stored data. Alerts never mutate attendance, salaries, deductions, payroll or payments."
        actions={
          <div className="flex flex-wrap gap-2">
            {canExport ? (
              <a href={csvHref}>
                <Button variant="outline">Download alerts CSV</Button>
              </a>
            ) : null}
            {canManage ? <ScanForm period={period} /> : null}
          </div>
        }
      />
      <AnalyticsSubnav />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-500">No alerts yet. Scan stored payroll and operational data.</p>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{alert.title}</p>
                    <Badge variant={severityVariant[alert.severity]}>{ANALYTICS_ALERT_SEVERITY_LABELS[alert.severity]}</Badge>
                    <Badge variant="muted">{ANALYTICS_ALERT_STATUS_LABELS[alert.status]}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{alert.explanation}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Condition: {alert.condition_text}. Actual {alert.actual_value}
                    {alert.baseline_value ? ` · baseline ${alert.baseline_value}` : ""} · threshold {alert.threshold_value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{alert.recommended_action}</p>
                  {canManage ? <AlertStatusForm alertId={alert.id} status={alert.status} /> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Thresholds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ANALYTICS_RULE_CODES.map((code) => {
                const row = thresholdByCode.get(code);
                return (
                  <ThresholdForm
                    key={code}
                    ruleCode={code as AnalyticsRuleCode}
                    value={row?.threshold_value ?? DEFAULT_ANALYTICS_THRESHOLDS[code]}
                    canEdit={canThresholds}
                  />
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent scans</CardTitle>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <p className="text-sm text-slate-500">No scans yet.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {jobs.slice(0, 6).map((job) => (
                    <li key={job.id} className="flex justify-between py-2">
                      <span>{job.status}</span>
                      <span className="text-xs text-slate-500">{job.created_at.slice(0, 16)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
