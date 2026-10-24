import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { AnalyticsSubnav } from "@/components/analytics/subnav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadAnalyticsSnapshot } from "@/lib/analytics/metrics";
import { listAnalyticsAlerts } from "@/lib/analytics/repository";
import { currentPeriod } from "@/lib/payroll/engine";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Analytics" };

function first(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermissionOrRedirect("analytics.view");
  const params = await searchParams;
  const period = first(params, "period") || currentPeriod(user.organization.timezone);
  const [snapshot, alerts] = await Promise.all([
    loadAnalyticsSnapshot(user.organization.id, user.organization.timezone, period),
    listAnalyticsAlerts(user.organization.id),
  ]);
  const canExport = hasPermission(user, "analytics.export");
  const csvHref = `/api/analytics/kpis?period=${encodeURIComponent(snapshot.period)}`;
  const openAlerts = alerts.filter((row) => row.status === "OPEN" || row.status === "ACKNOWLEDGED" || row.status === "INVESTIGATING");
  const maxCost = Math.max(...snapshot.costSeries.map((item) => item.value), 1);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Explainable metrics from stored payroll, leave, claims, loans and biometric data. Draft runs are labelled. Late, OT and punch-based LOP wait for Phase 4."
        actions={
          canExport ? (
            <a href={csvHref}>
              <Button variant="outline">Download KPIs CSV</Button>
            </a>
          ) : null
        }
      />
      <AnalyticsSubnav />
      <form className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="period">Period</Label>
          <Input id="period" name="period" type="month" defaultValue={snapshot.period} className="w-44" />
        </div>
        <Button type="submit" variant="outline">
          Apply
        </Button>
      </form>
      {snapshot.current.draft ? (
        <p className="mb-4 text-sm text-amber-800">Selected payroll run is draft or in progress. Historical totals use finalized, locked, processed or paid runs only.</p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.kpis.slice(0, 8).map((kpi) => (
          <Card key={kpi.key}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{kpi.display}</p>
              <p className="mt-1 text-xs text-slate-500">{kpi.source}</p>
              {kpi.draft ? <Badge variant="warning" className="mt-2">Draft</Badge> : null}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payroll cost by period</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshot.costSeries.length === 0 ? (
              <p className="text-sm text-slate-500">No payroll runs yet.</p>
            ) : (
              <ul className="space-y-2">
                {snapshot.costSeries.map((point) => (
                  <li key={point.period}>
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {point.label}
                        {point.draft ? <Badge variant="warning" className="ml-2">Draft</Badge> : null}
                      </span>
                      <span>{formatCurrency(point.value)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded bg-slate-100">
                      <div className="h-2 rounded bg-brand-700" style={{ width: `${Math.max(4, (point.value / maxCost) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {openAlerts.length === 0 ? (
              <p className="text-sm text-slate-500">No open alerts. Run a scan from Anomalies.</p>
            ) : (
              <ul className="divide-y text-sm">
                {openAlerts.slice(0, 8).map((alert) => (
                  <li key={alert.id} className="py-2">
                    <Link href="/analytics/anomalies" className="font-medium text-brand-700 hover:underline">
                      {alert.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {alert.severity} · {alert.actual_value}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
