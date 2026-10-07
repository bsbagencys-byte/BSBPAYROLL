import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { PayrollSubnav } from "@/components/payroll/subnav";
import { PayslipBadge } from "@/components/payroll/status-badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadPayslipViews } from "@/lib/payroll/query";
import { loadOrgCatalog } from "@/lib/org-data";
import { periodLabel } from "@/lib/payroll/engine";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Payslips" };

export default async function PayslipsPage() {
  const user = await requirePermissionOrRedirect("payroll.payslip.view");
  const canViewAll = hasPermission(user, "payroll.view");
  const catalog = canViewAll ? null : await loadOrgCatalog(user.organization.id);
  const ownEmployeeId = catalog?.employees.find((item) => item.user_id === user.id)?.id;
  const rows = await loadPayslipViews(user.organization.id, canViewAll ? undefined : ownEmployeeId);

  return (
    <div>
      <PageHeader title="Payslips" description="Numbered PDFs generated after finalization. Statutory sections are reserved." />
      <PayrollSubnav />
      {rows.length === 0 ? (
        <EmptyState title="No payslips" description="Process a locked payroll run to issue payslips." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Net</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.payslip.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/payroll/payslips/${row.payslip.id}`} className="font-medium text-brand-700 hover:underline">
                      {row.employeeName}
                    </Link>
                    <p className="text-xs text-slate-500">{row.employeeCode}</p>
                  </td>
                  <td className="px-4 py-3">{row.payslip.payslip_number ?? "—"}</td>
                  <td className="px-4 py-3">{periodLabel(row.run.period)}</td>
                  <td className="px-4 py-3">{formatCurrency(row.item.net_pay)}</td>
                  <td className="px-4 py-3">{formatDateOnly(row.payslip.issued_at?.slice(0, 10))}</td>
                  <td className="px-4 py-3">
                    <PayslipBadge status={row.payslip.status} />
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
