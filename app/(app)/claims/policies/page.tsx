import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ClaimsSubnav } from "@/components/claims/subnav";
import { ClaimTypeForm } from "@/components/claims/claim-type-form";
import { ClaimPolicyForm } from "@/components/claims/claim-policy-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadClaimsCatalog } from "@/lib/claims/query";
import { toggleClaimPolicyAction, toggleClaimTypeAction } from "@/actions/claims";
import { CLAIM_CATEGORY_LABELS, CLAIM_WORKFLOW_MODE_LABELS } from "@/lib/constants";
import { formatCurrency, lookupName } from "@/lib/utils";

export const metadata = { title: "Claim policies" };

export default async function ClaimPoliciesPage() {
  const user = await requirePermissionOrRedirect("claims.view");
  const catalog = await loadClaimsCatalog(user.organization.id);
  const canManage = hasPermission(user, "claims.manage");

  return (
    <div>
      <PageHeader title="Claim types & policies" description="Configure claim types, receipts, travel fields and the approval workflow." />
      <ClaimsSubnav />

      {canManage ? (
        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          <ClaimTypeForm />
          <ClaimPolicyForm types={catalog.types} designations={catalog.designations} />
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Claim types</CardTitle>
          </CardHeader>
          <CardContent>
            {catalog.types.length === 0 ? (
              <EmptyState title="No claim types" description="Add a claim type to start raising claims." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Category</th>
                      <th className="py-2 pr-4">Workflow</th>
                      <th className="py-2 pr-4">Status</th>
                      {canManage ? <th className="py-2" /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.types.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.code}</p>
                        </td>
                        <td className="py-2 pr-4">{CLAIM_CATEGORY_LABELS[item.category]}</td>
                        <td className="py-2 pr-4">{CLAIM_WORKFLOW_MODE_LABELS[item.workflow_mode]}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>{item.status}</Badge>
                        </td>
                        {canManage ? (
                          <td className="py-2 text-right">
                            <form action={toggleClaimTypeAction}>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
          </CardHeader>
          <CardContent>
            {catalog.policies.length === 0 ? (
              <EmptyState title="No policies" description="Add a policy with limits and rates for each claim type." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Limits</th>
                      <th className="py-2 pr-4">Status</th>
                      {canManage ? <th className="py-2" /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.policies.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-slate-500">
                            {item.effective_from} → {item.effective_to ?? "open"}
                          </p>
                        </td>
                        <td className="py-2 pr-4">{lookupName(catalog.types, item.claim_type_id) ?? "Any"}</td>
                        <td className="py-2 pr-4 text-xs text-slate-600">
                          {item.max_amount != null ? `Max ${formatCurrency(item.max_amount)}` : "No cap"}
                          {item.mileage_rate != null ? ` · ${item.mileage_rate}/km` : ""}
                          {item.da_per_day != null ? ` · DA ${item.da_per_day}` : ""}
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>{item.status}</Badge>
                        </td>
                        {canManage ? (
                          <td className="py-2 text-right">
                            <form action={toggleClaimPolicyAction}>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
