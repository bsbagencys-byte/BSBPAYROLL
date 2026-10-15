import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { ContractorsSubnav } from "@/components/contractors/subnav";
import { InvoiceStatusBadge } from "@/components/contractors/status-badge";
import { InvoiceForm } from "@/components/contractors/invoice-form";
import { InvoiceDecisionForm } from "@/components/contractors/invoice-decision-form";
import { InvoicePaymentForm } from "@/components/contractors/invoice-payment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadInvoiceDetail } from "@/lib/exits/query";
import { cancelInvoiceAction, submitInvoiceAction } from "@/actions/exits";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Contractor invoice" };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionOrRedirect("contractors.view");
  const { id } = await params;
  const detail = await loadInvoiceDetail(user.organization.id, id, user.organization.timezone);
  if (!detail.row) notFound();
  const invoice = detail.row.invoice;
  const canCreate = hasPermission(user, "contractors.invoices.create");
  const canApprove = hasPermission(user, "contractors.invoices.approve");
  const canPay = hasPermission(user, "contractors.pay");
  const outstanding = Math.max(0, invoice.net_payable - invoice.paid_amount);

  return (
    <div>
      <PageHeader
        title={invoice.invoice_number}
        description={`${detail.row.contractorName} (${detail.row.contractorCode})`}
        actions={
          <Link href="/contractor-payments">
            <Button variant="outline">Back</Button>
          </Link>
        }
      />
      <ContractorsSubnav />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Invoice</CardTitle>
              <InvoiceStatusBadge status={invoice.status} />
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Invoice date" value={formatDateOnly(invoice.invoice_date)} />
                <Detail label="Service period" value={`${formatDateOnly(invoice.service_from)} – ${formatDateOnly(invoice.service_to)}`} />
                <Detail label="Gross" value={formatCurrency(invoice.gross_amount)} />
                <Detail label="Adjustment" value={formatCurrency(invoice.adjustment_amount)} />
                <Detail label="Withholding" value={formatCurrency(invoice.withholding_amount)} />
                <Detail label="Section / version" value={invoice.withholding_section ?? invoice.rule_version_code ?? "—"} />
                <Detail label="Net payable" value={formatCurrency(invoice.net_payable)} />
                <Detail label="Paid" value={formatCurrency(invoice.paid_amount)} />
              </dl>
              {invoice.duplicate_override_reason ? (
                <p className="mt-4 text-sm text-amber-800">Duplicate override: {invoice.duplicate_override_reason}</p>
              ) : null}
            </CardContent>
          </Card>
          {canCreate && invoice.status === "DRAFT" ? (
            <InvoiceForm row={invoice} contractors={detail.contractors} engagements={detail.engagements} />
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Lines</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="min-w-full text-left text-sm">
                <tbody>
                  {detail.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <p>{item.name}</p>
                        {item.notes ? <p className="text-xs text-slate-500">{item.notes}</p> : null}
                      </td>
                      <td className="py-2 text-right">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          {canCreate && invoice.status === "DRAFT" ? (
            <Card>
              <CardHeader>
                <CardTitle>Submit</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={submitInvoiceAction}>
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <Button type="submit">Submit for approval</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
          {invoice.status === "SUBMITTED" || invoice.status === "UNDER_REVIEW" ? (
            <Card>
              <CardHeader>
                <CardTitle>Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <InvoiceDecisionForm invoiceId={invoice.id} canApprove={canApprove} />
              </CardContent>
            </Card>
          ) : null}
          {canPay && ["APPROVED", "SCHEDULED", "PARTIALLY_PAID"].includes(invoice.status) ? (
            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <InvoicePaymentForm invoiceId={invoice.id} outstanding={outstanding} />
              </CardContent>
            </Card>
          ) : null}
          {canCreate && invoice.status !== "PAID" && invoice.status !== "CANCELLED" ? (
            <Card>
              <CardHeader>
                <CardTitle>Cancel</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={cancelInvoiceAction}>
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <Button type="submit" variant="destructive">
                    Cancel invoice
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
    </div>
  );
}
