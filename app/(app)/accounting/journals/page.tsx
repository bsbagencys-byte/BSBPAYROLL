import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { AccountingSubnav } from "@/components/accounting/subnav";
import { JournalBadge } from "@/components/accounting/status-badge";
import { GenerateJournalForm } from "@/components/accounting/journal-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listJournals } from "@/lib/accounting/repository";
import { listPayrollRuns } from "@/lib/payroll/repository";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import { periodLabel } from "@/lib/payroll/engine";

export const metadata = { title: "Payroll journals" };

export default async function AccountingJournalsPage() {
  const user = await requirePermissionOrRedirect("accounting.journal.view");
  const [journals, runs] = await Promise.all([listJournals(user.organization.id), listPayrollRuns(user.organization.id)]);
  const canGenerate = hasPermission(user, "accounting.manage") || hasPermission(user, "accounting.journal.export");
  const finalized = runs.filter((row) => ["FINALIZED", "LOCKED", "PROCESSED", "PAID"].includes(row.status));

  return (
    <div>
      <PageHeader title="Journals" description="One active journal per finalized payroll run. Voided journals stay in history." />
      <AccountingSubnav />
      {canGenerate ? (
        <div className="mb-6">
          <GenerateJournalForm runs={finalized} />
        </div>
      ) : null}
      {journals.length === 0 ? (
        <EmptyState title="No journals" description="Generate a journal after payroll is finalized." />
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
                <th className="px-4 py-3">Balanced</th>
                <th className="px-4 py-3">Exports</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {journals.map((journal) => (
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
                  <td className="px-4 py-3">{journal.balanced ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{journal.export_count}</td>
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
  );
}
