"use server";

import { revalidatePath } from "next/cache";
import { userSchema } from "@/lib/validations/company";
import { passwordSchema } from "@/lib/validations/auth";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { getDemoStore, ROLE_IDS, listOrgUsers } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode, usernameToAuthEmail } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";
import type { RoleCode } from "@/lib/constants";

function flattenErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  const fieldErrors = error.flatten().fieldErrors;
  const errors: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(fieldErrors)) {
    if (value?.length) errors[key] = value;
  }
  return errors;
}

export async function listUsersAction(query?: string) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "user.view")) return [];

  if (!hasSupabaseConfig() || isDemoMode()) {
    const rows = listOrgUsers();
    const q = query?.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (!q) return true;
        return (
          row.profile.username.toLowerCase().includes(q) ||
          row.profile.display_name.toLowerCase().includes(q) ||
          row.roleName.toLowerCase().includes(q)
        );
      })
      .map((row) => ({
        id: row.profile.id,
        username: row.profile.username,
        displayName: row.profile.display_name,
        mobile: row.profile.mobile,
        roleCode: row.roleCode,
        roleName: row.roleName,
        branchId: row.branch?.id ?? "",
        branchName: row.branch?.name ?? "Unassigned",
        status: row.profile.status,
        membershipStatus: row.membership.status,
        isDemo: row.profile.is_demo,
      }));
  }

  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("organization_users")
    .select("status, branch_id, user_profiles(*), roles(code, name), branches(name)")
    .eq("organization_id", user.organization.id);

  return (data ?? []).map((row) => {
    const nested = row as {
      status: string;
      branch_id: string | null;
      user_profiles: unknown;
      roles: unknown;
      branches: unknown;
    };
    const profileRaw = Array.isArray(nested.user_profiles) ? nested.user_profiles[0] : nested.user_profiles;
    const roleRaw = Array.isArray(nested.roles) ? nested.roles[0] : nested.roles;
    const branchRaw = Array.isArray(nested.branches) ? nested.branches[0] : nested.branches;
    const profile = profileRaw as {
      id: string;
      username: string;
      display_name: string;
      mobile: string | null;
      status: string;
      is_demo: boolean;
    };
    const role = roleRaw as { code: RoleCode; name: string };
    const branch = (branchRaw as { name: string } | null) ?? null;
    return {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      mobile: profile.mobile,
      roleCode: role.code,
      roleName: role.name,
      branchId: row.branch_id ?? "",
      branchName: branch?.name ?? "Unassigned",
      status: profile.status,
      membershipStatus: row.status,
      isDemo: profile.is_demo,
    };
  });
}

