import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { PaymentsSubnav } from "@/components/payments/subnav";
import { PaymentItemBadge } from "@/components/payments/status-badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { listTransactions } from "@/lib/payments/repository";
import { formatCurrency, formatDateOnly, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Payment history" };

export default async function PaymentHistoryPage() {
  const user = await requirePermissionOrRedirect("payments.view");
  const transactions = await listTransactions(user.organization.id);

  return (
    <div>
      <PageHeader title="Payment history" description="Outcome history is appended. Item status is the latest row; earlier attempts stay here." />
      <PaymentsSubnav />
      {transactions.length === 0 ? (
        <EmptyState title="No outcomes yet" description="Record a manual outcome or confirm a bank-result import on a payment batch." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Batch</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{formatDateTime(row.created_at)}</td>
                  <td className="px-4 py-3">{formatDateOnly(row.payment_date)}</td>
                  <td className="px-4 py-3">{formatCurrency(row.amount)}</td>
                  <td className="px-4 py-3">
                    <PaymentItemBadge status={row.status === "RECONCILED" ? "RECONCILED" : row.status === "SUCCESS" ? "SUCCESS" : row.status === "REVERSED" ? "REVERSED" : "FAILED"} />
                  </td>
                  <td className="px-4 py-3">{row.bank_reference ?? row.reference ?? "—"}</td>
                  <td className="px-4 py-3">{row.source}</td>
                  <td className="px-4 py-3">
                    <Link href={`/payments/${row.batch_id}`} className="text-brand-700 hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
