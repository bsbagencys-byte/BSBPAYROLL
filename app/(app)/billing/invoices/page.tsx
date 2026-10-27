import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { BillingSubnav } from "@/components/billing/subnav";
import { InvoiceBadge } from "@/components/billing/status-badge";
import { CheckoutButton } from "@/components/billing/subscription-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadOrgBilling } from "@/lib/billing/query";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Billing invoices" };

export default async function BillingInvoicesPage() {
  const user = await requirePermissionOrRedirect("billing.view");
  const data = await loadOrgBilling(user.organization.id);
  const payable = data.invoices.filter((row) => ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(row.status));

  return (
    <div>
      <PageHeader
        title="Subscription invoices"
        description="SaaS invoices for this organization. These are not employee salary payment batches."
      />
      <BillingSubnav />
      <p className="mb-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">{data.provider.message}</p>
      {!data.settings.tax_configured ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Tax configuration is incomplete. These invoices do not claim GST-compliant tax.
        </p>
      ) : null}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Invoices</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{data.invoices.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Outstanding</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(data.invoices.reduce((sum, row) => sum + row.outstanding, 0), user.organization.currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Payable</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{payable.length}</p></CardContent>
        </Card>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/billing/invoices/${row.id}`} className="text-brand-700">{row.invoice_number}</Link>
                </td>
                <td className="px-4 py-3">{row.plan_name}</td>
                <td className="px-4 py-3">{formatDateOnly(row.period_start)} – {formatDateOnly(row.period_end)}</td>
                <td className="px-4 py-3">{formatCurrency(row.total, row.currency)}</td>
                <td className="px-4 py-3"><InvoiceBadge status={row.status} /></td>
                <td className="px-4 py-3">
                  <CheckoutButton invoiceId={row.id} payable={["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(row.status) && row.outstanding > 0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
