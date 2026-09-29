import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { LeaveSubnav } from "@/components/leave/subnav";
import { LeaveRequestActions } from "@/components/leave/request-actions";
import { LeaveStatusBadge } from "@/components/leave/status-badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadRequestItems } from "@/lib/leave/query";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Leave approvals" };

export default async function LeaveApprovalsPage() {
  const user = await requirePermissionOrRedirect("leave.approve");
  const items = (await loadRequestItems(user.organization.id, user.organization.timezone)).filter((item) => item.status === "PENDING");
  const canCancel = hasPermission(user, "leave.manage");

  return (
    <div>
      <PageHeader title="Approvals" description="Pending leave requests. Approval writes attendance days and posts USED to the balance ledger." />
      <LeaveSubnav />
      {items.length === 0 ? (
        <EmptyState title="Nothing pending" description="New requests that need approval will appear here." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-medium">{item.employeeName} · {item.leaveTypeName}</p>
                  <p className="text-sm text-slate-500">
                    {formatDateOnly(item.fromDate)}
                    {item.fromDate !== item.toDate ? ` – ${formatDateOnly(item.toDate)}` : ""} · {item.days} day(s)
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{item.reason || "No reason given."}</p>
                </div>
                <LeaveStatusBadge status={item.status} />
              </div>
              <div className="mt-3">
                <LeaveRequestActions id={item.id} status={item.status} canApprove canCancel={canCancel} canWithdraw={false} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
