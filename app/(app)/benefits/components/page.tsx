import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { BenefitsSubnav } from "@/components/benefits/subnav";
import { BenefitTypeForm } from "@/components/benefits/benefit-type-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listBenefitTypes } from "@/lib/claims/repository";
import { toggleBenefitTypeAction } from "@/actions/claims";
import { BENEFIT_CALCULATION_METHOD_LABELS, BENEFIT_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Benefit types" };

export default async function BenefitTypesPage() {
  const user = await requirePermissionOrRedirect("benefits.view");
  const types = await listBenefitTypes(user.organization.id);
  const canManage = hasPermission(user, "benefits.manage");

  return (
    <div>
      <PageHeader title="Benefit types" description="Define fuel, telephone, internet, medical and other benefits. Not hardcoded." />
      <BenefitsSubnav />
      {canManage ? (
        <div className="mb-6">
          <BenefitTypeForm />
        </div>
      ) : null}
      {types.length === 0 ? (
        <EmptyState title="No benefit types" description="Create your first benefit type to start assigning benefits." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Calculation</th>
                <th className="px-4 py-3">Default</th>
                <th className="px-4 py-3">Status</th>
                {canManage ? <th className="px-4 py-3" /> : null}
              </tr>
            </thead>
            <tbody>
              {types.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">{item.code}</td>
                  <td className="px-4 py-3">{BENEFIT_CATEGORY_LABELS[item.category]}</td>
                  <td className="px-4 py-3">{BENEFIT_CALCULATION_METHOD_LABELS[item.calculation_method]}</td>
                  <td className="px-4 py-3">
                    {item.fixed_amount != null ? formatCurrency(item.fixed_amount) : item.percentage != null ? `${item.percentage}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>{item.status}</Badge>
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <form action={toggleBenefitTypeAction}>
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
