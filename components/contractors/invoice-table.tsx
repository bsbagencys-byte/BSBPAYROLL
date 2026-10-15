import Link from "next/link";
import { InvoiceStatusBadge } from "@/components/contractors/status-badge";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import type { InvoiceListItem } from "@/types";

export function InvoiceTable({ items }: { items: InvoiceListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Invoice</th>
            <th className="px-4 py-2">Contractor</th>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Gross</th>
            <th className="px-4 py-2">Withholding</th>
            <th className="px-4 py-2">Net</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.invoice.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-4 py-2">
                <Link href={`/contractor-payments/${item.invoice.id}`} className="font-medium text-brand-700 hover:underline">
                  {item.invoice.invoice_number}
                </Link>
              </td>
              <td className="px-4 py-2">
                <p>{item.contractorName}</p>
                <p className="text-xs text-slate-500">{item.contractorCode}</p>
              </td>
              <td className="px-4 py-2">{formatDateOnly(item.invoice.invoice_date)}</td>
              <td className="px-4 py-2">{formatCurrency(item.invoice.gross_amount)}</td>
              <td className="px-4 py-2">{formatCurrency(item.invoice.withholding_amount)}</td>
              <td className="px-4 py-2">{formatCurrency(item.invoice.net_payable)}</td>
              <td className="px-4 py-2">
                <InvoiceStatusBadge status={item.invoice.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
