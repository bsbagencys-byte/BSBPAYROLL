import { PageHeader } from "@/components/layout/app-shell";
import { AnalyticsSubnav } from "@/components/analytics/subnav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadAnalyticsSnapshot } from "@/lib/analytics/metrics";
import { currentPeriod } from "@/lib/payroll/engine";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Payroll variance" };

function first(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AnalyticsVariancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermissionOrRedirect("analytics.view");
  const params = await searchParams;
  const period = first(params, "period") || currentPeriod(user.organization.timezone);
  const snapshot = await loadAnalyticsSnapshot(user.organization.id, user.organization.timezone, period);
  const canExport = hasPermission(user, "analytics.export");
  const csvHref = `/api/analytics/variance?period=${encodeURIComponent(snapshot.period)}`;

  return (
    <div>
      <PageHeader
        title="Payroll variance"
        description={`Employee net and gross versus ${snapshot.previousLabel}. Comparison uses stored payroll items only.`}
        actions={
          canExport ? (
            <a href={csvHref}>
              <Button variant="outline">Download CSV</Button>
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
        <p className="mb-4 text-sm text-amber-800">Selected payroll run is draft or in progress. Historical comparison uses finalized, locked, processed or paid runs only.</p>
      ) : null}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          {snapshot.variance.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No payroll items for this period.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Net</th>
                  <th className="px-4 py-3">Delta</th>
                  <th className="px-4 py-3">Gross</th>
                  <th className="px-4 py-3">LOP</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.variance.map((row) => (
                  <tr key={row.employeeId} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.employeeName}</p>
                      <p className="text-xs text-slate-500">{row.employeeCode}</p>
                      {row.draft ? <Badge variant="warning">Draft</Badge> : null}
                    </td>
                    <td className="px-4 py-3">{row.departmentName}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(row.currentNet)}
                      {row.previousNet != null ? <span className="text-xs text-slate-500"> / {formatCurrency(row.previousNet)}</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      {row.delta != null ? formatCurrency(row.delta) : "—"}
                      {row.deltaPercent != null ? <span className="text-xs text-slate-500"> ({row.deltaPercent}%)</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(row.currentGross)}
                      {row.previousGross != null ? <span className="text-xs text-slate-500"> / {formatCurrency(row.previousGross)}</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      {row.currentLop}
                      {row.previousLop != null ? <span className="text-xs text-slate-500"> / {row.previousLop}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
