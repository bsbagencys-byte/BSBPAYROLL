import { NextRequest } from "next/server";
import { checkLoginRateLimit } from "@/lib/rate-limit";
import { DEMO_PASSWORDS, buildSessionUser, getDemoStore } from "@/lib/demo-store";
import { loadSessionUserByProfileId } from "@/lib/auth/session";
import { createMobileToken } from "@/lib/smart-attendance/mobile-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig, hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import type { SessionUser } from "@/types";

function sessionPayload(session: SessionUser, token: string) {
  return {
    ok: true,
    token,
    user: {
      id: session.id,
      username: session.username,
      displayName: session.displayName,
      role: session.roleCode,
      organizationId: session.organization.id,
      organizationName: session.organization.display_name ?? session.organization.name,
    },
  };
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = checkLoginRateLimit(`mobile:${ip}`);
  if (!limit.allowed) {
    return Response.json({ ok: false, message: "Too many requests." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string };
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!username || !password) {
    return Response.json({ ok: false, message: "Username and password are required." }, { status: 400 });
  }
  if (!hasSupabaseConfig() || isDemoMode()) {
    const expected = DEMO_PASSWORDS[username];
    if (!expected || expected !== password) {
      return Response.json({ ok: false, message: "Invalid credentials." }, { status: 401 });
    }
    const profile = getDemoStore().users.find((row) => row.username === username);
    if (!profile) return Response.json({ ok: false, message: "Invalid credentials." }, { status: 401 });
    const session = buildSessionUser(profile.id);
    if (!session) return Response.json({ ok: false, message: "Account is disabled." }, { status: 403 });
    return Response.json(sessionPayload(session, createMobileToken(profile.id)));
  }
  const admin = createAdminClient();
  const { url, anonKey } = getPublicSupabaseConfig();
  if (!admin || !url || !anonKey) {
    return Response.json({ ok: false, message: "Authentication service is not configured." }, { status: 503 });
  }
  const { data: lookup } = await admin
    .from("username_lookup")
    .select("auth_email, user_id")
    .eq("username", username)
    .maybeSingle();
  if (!lookup) {
    await admin.from("login_attempts").insert({ username, ip_address: ip, success: false });
    return Response.json({ ok: false, message: "Invalid credentials." }, { status: 401 });
  }
  const auth = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await auth.auth.signInWithPassword({
    email: lookup.auth_email,
    password,
  });
  await admin.from("login_attempts").insert({ username, ip_address: ip, success: !error });
  if (error) {
    return Response.json({ ok: false, message: "Invalid credentials." }, { status: 401 });
  }
  const session = await loadSessionUserByProfileId(lookup.user_id);
  if (!session) return Response.json({ ok: false, message: "Account is disabled." }, { status: 403 });
  await admin.from("user_profiles").update({ last_login_at: new Date().toISOString() }).eq("id", lookup.user_id);
  return Response.json(sessionPayload(session, createMobileToken(lookup.user_id)));
}
