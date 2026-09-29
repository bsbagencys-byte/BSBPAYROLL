import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { LeaveSubnav } from "@/components/leave/subnav";
import { LeavePolicyForm } from "@/components/leave/policy-form";
import { Badge } from "@/components/ui/badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadLeaveCatalog } from "@/lib/leave/query";
import { ACCRUAL_METHOD_LABELS, POLICY_SCOPE_LABELS } from "@/lib/constants";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Leave policies" };

export default async function LeavePoliciesPage() {
  const user = await requirePermissionOrRedirect("leave.view");
  const catalog = await loadLeaveCatalog(user.organization.id);

  return (
    <div>
      <PageHeader title="Policies" description="Allocation, accrual, carry-forward and whether weekly offs or holidays count as leave." />
      <LeaveSubnav />
      {hasPermission(user, "leave.policy.manage") ? (
      <div className="mb-6">
        <LeavePolicyForm
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
        <EmptyState title="No policies" description="Create an organisation-wide policy per leave type." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Policy</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Allocation</th>
                <th className="px-4 py-3">Accrual</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {catalog.policies.map((item) => {
                const type = catalog.types.find((row) => row.id === item.leave_type_id);
                const assignment = catalog.assignments.find((row) => row.policy_id === item.id);
                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      {item.name}
                      <div className="text-xs text-slate-500">{assignment ? POLICY_SCOPE_LABELS[assignment.scope] : "Organisation"}</div>
                    </td>
                    <td className="px-4 py-3">{type?.name ?? "—"}</td>
                    <td className="px-4 py-3">{item.annual_allocation}</td>
                    <td className="px-4 py-3">{ACCRUAL_METHOD_LABELS[item.accrual_method]}</td>
                    <td className="px-4 py-3">{formatDateOnly(item.effective_from)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>{item.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
