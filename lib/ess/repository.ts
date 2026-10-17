import { getDemoStore, roleCodeFromId } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RoleCode } from "@/lib/constants";
import type { EssChangeRequest, EssNotification, UserProfile } from "@/types";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

function stamp() {
  return new Date().toISOString();
}

export { demoEnabled };

export async function listNotifications(organizationId: string, userId: string): Promise<EssNotification[]> {
  if (demoEnabled()) {
    return getDemoStore()
      .essNotifications.filter((item) => item.organization_id === organizationId && item.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("ess_notifications")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as EssNotification[];
}

export async function insertNotification(row: EssNotification): Promise<EssNotification> {
  if (demoEnabled()) {
    getDemoStore().essNotifications.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("ess_notifications").insert(row).select("*").single();
  if (error) throw error;
  return data as EssNotification;
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  if (demoEnabled()) {
    const row = getDemoStore().essNotifications.find((item) => item.id === id && item.user_id === userId);
    if (row) row.read_at = stamp();
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  await admin
    .from("ess_notifications")
    .update({ read_at: stamp() })
    .eq("id", id)
    .eq("user_id", userId);
}

export async function markAllNotificationsRead(organizationId: string, userId: string): Promise<void> {
  const now = stamp();
  if (demoEnabled()) {
    for (const row of getDemoStore().essNotifications) {
      if (row.organization_id === organizationId && row.user_id === userId && !row.read_at) row.read_at = now;
    }
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  await admin
    .from("ess_notifications")
    .update({ read_at: now })
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .is("read_at", null);
}

export async function listChangeRequests(organizationId: string): Promise<EssChangeRequest[]> {
  if (demoEnabled()) {
    return getDemoStore()
      .essChangeRequests.filter((item) => item.organization_id === organizationId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("ess_change_requests")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as EssChangeRequest[];
}

export async function getChangeRequest(organizationId: string, id: string): Promise<EssChangeRequest | null> {
  if (demoEnabled()) {
    return getDemoStore().essChangeRequests.find((item) => item.organization_id === organizationId && item.id === id) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("ess_change_requests")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  return (data as EssChangeRequest | null) ?? null;
}

export async function insertChangeRequest(row: EssChangeRequest): Promise<EssChangeRequest> {
  if (demoEnabled()) {
    getDemoStore().essChangeRequests.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("ess_change_requests").insert(row).select("*").single();
  if (error) throw error;
  return data as EssChangeRequest;
}

export interface OrgUserWithRole {
  profile: UserProfile;
  roleCode: RoleCode;
}

export async function listOrgUsersWithRoles(organizationId: string): Promise<OrgUserWithRole[]> {
  if (demoEnabled()) {
    const store = getDemoStore();
    return store.memberships
      .filter((item) => item.organization_id === organizationId)
      .map((item) => {
        const profile = store.users.find((user) => user.id === item.user_id);
        if (!profile) return null;
        return { profile, roleCode: roleCodeFromId(item.role_id) };
      })
      .filter((row): row is OrgUserWithRole => Boolean(row));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data: memberships } = await admin
    .from("organization_users")
    .select("user_id, roles(code)")
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE");
  const ids = (memberships ?? []).map((row) => row.user_id as string);
  if (ids.length === 0) return [];
  const { data: profiles } = await admin.from("user_profiles").select("*").in("id", ids);
  const roleByUser = new Map<string, RoleCode>();
  for (const row of memberships ?? []) {
    const role = (row as { roles?: { code: RoleCode } | { code: RoleCode }[] | null }).roles;
    const code = Array.isArray(role) ? role[0]?.code : role?.code;
    if (code) roleByUser.set(row.user_id as string, code);
  }
  return ((profiles ?? []) as UserProfile[])
    .map((profile) => {
      const roleCode = roleByUser.get(profile.id);
      return roleCode ? { profile, roleCode } : null;
    })
    .filter((row): row is OrgUserWithRole => Boolean(row));
}

export async function updateChangeRequest(id: string, patch: Partial<EssChangeRequest>): Promise<EssChangeRequest | null> {
  if (demoEnabled()) {
    const row = getDemoStore().essChangeRequests.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("ess_change_requests")
    .update({ ...patch, updated_at: stamp() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as EssChangeRequest | null) ?? null;
}
