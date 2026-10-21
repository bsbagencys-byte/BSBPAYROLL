import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { AccountingSubnav } from "@/components/accounting/subnav";
import { JournalBadge } from "@/components/accounting/status-badge";
import { GenerateJournalForm } from "@/components/accounting/journal-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadAccountingOverview } from "@/lib/accounting/query";
import { listPayrollRuns } from "@/lib/payroll/repository";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import { periodLabel } from "@/lib/payroll/engine";

export const metadata = { title: "Accounting" };

export default async function AccountingPage() {
  const user = await requirePermissionOrRedirect("accounting.journal.view");
  const [overview, runs] = await Promise.all([
    loadAccountingOverview(user.organization.id),
    listPayrollRuns(user.organization.id),
  ]);
  const canManage = hasPermission(user, "accounting.manage");
  const finalized = runs.filter((row) => ["FINALIZED", "LOCKED", "PROCESSED", "PAID"].includes(row.status));

  return (
    <div>
      <PageHeader
        title="Accounting"
        description="Payroll journals from finalized snapshots. Unmapped components block export. Debit must equal credit. This is not Tally or Zoho."
        actions={
          canManage ? (
            <Link href="/accounting/mappings">
              <Button variant="outline">Mappings</Button>
            </Link>
          ) : null
        }
      />
      <AccountingSubnav />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Ledger accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.accounts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Active mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.mappings.filter((row) => row.mapping.active).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Journals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.journals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Exports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.exports.length}</p>
          </CardContent>
        </Card>
      </div>
      {canManage || hasPermission(user, "accounting.journal.export") ? (
        <div className="mt-6">
          <GenerateJournalForm runs={finalized} />
        </div>
      ) : null}
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Recent journals</h2>
        {overview.journals.length === 0 ? (
          <EmptyState title="No journals" description="Generate a journal from a finalized payroll run." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Debit</th>
                  <th className="px-4 py-3">Credit</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {overview.journals.slice(0, 8).map((journal) => (
                  <tr key={journal.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/accounting/${journal.id}`} className="font-medium text-brand-700 hover:underline">
                        {journal.reference_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{periodLabel(journal.period)}</td>
                    <td className="px-4 py-3">{formatDateOnly(journal.journal_date)}</td>
                    <td className="px-4 py-3">{formatCurrency(journal.total_debit)}</td>
                    <td className="px-4 py-3">{formatCurrency(journal.total_credit)}</td>
                    <td className="px-4 py-3">
                      <JournalBadge status={journal.status} />
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
