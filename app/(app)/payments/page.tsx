import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { PaymentsSubnav } from "@/components/payments/subnav";
import { PaymentBatchBadge } from "@/components/payments/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadPaymentsOverview } from "@/lib/payments/query";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import { periodLabel } from "@/lib/payroll/engine";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const user = await requirePermissionOrRedirect("payments.view");
  const overview = await loadPaymentsOverview(user.organization.id);
  const canCreate = hasPermission(user, "payments.create");

  return (
    <div>
      <PageHeader
        title="Salary payments"
        description="Payment batches from finalized payroll. Bank-file export is an instruction, not proof of payment. Payroll finalization is not paid."
        actions={
          canCreate ? (
            <Link href="/payments/new">
              <Button>New batch</Button>
            </Link>
          ) : null
        }
      />
      <PaymentsSubnav />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.batches.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Ready / approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.ready}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Exported (not paid)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.exported}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Paid / partial</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.paid}</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        {overview.batches.length === 0 ? (
          <EmptyState title="No payment batches" description="Create a batch from a finalized payroll run. Exporting a bank file does not mark salaries paid." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Payment date</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Employees</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {overview.batches.map((batch) => (
                  <tr key={batch.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/payments/${batch.id}`} className="font-medium text-brand-700 hover:underline">
                        {periodLabel(batch.period)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatDateOnly(batch.payment_date)}</td>
                    <td className="px-4 py-3">{PAYMENT_METHOD_LABELS[batch.payment_method]}</td>
                    <td className="px-4 py-3">{batch.total_employees}</td>
                    <td className="px-4 py-3">{formatCurrency(batch.total_amount)}</td>
                    <td className="px-4 py-3">
                      <PaymentBatchBadge status={batch.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
