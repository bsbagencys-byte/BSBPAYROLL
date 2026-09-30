import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { SalarySubnav } from "@/components/salary/subnav";
import { SalaryComponentForm } from "@/components/salary/component-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listSalaryComponents } from "@/lib/salary/repository";
import { toggleSalaryComponentAction } from "@/actions/salary";
import { SALARY_CALCULATION_METHOD_LABELS, SALARY_COMPONENT_TYPE_LABELS } from "@/lib/constants";

export const metadata = { title: "Salary components" };

export default async function SalaryComponentsPage() {
  const user = await requirePermissionOrRedirect("salary.view");
  const components = await listSalaryComponents(user.organization.id);
  const canManage = hasPermission(user, "salary.component.manage");

  return (
    <div>
      <PageHeader title="Salary components" description="Configurable earnings, deductions and reimbursements. Not hardcoded." />
      <SalarySubnav />
      {canManage ? (
        <div className="mb-6">
          <SalaryComponentForm components={components} />
        </div>
      ) : null}
      {components.length === 0 ? (
        <EmptyState title="No components" description="Create Basic, HRA, DA, TA and others for this organisation." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Calculation</th>
                <th className="px-4 py-3">CTC / Gross</th>
                <th className="px-4 py-3">Status</th>
                {canManage ? <th className="px-4 py-3" /> : null}
              </tr>
            </thead>
            <tbody>
              {components.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.code}</td>
                  <td className="px-4 py-3">{SALARY_COMPONENT_TYPE_LABELS[item.component_type]}</td>
                  <td className="px-4 py-3">{SALARY_CALCULATION_METHOD_LABELS[item.calculation_method]}</td>
                  <td className="px-4 py-3">{item.include_in_ctc ? "CTC" : "—"} / {item.include_in_gross ? "Gross" : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>{item.status}</Badge>
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <form action={toggleSalaryComponentAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="status" value={item.status} />
                        <Button type="submit" size="sm" variant="outline">
                          {item.status === "ACTIVE" ? "Disable" : "Enable"}
                        </Button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
