import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { LeaveSubnav } from "@/components/leave/subnav";
import { CompOffActions, CompOffForm } from "@/components/leave/comp-off-form";
import { CompOffBadge } from "@/components/leave/status-badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listCompOff } from "@/lib/leave/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Comp-off" };

export default async function CompOffPage() {
  const user = await requirePermissionOrRedirect("leave.view");
  const [rows, catalog] = await Promise.all([listCompOff(user.organization.id), loadOrgCatalog(user.organization.id)]);
  const canManage = hasPermission(user, "leave.comp_off.manage");

  return (
    <div>
      <PageHeader title="Comp-off" description="Earn compensatory off for holiday or weekly-off work, then consume it as leave." />
      <LeaveSubnav />
      {canManage ? <div className="mb-6"><CompOffForm employees={catalog.employees} /></div> : null}
      {rows.length === 0 ? (
        <EmptyState title="No comp-off earnings" description="Record work on a holiday or weekly off, then approve to credit the COMP balance." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Work date</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Units</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{catalog.employees.find((row) => row.id === item.employee_id)?.display_name ?? "—"}</td>
                  <td className="px-4 py-3">{formatDateOnly(item.work_date)}</td>
                  <td className="px-4 py-3">{item.source === "HOLIDAY" ? "Holiday" : "Weekly off"}</td>
                  <td className="px-4 py-3">{item.units}</td>
                  <td className="px-4 py-3">
                    <CompOffBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3">{canManage ? <CompOffActions row={item} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
