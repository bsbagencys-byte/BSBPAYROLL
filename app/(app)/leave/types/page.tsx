import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { LeaveSubnav } from "@/components/leave/subnav";
import { LeaveTypeForm } from "@/components/leave/type-form";
import { Badge } from "@/components/ui/badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listLeaveTypes } from "@/lib/leave/repository";

export const metadata = { title: "Leave types" };

export default async function LeaveTypesPage() {
  const user = await requirePermissionOrRedirect("leave.view");
  const types = await listLeaveTypes(user.organization.id);
  const canManage = hasPermission(user, "leave.policy.manage");

  return (
    <div>
      <PageHeader title="Leave types" description="Configurable codes such as CL, SL, EL, LOP and COMP. Not hardcoded." />
      <LeaveSubnav />
      {canManage ? (
        <div className="mb-6">
          <LeaveTypeForm />
        </div>
      ) : null}
      {types.length === 0 ? (
        <EmptyState title="No leave types" description="Create Casual Leave, Sick Leave and others for this organisation." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Half day</th>
                <th className="px-4 py-3">Approval</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {types.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.code}</td>
                  <td className="px-4 py-3">{item.paid ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{item.allow_half_day ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{item.requires_approval ? "Required" : "Auto"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>{item.status}</Badge>
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
