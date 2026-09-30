import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { SalarySubnav } from "@/components/salary/subnav";
import { SalaryRevisionBadge } from "@/components/salary/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadSalaryOverview } from "@/lib/salary/query";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Salary" };

export default async function SalaryPage() {
  const user = await requirePermissionOrRedirect("salary.view");
  const overview = await loadSalaryOverview(user.organization.id, user.organization.timezone);
  const canManage = hasPermission(user, "salary.manage");

  return (
    <div>
      <PageHeader
        title="Salary"
        description="Effective-date compensation, structures and revisions. Statutory deductions and payroll runs are not in this phase."
        actions={
          canManage ? (
            <Link href="/salary/employee">
              <Button>Assign salary</Button>
            </Link>
          ) : null
        }
      />
      <SalarySubnav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Employees with salary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.withSalary.length}</p>
            <p className="text-xs text-slate-500">Active assignment as of {formatDateOnly(overview.today)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Without salary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.withoutSalary.length}</p>
            <p className="text-xs text-slate-500">Need a structure assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Pending revisions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.pendingRevisions.length}</p>
            <p className="text-xs text-slate-500">Draft or awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Active structures</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.activeStructures.length}</p>
            <p className="text-xs text-slate-500">{overview.componentCount} components</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent revisions</CardTitle>
            <Link href="/salary/revisions" className="text-sm text-brand-700 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {overview.recentRevisions.length === 0 ? (
              <p className="text-sm text-slate-500">No revisions yet.</p>
            ) : (
              <div className="space-y-3">
                {overview.recentRevisions.map((item) => {
                  const employee = overview.employees.find((row) => row.id === item.employee_id);
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                      <div>
                        <p className="font-medium">{employee?.display_name ?? "Employee"}</p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(item.new_ctc)} · {formatDateOnly(item.effective_from)}
                        </p>
                      </div>
                      <SalaryRevisionBadge status={item.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Active salary structures</CardTitle>
            <Link href="/salary/structures" className="text-sm text-brand-700 hover:underline">
              Structures
            </Link>
          </CardHeader>
          <CardContent>
            {overview.activeStructures.length === 0 ? (
              <p className="text-sm text-slate-500">No structures yet.</p>
            ) : (
              <div className="space-y-3">
                {overview.activeStructures.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.code}</p>
                    </div>
                    <Badge variant="success">{item.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
