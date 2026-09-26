import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { getDemoSessionUser } from "@/lib/demo-store";
import type { SessionUser } from "@/types";
import { DEFAULT_ROLE_PERMISSIONS, ROLE_LABELS, type PermissionCode, type RoleCode } from "@/lib/constants";

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!hasSupabaseConfig() || isDemoMode()) {
    return getDemoSessionUser();
  }

  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const client = admin ?? supabase;

  const { data: profile } = await client
    .from("user_profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile || profile.status === "DISABLED") return null;

  const { data: membership } = await client
    .from("organization_users")
    .select("*, roles(*), organizations(*), branches(*)")
    .eq("user_id", profile.id)
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const role = membership.roles as { id: string; code: RoleCode; name: string } | null;
  const organization = membership.organizations as SessionUser["organization"] | null;
  const branch = (membership.branches as SessionUser["branch"]) ?? null;
  if (!role || !organization) return null;

  const { data: rolePerms } = await client
    .from("role_permissions")
    .select("permissions(code)")
    .eq("role_id", role.id);

  const permissions = (rolePerms ?? [])
    .map((row) => {
      const perm = row.permissions as { code: PermissionCode } | { code: PermissionCode }[] | null;
      if (Array.isArray(perm)) return perm[0]?.code;
      return perm?.code;
    })
    .filter(Boolean) as PermissionCode[];

  return {
    id: profile.id,
    authUserId: profile.auth_user_id,
    username: profile.username,
    displayName: profile.display_name,
    mobile: profile.mobile,
    photoUrl: profile.photo_url,
    status: profile.status,
    roleCode: role.code,
    roleName: role.name ?? ROLE_LABELS[role.code],
    permissions: permissions.length ? permissions : DEFAULT_ROLE_PERMISSIONS[role.code],
    organization,
    branch,
    membershipStatus: membership.status,
  };
}

export function hasPermission(user: SessionUser | null, permission: PermissionCode) {
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function requirePermission(user: SessionUser | null, permission: PermissionCode) {
  return hasPermission(user, permission);
}
