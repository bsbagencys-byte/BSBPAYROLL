import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { LeaveSubnav } from "@/components/leave/subnav";
import { LeaveRequestForm } from "@/components/leave/request-form";
import { LeaveRequestActions } from "@/components/leave/request-actions";
import { LeaveStatusBadge } from "@/components/leave/status-badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadLeaveCatalog, loadRequestItems } from "@/lib/leave/query";
import { LEAVE_DAY_SESSION_LABELS } from "@/lib/constants";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Leave requests" };

export default async function LeaveRequestsPage() {
  const user = await requirePermissionOrRedirect("leave.view");
  const [items, catalog] = await Promise.all([
    loadRequestItems(user.organization.id, user.organization.timezone),
    loadLeaveCatalog(user.organization.id),
  ]);
  const canRequest = hasPermission(user, "leave.request");
  const canApprove = hasPermission(user, "leave.approve");
  const canCancel = hasPermission(user, "leave.manage");
  const lockedEmployee =
    user.roleCode === "EMPLOYEE" ? catalog.employees.find((item) => item.user_id === user.id)?.id ?? null : null;
  const visible = lockedEmployee ? items.filter((item) => item.employeeId === lockedEmployee) : items;
  const employees = lockedEmployee ? catalog.employees.filter((item) => item.id === lockedEmployee) : catalog.employees;

  return (
    <div>
      <PageHeader title="Leave requests" description="Apply, track and withdraw leave. Countable days skip weekly offs and holidays unless the policy says otherwise." />
      <LeaveSubnav />
      {canRequest ? <div className="mb-6"><LeaveRequestForm employees={employees} types={catalog.types} lockedEmployeeId={lockedEmployee} /></div> : null}
      {visible.length === 0 ? (
        <EmptyState title="No requests" description="Submit a leave request to start the approval flow." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Days</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id} className="border-b last:border-0 align-top">
                  <td className="px-4 py-3">
                    {item.employeeName}
                    <div className="text-xs text-slate-500">{item.employeeCode}</div>
                  </td>
                  <td className="px-4 py-3">
                    {item.leaveTypeName}
                    <div className="text-xs text-slate-500">{item.paid ? "Paid" : "Unpaid"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {formatDateOnly(item.fromDate)}
                    {item.fromDate !== item.toDate ? ` – ${formatDateOnly(item.toDate)}` : ""}
                    <div className="text-xs text-slate-500">{LEAVE_DAY_SESSION_LABELS[item.session]}</div>
                  </td>
                  <td className="px-4 py-3">{item.days}</td>
                  <td className="px-4 py-3">
                    <LeaveStatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3">
                    <LeaveRequestActions
                      id={item.id}
                      status={item.status}
                      canApprove={canApprove}
                      canCancel={canCancel}
                      canWithdraw={canRequest && (user.roleCode === "EMPLOYEE" ? item.employeeId === lockedEmployee : true)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
