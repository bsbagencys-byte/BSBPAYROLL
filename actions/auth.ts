"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from "@/lib/validations/auth";
import { checkLoginRateLimit, clearLoginRateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";
import { hasSupabaseConfig, isDemoMode, usernameToAuthEmail } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getDemoStore,
  setDemoSession,
  clearDemoSession,
  buildSessionUser,
  getDemoSessionUser,
} from "@/lib/demo-store";
import { getSessionUser } from "@/lib/auth/session";
import type { ActionResult } from "@/types";

function flattenErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  const fieldErrors = error.flatten().fieldErrors;
  const errors: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(fieldErrors)) {
    if (value?.length) errors[key] = value;
  }
  return errors;
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function loginAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
  });

  if (!parsed.success) {
    return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  }

  const { username, password, remember } = parsed.data;
  const ip = await clientIp();
  const limitKey = `${username.toLowerCase()}:${ip}`;
  const limit = checkLoginRateLimit(limitKey);
  if (!limit.allowed) {
    await writeAudit({
      action: "failed_login",
      metadata: { username, reason: "rate_limited" },
    });
    return {
      success: false,
      message: `Too many login attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  if (!hasSupabaseConfig() || isDemoMode()) {
    const store = getDemoStore();
    const profile = store.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    const expected = store.passwords[username.toLowerCase()];
    if (!profile || expected !== password) {
      await writeAudit({ action: "failed_login", metadata: { username } });
      return { success: false, message: "Invalid username or password." };
    }
    if (profile.status === "DISABLED") {
      await writeAudit({ action: "failed_login", actorUserId: profile.id, metadata: { username, reason: "disabled" } });
      return { success: false, message: "This account has been disabled. Contact your administrator." };
    }
    const membership = store.memberships.find((m) => m.user_id === profile.id);
    if (!membership || membership.status === "DISABLED") {
      return { success: false, message: "You do not have an active organization membership." };
    }
    profile.last_login_at = new Date().toISOString();
    await setDemoSession(profile.id, Boolean(remember));
    clearLoginRateLimit(limitKey);
    await writeAudit({
      organizationId: membership.organization_id,
      actorUserId: profile.id,
      action: "login",
      metadata: { username },
    });
    const session = buildSessionUser(profile.id);
    redirect(session?.organization.setup_completed ? "/dashboard" : "/setup");
  }

  const supabase = await createServerSupabase();
  const admin = createAdminClient();
  if (!supabase || !admin) {
    return { success: false, message: "Authentication service is not configured." };
  }

  const { data: lookup } = await admin
    .from("username_lookup")
    .select("auth_email, user_id")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!lookup) {
    await admin.from("login_attempts").insert({ username, ip_address: ip, success: false });
    await writeAudit({ action: "failed_login", metadata: { username } });
    return { success: false, message: "Invalid username or password." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: lookup.auth_email,
    password,
  });

  await admin.from("login_attempts").insert({
    username,
    ip_address: ip,
    success: !error,
  });

  if (error) {
    await writeAudit({ action: "failed_login", actorUserId: lookup.user_id, metadata: { username } });
    return { success: false, message: "Invalid username or password." };
  }

  await admin
    .from("user_profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", lookup.user_id);

  const { data: membership } = await admin
    .from("organization_users")
    .select("organization_id, status, organizations(setup_completed)")
    .eq("user_id", lookup.user_id)
    .limit(1)
    .maybeSingle();

  if (!membership || membership.status === "DISABLED") {
    await supabase.auth.signOut();
    return { success: false, message: "You do not have an active organization membership." };
  }

  clearLoginRateLimit(limitKey);
  await writeAudit({
    organizationId: membership.organization_id,
    actorUserId: lookup.user_id,
    action: "login",
    metadata: { username },
  });

  const org = membership.organizations as { setup_completed?: boolean } | { setup_completed?: boolean }[] | null;
  const setupCompleted = Array.isArray(org) ? org[0]?.setup_completed : org?.setup_completed;
  redirect(setupCompleted ? "/dashboard" : "/setup");
}

export async function logoutAction() {
  const user = await getSessionUser();
  if (user) {
    await writeAudit({
      organizationId: user.organization.id,
      actorUserId: user.id,
      action: "logout",
      metadata: { username: user.username },
    });
  }

  if (!hasSupabaseConfig() || isDemoMode()) {
    await clearDemoSession();
  } else {
    const supabase = await createServerSupabase();
    await supabase?.auth.signOut();
  }
  redirect("/login");
}

export async function forgotPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ username: formData.get("username") });
  if (!parsed.success) {
    return { success: false, errors: flattenErrors(parsed.error) };
  }
  const { username } = parsed.data;

  if (!hasSupabaseConfig() || isDemoMode()) {
    const store = getDemoStore();
    const profile = store.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (profile) {
      const token = crypto.randomUUID();
      store.pendingReset[username.toLowerCase()] = {
        token,
        expiresAt: Date.now() + 30 * 60 * 1000,
      };
      return {
        success: true,
        message: "If this username exists, a reset link was issued.",
        data: { demoToken: token, username } as never,
      };
    }
    return { success: true, message: "If this username exists, a reset link was issued." };
  }

  const admin = createAdminClient();
  if (!admin) return { success: false, message: "Authentication service is not configured." };

  const { data: lookup } = await admin
    .from("username_lookup")
    .select("auth_email")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (lookup) {
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await admin.auth.resetPasswordForEmail(lookup.auth_email, {
      redirectTo: `${origin}/reset-password`,
    });
  }

  return { success: true, message: "If this username exists, password reset instructions were sent." };
}

export async function resetPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { success: false, errors: flattenErrors(parsed.error) };
  }

  const token = String(formData.get("token") ?? "");
  const username = String(formData.get("username") ?? "");

  if (!hasSupabaseConfig() || isDemoMode()) {
    const store = getDemoStore();
    const pending = store.pendingReset[username.toLowerCase()];
    if (!pending || pending.token !== token || pending.expiresAt < Date.now()) {
      return { success: false, message: "This reset link is invalid or has expired." };
    }
    store.passwords[username.toLowerCase()] = parsed.data.password;
    delete store.pendingReset[username.toLowerCase()];
    await writeAudit({ action: "password_reset", metadata: { username } });
    return { success: true, message: "Password updated. You can now sign in." };
  }

  const supabase = await createServerSupabase();
  if (!supabase) return { success: false, message: "Authentication service is not configured." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { success: false, message: error.message };
  await writeAudit({ action: "password_reset", metadata: { username } });
  return { success: true, message: "Password updated. You can now sign in." };
}

export async function changePasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { success: false, errors: flattenErrors(parsed.error) };
  }

  const user = await getSessionUser();
  if (!user) return { success: false, message: "You must be signed in." };

  if (!hasSupabaseConfig() || isDemoMode()) {
    const store = getDemoStore();
    const current = store.passwords[user.username.toLowerCase()];
    if (current !== parsed.data.currentPassword) {
      return { success: false, message: "Current password is incorrect." };
    }
    store.passwords[user.username.toLowerCase()] = parsed.data.password;
    await writeAudit({
      organizationId: user.organization.id,
      actorUserId: user.id,
      action: "password_change",
    });
    return { success: true, message: "Password changed successfully." };
  }

  const supabase = await createServerSupabase();
  if (!supabase) return { success: false, message: "Authentication service is not configured." };
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: usernameToAuthEmail(user.username),
    password: parsed.data.currentPassword,
  });
  if (signInError) return { success: false, message: "Current password is incorrect." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { success: false, message: error.message };
  await writeAudit({
    organizationId: user.organization.id,
    actorUserId: user.id,
    action: "password_change",
  });
  return { success: true, message: "Password changed successfully." };
}

export async function currentDemoUser() {
  return getDemoSessionUser();
}
