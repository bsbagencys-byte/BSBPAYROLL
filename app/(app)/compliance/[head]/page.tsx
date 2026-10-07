import { notFound } from "next/navigation";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ComplianceSubnav } from "@/components/compliance/subnav";
import { ComplianceFilingBadge } from "@/components/payroll/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { listComplianceFilings } from "@/lib/payroll/repository";
import { STATUTORY_HEADS, STATUTORY_HEAD_LABELS, type StatutoryHead } from "@/lib/constants";
import { periodLabel } from "@/lib/payroll/engine";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Compliance filing" };

export default async function ComplianceHeadPage({ params }: { params: Promise<{ head: string }> }) {
  const user = await requirePermissionOrRedirect("compliance.view");
  const { head: raw } = await params;
  const head = raw.toUpperCase() as StatutoryHead;
  if (!STATUTORY_HEADS.includes(head)) notFound();
  const filings = (await listComplianceFilings(user.organization.id)).filter((item) => item.head === head);
  const href = `/api/compliance/reports/${head.toLowerCase()}`;

  return (
    <div>
      <PageHeader
        title={STATUTORY_HEAD_LABELS[head]}
        description="Filings created when payroll is processed. Export CSV for challan preparation."
      />
      <ComplianceSubnav />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Export</CardTitle>
        </CardHeader>
        <CardContent>
          <a href={href} className="text-sm font-medium text-brand-700 hover:underline">
            Download {head} CSV
          </a>
        </CardContent>
      </Card>
      {filings.length === 0 ? (
        <EmptyState title={`No ${head} filings`} description="Process a payroll run to generate this head." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Employees</th>
                <th className="px-4 py-3">Employee amount</th>
                <th className="px-4 py-3">Employer amount</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filings.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
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
  );
}
