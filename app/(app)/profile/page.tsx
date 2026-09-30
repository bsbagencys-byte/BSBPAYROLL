import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { ProfileView } from "@/components/profile/profile-view";
import { EmployeeLeavePanel } from "@/components/leave/employee-leave";
import { EmployeeSalaryPanel } from "@/components/salary/employee-salary";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { loadEmployeeLeave } from "@/lib/leave/query";
import { loadEmployeeCompensation } from "@/lib/salary/query";
import { loadOrgCatalog } from "@/lib/org-data";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const catalog = await loadOrgCatalog(user.organization.id);
  const linked = catalog.employees.find((item) => item.user_id === user.id);
  const leave = linked ? await loadEmployeeLeave(user.organization.id, linked.id, user.organization.timezone) : null;
  const canViewSalary = hasPermission(user, "salary.view");
  const salary =
    linked && canViewSalary
      ? await loadEmployeeCompensation(user.organization.id, linked.id, user.organization.timezone)
      : null;
  const linkedId = linked?.id;
  return (
    <div>
      <PageHeader title="Profile" description="Your account details, leave and salary for this organization." />
      <ProfileView user={user} />
      {leave ? (
        <div className="mt-4">
          <EmployeeLeavePanel balances={leave.balances} requests={leave.requests} />
        </div>
      ) : null}
      {salary && linkedId ? (
        <div className="mt-4">
          <EmployeeSalaryPanel
            snapshot={salary.snapshot}
            history={salary.history}
            revisions={salary.revisions}
            canManage={hasPermission(user, "salary.manage")}
            canRevise={hasPermission(user, "salary.revision.create")}
            employeeId={linkedId}
          />
        </div>
      ) : null}
    </div>
  );
}
