import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { AdminSubscriptionSubnav } from "@/components/billing/subnav";
import { InvoiceBadge, PaymentBadge, PlanBadge, SubscriptionBadge } from "@/components/billing/status-badge";
import { OverrideSubscriptionForm } from "@/components/billing/subscription-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { loadAdminBilling } from "@/lib/billing/query";
import { listOrganizationsLite } from "@/lib/billing/repository";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Subscriptions" };

function first(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const organizationId = first(params, "organizationId");
  const planId = first(params, "planId");
  const status = first(params, "status");
  const paymentStatus = first(params, "paymentStatus");
  const [data, orgs] = await Promise.all([
    loadAdminBilling({ organizationId, planId, status, paymentStatus }),
    listOrganizationsLite(),
  ]);
  const orgName = (id: string) => orgs.find((item) => item.id === id)?.name ?? id;

  return (
    <div>
      <PageHeader
        title="Subscription administration"
        description="Platform-only. Customer payroll and salary payment batches are separate from this billing register."
      />
      <AdminSubscriptionSubnav />
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-3 text-sm">
            <select name="organizationId" defaultValue={organizationId ?? ""} className="h-10 rounded-md border border-slate-200 px-3">
              <option value="">All organizations</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
            <select name="planId" defaultValue={planId ?? ""} className="h-10 rounded-md border border-slate-200 px-3">
              <option value="">All plans</option>
              {data.plans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.name}</option>
              ))}
            </select>
            <select name="status" defaultValue={status ?? ""} className="h-10 rounded-md border border-slate-200 px-3">
              <option value="">All statuses</option>
              {["TRIAL", "ACTIVE", "PAST_DUE", "GRACE_PERIOD", "SUSPENDED", "CANCELLED", "EXPIRED"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select name="paymentStatus" defaultValue={paymentStatus ?? ""} className="h-10 rounded-md border border-slate-200 px-3">
              <option value="">All payments</option>
              {["PENDING", "FAILED", "SUCCESS", "REFUNDED"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button className="h-10 rounded-md bg-brand-700 px-4 text-white" type="submit">Filter</button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Subscriptions</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{data.subscriptions.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Invoices</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{data.invoices.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Failed payments</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{data.payments.filter((row) => row.status === "FAILED").length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Provider</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-slate-600">{data.provider.message}</p></CardContent>
        </Card>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Renews</th>
            </tr>
          </thead>
          <tbody>
            {data.subscriptions.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3">{orgName(row.organization_id)}</td>
                <td className="px-4 py-3">{row.plan_name}</td>
                <td className="px-4 py-3"><SubscriptionBadge status={row.status} /></td>
                <td className="px-4 py-3">{formatDateOnly(row.current_period_start)} – {formatDateOnly(row.current_period_end)}</td>
                <td className="px-4 py-3">{formatDateOnly(row.renews_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Plans</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {data.plans.map((plan) => (
                <li key={plan.id} className="flex items-center justify-between py-2">
                  <span>{plan.name} ({plan.code})</span>
                  <PlanBadge status={plan.status} />
                </li>
              ))}
            </ul>
            <Link href="/admin/subscriptions/plans" className="mt-3 inline-block text-sm text-brand-700">Manage plans</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Failed payments</CardTitle></CardHeader>
          <CardContent>
            {data.payments.filter((row) => row.status === "FAILED").length === 0 ? (
              <p className="text-sm text-slate-500">No failed payments.</p>
            ) : (
              <ul className="divide-y text-sm">
                {data.payments.filter((row) => row.status === "FAILED").map((row) => (
                  <li key={row.id} className="flex items-center justify-between py-2">
                    <span>{formatCurrency(row.amount, row.currency)} · {row.failure_reason || "Failed"}</span>
                    <PaymentBadge status={row.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      {organizationId ? (
        <div className="mt-6">
          <OverrideSubscriptionForm organizationId={organizationId} />
        </div>
      ) : null}
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due</th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3">{row.invoice_number}</td>
                <td className="px-4 py-3">{orgName(row.organization_id)}</td>
                <td className="px-4 py-3">{formatCurrency(row.total, row.currency)}</td>
                <td className="px-4 py-3"><InvoiceBadge status={row.status} /></td>
                <td className="px-4 py-3">{formatDateOnly(row.due_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
