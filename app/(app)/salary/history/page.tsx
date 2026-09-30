import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { SalarySubnav } from "@/components/salary/subnav";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { listSalaryHistory } from "@/lib/salary/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { SALARY_CHANGE_TYPE_LABELS } from "@/lib/constants";
import { formatDateOnly, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Salary history" };

export default async function SalaryHistoryPage() {
  const user = await requirePermissionOrRedirect("salary.history.view");
  const [history, catalog] = await Promise.all([
    listSalaryHistory(user.organization.id),
    loadOrgCatalog(user.organization.id),
  ]);

  return (
    <div>
      <PageHeader title="Salary history" description="Every assignment and revision is kept. Previous CTC values are never overwritten." />
      <SalarySubnav />
      {history.length === 0 ? (
        <EmptyState title="No history" description="Assign or revise a salary to create an audit trail." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Change</th>
                <th className="px-4 py-3">Old</th>
                <th className="px-4 py-3">New</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3">Applied</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => {
                const employee = catalog.employees.find((row) => row.id === item.employee_id);
                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{formatDateTime(item.created_at, user.organization.timezone)}</td>
                    <td className="px-4 py-3">{employee?.display_name ?? "—"}</td>
                    <td className="px-4 py-3">{SALARY_CHANGE_TYPE_LABELS[item.change_type]}</td>
                    <td className="px-4 py-3">{item.old_value ?? "—"}</td>
                    <td className="px-4 py-3">{item.new_value ?? "—"}</td>
                    <td className="px-4 py-3">{item.reason ?? "—"}</td>
                    <td className="px-4 py-3">{formatDateOnly(item.effective_from)}</td>
                    <td className="px-4 py-3">{formatDateTime(item.applied_at, user.organization.timezone)}</td>
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
