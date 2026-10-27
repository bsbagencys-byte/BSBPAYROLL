import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { BillingSubnav } from "@/components/billing/subnav";
import { InvoiceBadge } from "@/components/billing/status-badge";
import { CheckoutButton, VoidInvoiceButton } from "@/components/billing/subscription-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadInvoiceDetail } from "@/lib/billing/query";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Invoice" };

export default async function BillingInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionOrRedirect("billing.view");
  const { id } = await params;
  const detail = await loadInvoiceDetail(user.organization.id, id);
  if (!detail) notFound();
  const { invoice, lines } = detail;
  const canVoid = user.roleCode === "SUPER_ADMIN" && hasPermission(user, "billing.invoice.manage");
  const payable = ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status) && invoice.outstanding > 0;

  return (
    <div>
      <PageHeader
        title={invoice.invoice_number}
        description={`${invoice.plan_name} · ${formatDateOnly(invoice.period_start)} – ${formatDateOnly(invoice.period_end)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <a href={`/api/billing/invoices/${invoice.id}/pdf`}>
              <Button variant="outline">Download PDF</Button>
            </a>
            <Link href="/billing/invoices">
              <Button variant="outline">All invoices</Button>
            </Link>
          </div>
        }
      />
      <BillingSubnav />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <InvoiceBadge status={invoice.status} />
        <CheckoutButton invoiceId={invoice.id} payable={payable} />
        {canVoid && invoice.status !== "VOID" && invoice.status !== "PAID" ? <VoidInvoiceButton invoiceId={invoice.id} /> : null}
      </div>
      {!invoice.tax_configured ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Tax configuration is incomplete. This invoice does not claim GST-compliant tax.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Total</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatCurrency(invoice.total, invoice.currency)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Paid</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatCurrency(invoice.amount_paid, invoice.currency)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Outstanding</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatCurrency(invoice.outstanding, invoice.currency)}</p></CardContent>
        </Card>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b last:border-0">
                <td className="px-4 py-3">{line.description}</td>
                <td className="px-4 py-3">{formatCurrency(line.amount, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-slate-500">Due {formatDateOnly(invoice.due_date)}. Issued invoices keep this snapshot if the plan price later changes.</p>
    </div>
  );
}
