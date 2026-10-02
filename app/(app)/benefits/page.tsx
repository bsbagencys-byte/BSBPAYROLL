import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { BenefitsSubnav } from "@/components/benefits/subnav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadBenefitOverview } from "@/lib/claims/query";
import { BENEFIT_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Benefits" };

export default async function BenefitsPage() {
  const user = await requirePermissionOrRedirect("benefits.view");
  const overview = await loadBenefitOverview(user.organization.id);
  const canAssign = hasPermission(user, "benefits.assign");

  return (
    <div>
      <PageHeader
        title="Benefits"
        description="Configurable employee benefits, eligibility policies and assignments. Benefits are master data only; payroll processing is a later phase."
        actions={
          canAssign ? (
            <Link href="/benefits/employee">
              <Button>Assign benefit</Button>
            </Link>
          ) : null
        }
      />
      <BenefitsSubnav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Benefit types</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.activeTypes.length}</p>
            <p className="text-xs text-slate-500">Active definitions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.policies.filter((item) => item.status === "ACTIVE").length}</p>
            <p className="text-xs text-slate-500">Eligibility rules</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Active assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.activeAssignments.length}</p>
            <p className="text-xs text-slate-500">Employee benefits in force</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Without a policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.assignmentsWithoutPolicy.length}</p>
            <p className="text-xs text-slate-500">Assignments lacking a matching policy</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Benefit types</CardTitle>
            <Link href="/benefits/components" className="text-sm text-brand-700 hover:underline">
              Manage
            </Link>
          </CardHeader>
          <CardContent>
            {overview.types.length === 0 ? (
              <p className="text-sm text-slate-500">No benefit types yet.</p>
            ) : (
              <div className="space-y-3">
                {overview.types.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-slate-500">
                        {item.code} · {BENEFIT_CATEGORY_LABELS[item.category]}
                      </p>
                    </div>
                    {item.status === "ACTIVE" ? <Badge variant="success">ACTIVE</Badge> : <Badge variant="muted">DISABLED</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Active assignments</CardTitle>
            <Link href="/benefits/employee" className="text-sm text-brand-700 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {overview.activeAssignments.length === 0 ? (
              <p className="text-sm text-slate-500">No assignments yet.</p>
            ) : (
              <div className="space-y-3">
                {overview.activeAssignments.slice(0, 8).map((item) => {
                  const employee = overview.employees.find((row) => row.id === item.employee_id);
                  const type = overview.types.find((row) => row.id === item.benefit_type_id);
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                      <div>
                        <p className="font-medium">{type?.name ?? "Benefit"}</p>
                        <p className="text-xs text-slate-500">{employee?.display_name ?? "Employee"}</p>
                      </div>
                      <p className="text-sm font-medium">{formatCurrency(item.amount)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
