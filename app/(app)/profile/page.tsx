import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { ProfileView } from "@/components/profile/profile-view";
import { EmployeeLeavePanel } from "@/components/leave/employee-leave";
import { getSessionUser } from "@/lib/auth/session";
import { loadEmployeeLeave } from "@/lib/leave/query";
import { loadOrgCatalog } from "@/lib/org-data";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const catalog = await loadOrgCatalog(user.organization.id);
  const linked = catalog.employees.find((item) => item.user_id === user.id);
  const leave = linked ? await loadEmployeeLeave(user.organization.id, linked.id, user.organization.timezone) : null;
  return (
    <div>
      <PageHeader title="Profile" description="Your account details and leave for this organization." />
      <ProfileView user={user} />
      {leave ? (
        <div className="mt-4">
          <EmployeeLeavePanel balances={leave.balances} requests={leave.requests} />
        </div>
      ) : null}
    </div>
  );
}
