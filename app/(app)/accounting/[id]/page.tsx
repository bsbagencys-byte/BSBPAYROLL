import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { AccountingSubnav } from "@/components/accounting/subnav";
import { JournalBadge } from "@/components/accounting/status-badge";
import { JournalExportForm } from "@/components/accounting/export-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { validateJournalAction } from "@/actions/accounting";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadJournalDetail } from "@/lib/accounting/query";
import { formatCurrency, formatDateOnly, formatDateTime, lookupName } from "@/lib/utils";
import { periodLabel } from "@/lib/payroll/engine";
import type { JournalIssue } from "@/lib/accounting/service";

export const metadata = { title: "Journal" };

export default async function AccountingJournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionOrRedirect("accounting.journal.view");
  const { id } = await params;
  const detail = await loadJournalDetail(user.organization.id, id);
  if (!detail) notFound();
  const journal = detail.journal;
  const canExport = hasPermission(user, "accounting.journal.export");
  const canValidate = hasPermission(user, "accounting.manage") || canExport;
  let issues: JournalIssue[] = [];
  if (journal.validation_json) {
    try {
      issues = (JSON.parse(journal.validation_json).issues ?? []) as JournalIssue[];
    } catch {
      issues = [];
    }
  }

  return (
    <div>
      <PageHeader
        title={journal.reference_number}
        description={`${periodLabel(journal.period)} · ${formatDateOnly(journal.journal_date)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <a href={`/api/accounting/journals/${journal.id}/csv`}>
              <Button variant="outline">Download CSV</Button>
            </a>
            <Link href="/accounting/journals">
              <Button variant="outline">All journals</Button>
            </Link>
          </div>
        }
      />
      <AccountingSubnav />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <JournalBadge status={journal.status} />
        {canValidate && journal.status !== "VOID" ? (
          <form action={validateJournalAction}>
            <input type="hidden" name="journalId" value={journal.id} />
            <Button type="submit" variant="outline">
              Validate
            </Button>
          </form>
        ) : null}
        {canExport && journal.status !== "VOID" ? (
          <JournalExportForm journalId={journal.id} alreadyExported={journal.export_count > 0} />
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Debit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(journal.total_debit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(journal.total_credit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{journal.balanced ? "Balanced" : "Out of balance"}</p>
            <p className="text-xs text-slate-500">Source run {detail.run ? periodLabel(detail.run.period) : journal.run_id}</p>
          </CardContent>
        </Card>
      </div>
      {issues.length ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">{issues.length} unmapped component{issues.length === 1 ? "" : "s"} block export.</p>
          <ul className="mt-2 list-disc pl-5">
            {issues.slice(0, 8).map((issue, index) => (
              <li key={`${issue.category}-${index}`}>
                {issue.employeeCode ? `${issue.employeeCode} · ` : ""}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Debit</th>
              <th className="px-4 py-3">Credit</th>
            </tr>
          </thead>
          <tbody>
            {detail.lines.map((line) => (
              <tr key={line.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{line.account_code}</p>
                  <p className="text-xs text-slate-500">{line.account_name}</p>
                </td>
                <td className="px-4 py-3">{line.description}</td>
                <td className="px-4 py-3">{lookupName(detail.branches, line.branch_id) ?? "—"}</td>
                <td className="px-4 py-3">{lookupName(detail.departments, line.department_id) ?? "—"}</td>
                <td className="px-4 py-3">{line.debit ? formatCurrency(line.debit) : ""}</td>
                <td className="px-4 py-3">{line.credit ? formatCurrency(line.credit) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detail.exports.length ? (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Export history</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Rows</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {detail.exports.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{formatDateTime(row.created_at)}</td>
                    <td className="px-4 py-3">{row.row_count}</td>
                    <td className="px-4 py-3">{row.notes ?? (row.duplicate_of ? "Duplicate" : "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
