import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { loadInvoiceDetail } from "@/lib/billing/query";
import { buildBillingInvoicePdf } from "@/lib/billing/pdf";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!hasPermission(user, "billing.view") && user.roleCode !== "SUPER_ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;
  const detail = await loadInvoiceDetail(user.organization.id, id);
  if (!detail) return new Response("Not found", { status: 404 });
  const { invoice, lines } = detail;
  if (invoice.organization_id !== user.organization.id && user.roleCode !== "SUPER_ADMIN") {
    return new Response("Not found", { status: 404 });
  }
  const seller = JSON.parse(invoice.seller_snapshot_json || "{}") as Record<string, string | null>;
  const customer = JSON.parse(invoice.customer_snapshot_json || "{}") as Record<string, string | null>;
  const pdf = buildBillingInvoicePdf({
    invoiceNumber: invoice.invoice_number,
    status: invoice.status,
    issuedAt: invoice.issued_at ? formatDateOnly(invoice.issued_at) : "—",
    dueDate: formatDateOnly(invoice.due_date),
    period: `${formatDateOnly(invoice.period_start)} – ${formatDateOnly(invoice.period_end)}`,
    sellerName: seller.legal_name || "BSB Payroll",
    sellerAddress: [seller.address_line1, seller.city, seller.state, seller.pin].filter(Boolean).join(", "),
    sellerTax: [seller.gstin ? `GSTIN ${seller.gstin}` : null, seller.pan ? `PAN ${seller.pan}` : null]
      .filter(Boolean)
      .join("  "),
    customerName: customer.legal_name || user.organization.name,
    customerAddress: [customer.address_line1, customer.city, customer.state, customer.pin].filter(Boolean).join(", "),
    customerTax: [customer.gstin ? `GSTIN ${customer.gstin}` : null, customer.pan ? `PAN ${customer.pan}` : null]
      .filter(Boolean)
      .join("  "),
    lines: lines.map((line) => ({
      description: line.description,
      amount: formatCurrency(line.amount, invoice.currency),
    })),
    subtotal: formatCurrency(invoice.subtotal, invoice.currency),
    taxLabel: invoice.tax_label || "Tax",
    taxAmount: formatCurrency(invoice.tax_amount, invoice.currency),
    total: formatCurrency(invoice.total, invoice.currency),
    amountPaid: formatCurrency(invoice.amount_paid, invoice.currency),
    outstanding: formatCurrency(invoice.outstanding, invoice.currency),
    currency: invoice.currency,
    notes: invoice.notes || "",
    taxConfigured: invoice.tax_configured,
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoice_number}.pdf"`,
    },
  });
}
