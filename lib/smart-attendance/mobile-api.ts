import { NextRequest } from "next/server";
import { employeeIdForUser } from "@/lib/ess/identity";
import { checkSmartAttendanceRateLimit } from "@/lib/rate-limit";
import { getMobileSessionUser } from "@/lib/smart-attendance/mobile-auth";
import type { SessionUser } from "@/types";

export function jsonError(message: string, status: number) {
  return Response.json({ ok: false, message }, { status });
}

export function mobileRateLimit(request: NextRequest, bucket: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = checkSmartAttendanceRateLimit(`${bucket}:${ip}`);
  if (!limit.allowed) {
    return {
      ok: false as const,
      response: Response.json(
        { ok: false, message: "Too many requests." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      ),
    };
  }
  return { ok: true as const };
}

export async function requireMobileEmployee(request: NextRequest): Promise<
  | { ok: true; user: SessionUser; employeeId: string }
  | { ok: false; response: Response }
> {
  const user = await getMobileSessionUser(request);
  if (!user) return { ok: false, response: jsonError("Sign in required.", 401) };
  const employeeId = await employeeIdForUser(user.organization.id, user.id);
  if (!employeeId) return { ok: false, response: jsonError("No employee record is linked to this user.", 403) };
  return { ok: true, user, employeeId };
}
