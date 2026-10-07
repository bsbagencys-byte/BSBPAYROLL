import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ComplianceSubnav } from "@/components/compliance/subnav";
import { ComplianceFilingBadge } from "@/components/payroll/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadComplianceOverview } from "@/lib/payroll/query";
import { STATUTORY_HEAD_LABELS } from "@/lib/constants";
import { periodLabel } from "@/lib/payroll/engine";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Compliance" };

export default async function CompliancePage() {
  const user = await requirePermissionOrRedirect("compliance.view");
  const overview = await loadComplianceOverview(user.organization.id);

  return (
    <div>
      <PageHeader
        title="Compliance"
        description="PF, ESI, PT and TDS summaries generated when a payroll run is processed."
      />
      <ComplianceSubnav />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(["PF", "ESI", "PT", "TDS"] as const).map((head) => {
          const filing = overview.filings.find((item) => item.head === head);
          return (
            <Card key={head}>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-500">{STATUTORY_HEAD_LABELS[head]}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatCurrency(filing?.total_amount ?? 0)}</p>
                <p className="text-xs text-slate-500">{filing ? `${filing.employee_count} employees` : "No filing yet"}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          {overview.latest ? `Latest processed · ${periodLabel(overview.latest.period)}` : "Filings"}
        </h2>
        {overview.filings.length === 0 ? (
          <EmptyState title="No filings" description="Process a payroll run to generate PF, ESI, PT and TDS summaries." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Head</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Employees</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Employer</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {overview.filings.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/compliance/${item.head.toLowerCase()}`} className="font-medium text-brand-700 hover:underline">
                        {STATUTORY_HEAD_LABELS[item.head]}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{periodLabel(item.period)}</td>
                    <td className="px-4 py-3">{item.employee_count}</td>
                    <td className="px-4 py-3">{formatCurrency(item.employee_amount)}</td>
                    <td className="px-4 py-3">{formatCurrency(item.employer_amount)}</td>
                    <td className="px-4 py-3">{formatCurrency(item.total_amount)}</td>
                    <td className="px-4 py-3">
                      <ComplianceFilingBadge status={item.status} />
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
