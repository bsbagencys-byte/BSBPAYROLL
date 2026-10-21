import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { AccountingSubnav } from "@/components/accounting/subnav";
import { LedgerAccountForm } from "@/components/accounting/account-form";
import { MappingForm } from "@/components/accounting/mapping-form";
import { Badge } from "@/components/ui/badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadMappingCatalog } from "@/lib/accounting/query";
import { ACCOUNTING_ACCOUNT_TYPE_LABELS, PAYROLL_MAPPING_CATEGORY_LABELS } from "@/lib/constants";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Account mappings" };

export default async function AccountingMappingsPage() {
  const user = await requirePermissionOrRedirect("accounting.manage");
  const catalog = await loadMappingCatalog(user.organization.id);

  return (
    <div>
      <PageHeader title="Mappings" description="Ledger accounts and payroll component mappings. Unmapped components block journal export." />
      <AccountingSubnav />
      <div className="grid gap-6 lg:grid-cols-2">
        <LedgerAccountForm />
        <MappingForm accounts={catalog.accounts} branches={catalog.branches} departments={catalog.departments} />
      </div>
      <div className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Ledger accounts</h2>
        {catalog.accounts.length === 0 ? (
          <EmptyState title="No accounts" description="Add a ledger account before mapping payroll components." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {catalog.accounts.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{row.code}</td>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">{ACCOUNTING_ACCOUNT_TYPE_LABELS[row.account_type]}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status === "ACTIVE" ? "success" : "muted"}>{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Payroll mappings</h2>
        {catalog.mappings.length === 0 ? (
          <EmptyState title="No mappings" description="Map earnings, employer contributions, deductions, reimbursements, loan recoveries and net pay." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Component</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Dr/Cr</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {catalog.mappings.map((row) => (
                  <tr key={row.mapping.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{PAYROLL_MAPPING_CATEGORY_LABELS[row.mapping.category]}</td>
                    <td className="px-4 py-3">{row.mapping.component_code ?? "Any"}</td>
                    <td className="px-4 py-3">
                      {row.accountCode} · {row.accountName}
                    </td>
                    <td className="px-4 py-3">{row.mapping.treatment}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {row.branchName ?? "All branches"} / {row.departmentName ?? "All departments"}
                    </td>
                    <td className="px-4 py-3">{formatDateOnly(row.mapping.effective_from)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.mapping.active ? "success" : "muted"}>{row.mapping.active ? "Active" : "Inactive"}</Badge>
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
