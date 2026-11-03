import { NextRequest } from "next/server";
import { checkLoginRateLimit } from "@/lib/rate-limit";
import { DEMO_PASSWORDS, buildSessionUser, getDemoStore } from "@/lib/demo-store";
import { createMobileToken } from "@/lib/smart-attendance/mobile-auth";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";

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
    const token = createMobileToken(profile.id);
    return Response.json({
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
    });
  }
  return Response.json(
    { ok: false, message: "Mobile login against live Supabase is not enabled in this overlay. Use demo mode or the web session." },
    { status: 501 }
  );
}