export async function createUserAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const actor = await getSessionUser();
  if (!actor || !hasPermission(actor, "user.create")) {
    return { success: false, message: "You do not have permission to create users." };
  }

  const parsed = userSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    mobile: formData.get("mobile") ?? "",
    roleCode: formData.get("roleCode"),
    branchId: formData.get("branchId") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };

  const passwordCheck = passwordSchema.safeParse(parsed.data.password);
  if (!passwordCheck.success) {
    return { success: false, errors: { password: passwordCheck.error.issues.map((issue) => issue.message) } };
  }

  if (!hasSupabaseConfig() || isDemoMode()) {
    const store = getDemoStore();
    if (store.users.some((u) => u.username.toLowerCase() === parsed.data.username.toLowerCase())) {
      return { success: false, errors: { username: ["Username is already taken."] } };
    }
    const id = crypto.randomUUID();
    store.users.push({
      id,
      auth_user_id: `auth-${id}`,
      username: parsed.data.username.toLowerCase(),
      display_name: parsed.data.displayName,
      mobile: parsed.data.mobile || null,
      photo_url: null,
      status: "ACTIVE",
      is_demo: false,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    store.memberships.push({
      id: crypto.randomUUID(),
      organization_id: actor.organization.id,
      user_id: id,
      role_id: ROLE_IDS[parsed.data.roleCode],
      branch_id: parsed.data.branchId || store.branches[0]?.id || null,
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    store.passwords[parsed.data.username.toLowerCase()] = parsed.data.password!;
    await writeAudit({
      organizationId: actor.organization.id,
      actorUserId: actor.id,
      action: "user_creation",
      entityType: "user_profiles",
      entityId: id,
      metadata: { username: parsed.data.username, role: parsed.data.roleCode },
    });
    revalidatePath("/settings/users");
    return { success: true, message: "User created." };
  }

  const admin = createAdminClient();
  if (!admin) return { success: false, message: "Database is not configured." };

  const { data: existing } = await admin
    .from("user_profiles")
    .select("id")
    .eq("username", parsed.data.username.toLowerCase())
    .maybeSingle();
  if (existing) return { success: false, errors: { username: ["Username is already taken."] } };

  const email = usernameToAuthEmail(parsed.data.username);
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { username: parsed.data.username.toLowerCase() },
  });
  if (createError || !created.user) {
    return { success: false, message: createError?.message ?? "Unable to create auth user." };
  }

  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .insert({
      auth_user_id: created.user.id,
      username: parsed.data.username.toLowerCase(),
      display_name: parsed.data.displayName,
      mobile: parsed.data.mobile || null,
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (profileError || !profile) {
    return { success: false, message: profileError?.message ?? "Unable to create profile." };
  }

  await admin.from("username_lookup").insert({
    username: parsed.data.username.toLowerCase(),
    auth_email: email,
    user_id: profile.id,
  });

  const { data: role } = await admin
    .from("roles")
    .select("id")
    .eq("code", parsed.data.roleCode)
    .is("organization_id", null)
    .maybeSingle();

  await admin.from("organization_users").insert({
    organization_id: actor.organization.id,
    user_id: profile.id,
    role_id: role?.id,
    branch_id: parsed.data.branchId || null,
    status: "ACTIVE",
  });

  await writeAudit({
    organizationId: actor.organization.id,
    actorUserId: actor.id,
    action: "user_creation",
    entityType: "user_profiles",
    entityId: profile.id,
    metadata: { username: parsed.data.username, role: parsed.data.roleCode },
  });
  revalidatePath("/settings/users");
  return { success: true, message: "User created." };
}

export async function updateUserAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const actor = await getSessionUser();
  if (!actor || !hasPermission(actor, "user.edit")) {
    return { success: false, message: "You do not have permission to edit users." };
  }
  const userId = String(formData.get("userId") ?? "");
  const parsed = userSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    mobile: formData.get("mobile") ?? "",
    roleCode: formData.get("roleCode"),
    branchId: formData.get("branchId") ?? "",
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };

  if (!hasSupabaseConfig() || isDemoMode()) {
    const store = getDemoStore();
    const profile = store.users.find((u) => u.id === userId);
    const membership = store.memberships.find((m) => m.user_id === userId);
    if (!profile || !membership) return { success: false, message: "User not found." };
    if (
      profile.username !== parsed.data.username.toLowerCase() &&
      store.users.some((u) => u.username.toLowerCase() === parsed.data.username.toLowerCase())
    ) {
      return { success: false, errors: { username: ["Username is already taken."] } };
    }
    const previousRole = membership.role_id;
    profile.display_name = parsed.data.displayName;
    profile.mobile = parsed.data.mobile || null;
    membership.role_id = ROLE_IDS[parsed.data.roleCode];
    membership.branch_id = parsed.data.branchId || membership.branch_id;
    if (previousRole !== membership.role_id) {
      await writeAudit({
        organizationId: actor.organization.id,
        actorUserId: actor.id,
        action: "role_change",
        entityType: "user_profiles",
        entityId: userId,
        metadata: { username: profile.username, role: parsed.data.roleCode },
      });
    }
    await writeAudit({
      organizationId: actor.organization.id,
      actorUserId: actor.id,
      action: "user_edit",
      entityType: "user_profiles",
      entityId: userId,
    });
    revalidatePath("/settings/users");
    return { success: true, message: "User updated." };
  }

  const admin = createAdminClient();
  if (!admin) return { success: false, message: "Database is not configured." };
  await admin
    .from("user_profiles")
    .update({ display_name: parsed.data.displayName, mobile: parsed.data.mobile || null })
    .eq("id", userId);
  const { data: role } = await admin
    .from("roles")
    .select("id")
    .eq("code", parsed.data.roleCode)
    .is("organization_id", null)
    .maybeSingle();
  await admin
    .from("organization_users")
    .update({ role_id: role?.id, branch_id: parsed.data.branchId || null })
    .eq("organization_id", actor.organization.id)
    .eq("user_id", userId);
  await writeAudit({
    organizationId: actor.organization.id,
    actorUserId: actor.id,
    action: "role_change",
    entityType: "user_profiles",
    entityId: userId,
    metadata: { role: parsed.data.roleCode },
  });
  revalidatePath("/settings/users");
  return { success: true, message: "User updated." };
}

export async function toggleUserStatusAction(userId: string, enable: boolean): Promise<ActionResult> {
  const actor = await getSessionUser();
  if (!actor || !hasPermission(actor, "user.disable")) {
    return { success: false, message: "You do not have permission to change user status." };
  }
  if (actor.id === userId) return { success: false, message: "You cannot disable your own account." };

  const status = enable ? "ACTIVE" : "DISABLED";
  if (!hasSupabaseConfig() || isDemoMode()) {
    const store = getDemoStore();
    const profile = store.users.find((u) => u.id === userId);
    const membership = store.memberships.find((m) => m.user_id === userId);
    if (!profile || !membership) return { success: false, message: "User not found." };
    profile.status = status;
    membership.status = status;
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    await admin.from("user_profiles").update({ status }).eq("id", userId);
    await admin
      .from("organization_users")
      .update({ status })
      .eq("organization_id", actor.organization.id)
      .eq("user_id", userId);
  }

  await writeAudit({
    organizationId: actor.organization.id,
    actorUserId: actor.id,
    action: enable ? "user_enable" : "user_disable",
    entityType: "user_profiles",
    entityId: userId,
  });
  revalidatePath("/settings/users");
  return { success: true, message: enable ? "User enabled." : "User disabled." };
}
