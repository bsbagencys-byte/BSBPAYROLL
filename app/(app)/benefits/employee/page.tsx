import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { BenefitsSubnav } from "@/components/benefits/subnav";
import { BenefitAssignmentForm } from "@/components/benefits/assignment-form";
import { BenefitAssignmentBadge } from "@/components/benefits/status-badge";
import { Button } from "@/components/ui/button";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadBenefitsCatalog, toBenefitAssignmentRows } from "@/lib/claims/query";
import { closeEmployeeBenefitAction } from "@/actions/claims";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Benefit assignments" };

export default async function BenefitAssignmentsPage() {
  const user = await requirePermissionOrRedirect("benefits.view");
  const catalog = await loadBenefitsCatalog(user.organization.id);
  const canAssign = hasPermission(user, "benefits.assign");
  const rows = toBenefitAssignmentRows({
    assignments: catalog.assignments,
    types: catalog.types,
    employees: catalog.employees,
    departments: catalog.departments,
    employment: catalog.employment,
  });

  return (
    <div>
      <PageHeader title="Assignments" description="Benefits assigned to employees with effective dates. Overlapping assignments are prevented." />
      <BenefitsSubnav />
      {canAssign ? (
        <div className="mb-6">
          <BenefitAssignmentForm types={catalog.types} employees={catalog.employees} />
        </div>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState title="No assignments" description="Assign a benefit type to an employee to get started." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Benefit</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3">Status</th>
                {canAssign ? <th className="px-4 py-3" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.employeeName}</p>
                    <p className="text-xs text-slate-500">{item.employeeCode}</p>
                  </td>
                  <td className="px-4 py-3">{item.benefitName}</td>
                  <td className="px-4 py-3">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {item.effective_from} → {item.effective_to ?? "open"}
                  </td>
                  <td className="px-4 py-3">
                    <BenefitAssignmentBadge status={item.status} />
                  </td>
                  {canAssign && item.status === "ACTIVE" ? (
                    <td className="px-4 py-3">
                      <form action={closeEmployeeBenefitAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Close
                        </Button>
                      </form>
                    </td>
                  ) : canAssign ? (
                    <td className="px-4 py-3" />
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
