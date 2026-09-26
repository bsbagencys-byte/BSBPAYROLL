import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { UsersManager } from "@/components/settings/users-manager";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listUsersAction } from "@/actions/users";
import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Branch } from "@/types";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const user = await requirePermissionOrRedirect("user.view");

  const users = await listUsersAction();
  let branches: Branch[] = [];
  if (!hasSupabaseConfig() || isDemoMode()) {
    branches = getDemoStore().branches;
  } else {
    const admin = createAdminClient();
    if (admin) {
      const { data } = await admin.from("branches").select("*").eq("organization_id", user.organization.id);
      branches = (data ?? []) as Branch[];
    }
  }

  return (
    <div>
      <PageHeader title="User management" description="Create accounts, assign roles and control access." />
      <SettingsSubnav pathname="/settings/users" />
      <UsersManager
        users={users}
        branches={branches}
        canCreate={hasPermission(user, "user.create")}
        canEdit={hasPermission(user, "user.edit")}
        canDisable={hasPermission(user, "user.disable")}
        currentUserId={user.id}
      />
    </div>
  );
}
