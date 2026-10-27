import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { SettingsSubscriptionSubnav } from "@/components/billing/subnav";
import { SubscriptionBadge } from "@/components/billing/status-badge";
import {
  BillingProfileForm,
  CancelSubscriptionForm,
  ChangePlanForm,
  StartSubscriptionForm,
} from "@/components/billing/subscription-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadOrgBilling } from "@/lib/billing/query";
import { USAGE_METRIC_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Subscription" };

export default async function SettingsSubscriptionPage() {
  const user = await requirePermissionOrRedirect("subscriptions.view");
  const data = await loadOrgBilling(user.organization.id);
  const canManage = hasPermission(user, "subscriptions.manage");
  const canEditProfile = hasPermission(user, "organization.edit");

  return (
    <div>
      <PageHeader
        title="Subscription"
        description="Organization plan, trial, and usage. Subscription billing is separate from employee salary payments."
      />
      <SettingsSubnav pathname="/settings/subscription" />
      <SettingsSubscriptionSubnav />
      {!data.settings.tax_configured ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Tax configuration is incomplete. Invoices will not claim GST-compliant tax.
        </p>
      ) : null}
      <p className="mb-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
        {data.provider.message}
      </p>
      {data.subscription ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Status</CardTitle></CardHeader>
            <CardContent><SubscriptionBadge status={data.subscription.status} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Plan</CardTitle></CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{data.subscription.plan_name}</p>
              <p className="text-xs text-slate-500">{data.subscription.plan_code} · {data.subscription.billing_cycle.toLowerCase()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Price snapshot</CardTitle></CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{formatCurrency(data.subscription.unit_price, data.subscription.currency)}</p>
              <p className="text-xs text-slate-500">Locked for this period. Plan edits do not rewrite it.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Period</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm">{formatDateOnly(data.subscription.current_period_start)} – {formatDateOnly(data.subscription.current_period_end)}</p>
              <p className="text-xs text-slate-500">Renews {formatDateOnly(data.subscription.renews_at)}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="mb-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          No subscription is assigned. Limits are not enforced until a plan is selected.
        </p>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.usage.map((row) => (
          <Card key={row.metric_key}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">{USAGE_METRIC_LABELS[row.metric_key]}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{row.quantity}{row.limit_value !== null ? ` / ${row.limit_value}` : ""}</p>
              <p className="text-xs text-slate-500">{row.remaining === null ? "Unlimited" : `${row.remaining} remaining`}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {canManage ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {data.subscription ? (
            <>
              <ChangePlanForm plans={data.plans} currentPlanId={data.subscription.plan_id} />
              <CancelSubscriptionForm />
            </>
          ) : (
            <StartSubscriptionForm plans={data.plans} />
          )}
        </div>
      ) : null}
      <div className="mt-6">
        <BillingProfileForm profile={data.profile} canEdit={canEditProfile} />
      </div>
      {data.history.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{row.event_type}</td>
                  <td className="px-4 py-3">{row.from_status || row.from_plan_code || "—"}</td>
                  <td className="px-4 py-3">{row.to_status || row.to_plan_code || "—"}</td>
                  <td className="px-4 py-3">{formatDateOnly(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
