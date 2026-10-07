import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { PayrollSubnav } from "@/components/payroll/subnav";
import { PayrollRunForm } from "@/components/payroll/run-form";
import { PayrollItemTable } from "@/components/payroll/item-table";
import { PayrollRunBadge } from "@/components/payroll/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadPayrollOverview, toPayrollItemList } from "@/lib/payroll/query";
import { loadOrgCatalog } from "@/lib/org-data";
import { listEmployment } from "@/lib/leave/repository";
import { formatCurrency } from "@/lib/utils";
import { periodLabel } from "@/lib/payroll/engine";

export const metadata = { title: "Payroll" };

export default async function PayrollPage() {
  const user = await requirePermissionOrRedirect("payroll.view");
  const overview = await loadPayrollOverview(user.organization.id, user.organization.timezone);
  const canProcess = hasPermission(user, "payroll.process");
  const [catalog, employment] = await Promise.all([
    loadOrgCatalog(user.organization.id),
    listEmployment(user.organization.id),
  ]);
  const items = overview.latest
    ? toPayrollItemList({
        items: overview.items,
        employees: catalog.employees,
        departments: catalog.departments,
        branches: catalog.branches,
        employment,
      })
    : [];

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Monthly run using salary, leave-marked attendance days, approved claims and loan EMI. Unmarked working days count as paid until Phase 4."
        actions={
          overview.latest ? (
            <Link href={`/payroll/runs/${overview.latest.id}`}>
              <Button variant="outline">Open latest run</Button>
            </Link>
          ) : null
        }
      />
      <PayrollSubnav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Current period</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.periodLabel}</p>
            <p className="text-xs text-slate-500">{overview.period}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Latest run</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.latest ? (
              <>
                <p className="text-2xl font-semibold">{formatCurrency(overview.latest.total_net)}</p>
                <div className="mt-2">
                  <PayrollRunBadge status={overview.latest.status} />
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">No run yet</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Included</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.included.length}</p>
            <p className="text-xs text-slate-500">{overview.held.length} on hold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Employer cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(overview.latest?.employer_contributions ?? 0)}</p>
            <p className="text-xs text-slate-500">PF + ESI employer</p>
          </CardContent>
        </Card>
      </div>

      {canProcess && !overview.runs.some((item) => item.period === overview.period) ? (
        <div className="mt-4">
          <PayrollRunForm period={overview.period} />
        </div>
      ) : null}

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            {overview.latest ? `Employees · ${periodLabel(overview.latest.period)}` : "Employees"}
          </h2>
          <Link href="/payroll/employees" className="text-sm text-brand-700 hover:underline">
            View all
          </Link>
        </div>
        <PayrollItemTable items={items.slice(0, 8)} canProcess={false} locked />
      </div>
    </div>
  );
}
