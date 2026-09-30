import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { SalarySubnav } from "@/components/salary/subnav";
import { SalaryRevisionForm } from "@/components/salary/revision-form";
import { SalaryRevisionBadge } from "@/components/salary/status-badge";
import { Button } from "@/components/ui/button";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listRevisions, listSalaryStructures } from "@/lib/salary/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { decideSalaryRevisionAction } from "@/actions/salary";
import { SALARY_CHANGE_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateOnly, lookupName } from "@/lib/utils";

export const metadata = { title: "Salary revisions" };

export default async function SalaryRevisionsPage() {
  const user = await requirePermissionOrRedirect("salary.view");
  const [revisions, catalog, structures] = await Promise.all([
    listRevisions(user.organization.id),
    loadOrgCatalog(user.organization.id),
    listSalaryStructures(user.organization.id),
  ]);
  const canCreate = hasPermission(user, "salary.revision.create");
  const canApprove = hasPermission(user, "salary.revision.approve");

  return (
    <div>
      <PageHeader title="Salary revisions" description="Approve a revision to close the previous period and create a new effective salary." />
      <SalarySubnav />
      {canCreate ? (
        <div className="mb-6">
          <SalaryRevisionForm employees={catalog.employees} structures={structures} />
        </div>
      ) : null}
      {revisions.length === 0 ? (
        <EmptyState title="No revisions" description="Submit an increment, promotion or structure change." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Previous CTC</th>
                <th className="px-4 py-3">New CTC</th>
                <th className="px-4 py-3">Structure</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                {canApprove ? <th className="px-4 py-3" /> : null}
              </tr>
            </thead>
            <tbody>
              {revisions.map((item) => {
                const employee = catalog.employees.find((row) => row.id === item.employee_id);
                const pending = item.status === "PENDING" || item.status === "DRAFT";
                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{employee?.display_name ?? "—"}</td>
                    <td className="px-4 py-3">{item.previous_ctc != null ? formatCurrency(item.previous_ctc) : "—"}</td>
                    <td className="px-4 py-3">{formatCurrency(item.new_ctc)}</td>
                    <td className="px-4 py-3">{lookupName(structures, item.new_structure_id)}</td>
                    <td className="px-4 py-3">{formatDateOnly(item.effective_from)}</td>
                    <td className="px-4 py-3">{SALARY_CHANGE_TYPE_LABELS[item.reason]}</td>
                    <td className="px-4 py-3">
                      <SalaryRevisionBadge status={item.status} />
                    </td>
                    {canApprove ? (
                      <td className="px-4 py-3">
                        {pending ? (
                          <div className="flex gap-2">
                            <form action={decideSalaryRevisionAction}>
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="decision" value="APPROVED" />
                              <Button type="submit" size="sm">Approve</Button>
                            </form>
                            <form action={decideSalaryRevisionAction}>
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="decision" value="REJECTED" />
                              <Button type="submit" size="sm" variant="outline">Reject</Button>
                            </form>
                          </div>
                        ) : null}
                      </td>
                    ) : null}
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
