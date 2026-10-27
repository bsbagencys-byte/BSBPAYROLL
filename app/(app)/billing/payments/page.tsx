import { PageHeader } from "@/components/layout/app-shell";
import { BillingSubnav } from "@/components/billing/subnav";
import { PaymentBadge } from "@/components/billing/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadOrgBilling } from "@/lib/billing/query";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Billing payments" };

export default async function BillingPaymentsPage() {
  const user = await requirePermissionOrRedirect("billing.payment.view");
  const data = await loadOrgBilling(user.organization.id);

  return (
    <div>
      <PageHeader
        title="Subscription payments"
        description="Provider-verified charges only. Browser success cannot mark an invoice paid. Separate from employee salary payment batches."
      />
      <BillingSubnav />
      <p className="mb-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">{data.provider.message}</p>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Transactions</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{data.payments.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Verified</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{data.payments.filter((row) => row.verified).length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Failed</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{data.payments.filter((row) => row.status === "FAILED").length}</p></CardContent>
        </Card>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {data.payments.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3">{row.provider} {row.provider_payment_id ? `· ${row.provider_payment_id}` : ""}</td>
                <td className="px-4 py-3">{formatCurrency(row.amount, row.currency)}</td>
                <td className="px-4 py-3"><PaymentBadge status={row.status} /></td>
                <td className="px-4 py-3">{row.verified ? "Yes" : "No"}</td>
                <td className="px-4 py-3">{formatDateTime(row.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
