import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { SettingsSubscriptionSubnav } from "@/components/billing/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadOrgBilling } from "@/lib/billing/query";
import { USAGE_METRIC_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Usage" };

export default async function SettingsUsagePage() {
  const user = await requirePermissionOrRedirect("billing.view");
  const data = await loadOrgBilling(user.organization.id);

  return (
    <div>
      <PageHeader
        title="Usage"
        description="Live counts against the current plan snapshot. Hitting a limit does not delete or change existing records."
      />
      <SettingsSubnav pathname="/settings/subscription" />
      <SettingsSubscriptionSubnav />
      <div className="grid gap-4 md:grid-cols-2">
        {data.usage.map((row) => (
          <Card key={row.metric_key}>
            <CardHeader>
              <CardTitle>{USAGE_METRIC_LABELS[row.metric_key]}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{row.quantity}</p>
              <p className="mt-1 text-sm text-slate-500">
                Limit {row.limit_value ?? "unlimited"} · remaining {row.remaining ?? "n/a"}
              </p>
              <p className="mt-2 text-xs text-slate-400">Measured {formatDateTime(row.measured_at)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
