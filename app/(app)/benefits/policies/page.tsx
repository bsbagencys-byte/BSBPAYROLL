import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { BenefitsSubnav } from "@/components/benefits/subnav";
import { BenefitPolicyForm } from "@/components/benefits/benefit-policy-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadBenefitsCatalog } from "@/lib/claims/query";
import { toggleBenefitPolicyAction } from "@/actions/claims";
import { POLICY_SCOPE_LABELS } from "@/lib/constants";
import { formatCurrency, lookupName } from "@/lib/utils";

export const metadata = { title: "Benefit policies" };

export default async function BenefitPoliciesPage() {
  const user = await requirePermissionOrRedirect("benefits.view");
  const catalog = await loadBenefitsCatalog(user.organization.id);
  const canManage = hasPermission(user, "benefits.manage");

  return (
    <div>
      <PageHeader title="Benefit policies" description="Eligibility rules by organisation, branch, department, designation or employment type." />
      <BenefitsSubnav />
      {canManage ? (
        <div className="mb-6">
          <BenefitPolicyForm
            types={catalog.types}
            branches={catalog.branches}
            departments={catalog.departments}
            designations={catalog.designations}
            employmentTypes={catalog.employmentTypes}
            employees={catalog.employees}
          />
        </div>
      ) : null}
      {catalog.policies.length === 0 ? (
        <EmptyState title="No policies" description="Add a policy to decide who is eligible for each benefit." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Benefit</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Maximum</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3">Status</th>
                {canManage ? <th className="px-4 py-3" /> : null}
              </tr>
            </thead>
            <tbody>
              {catalog.policies.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">{lookupName(catalog.types, item.benefit_type_id) ?? "—"}</td>
                  <td className="px-4 py-3">{POLICY_SCOPE_LABELS[item.scope]}</td>
                  <td className="px-4 py-3">{item.max_amount != null ? formatCurrency(item.max_amount) : "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {item.effective_from} → {item.effective_to ?? "open"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>{item.status}</Badge>
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <form action={toggleBenefitPolicyAction}>
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
