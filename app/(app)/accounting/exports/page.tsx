import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { AccountingSubnav } from "@/components/accounting/subnav";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { listAccountingExports } from "@/lib/accounting/repository";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Accounting exports" };

export default async function AccountingExportsPage() {
  const user = await requirePermissionOrRedirect("accounting.journal.view");
  const exports = await listAccountingExports(user.organization.id);

  return (
    <div>
      <PageHeader title="Exports" description="Generic journal CSV history. Duplicate exports require explicit confirmation." />
      <AccountingSubnav />
      {exports.length === 0 ? (
        <EmptyState title="No exports" description="Validate a balanced journal, then export CSV." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Rows</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {exports.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{formatDateTime(row.created_at)}</td>
                  <td className="px-4 py-3">{row.kind === "JOURNAL" ? "Journal" : "Bank file"}</td>
                  <td className="px-4 py-3">
                    {row.journal_id ? (
                      <Link href={`/accounting/${row.journal_id}`} className="text-brand-700 hover:underline">
                        {row.reference ?? row.journal_id}
                      </Link>
                    ) : (
                      row.reference ?? "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{row.row_count}</td>
                  <td className="px-4 py-3">{row.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
