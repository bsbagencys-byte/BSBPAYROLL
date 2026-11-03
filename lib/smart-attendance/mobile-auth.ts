import { createHmac, timingSafeEqual } from "node:crypto";
import { buildSessionUser } from "@/lib/demo-store";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import type { SessionUser } from "@/types";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function signingKey() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret !== "replace-with-a-long-random-string") return secret;
  return "bsb-demo-mobile-token";
}

export function createMobileToken(userId: string, now = Date.now()) {
  const payload = `${userId}.${now}`;
  const sig = createHmac("sha256", signingKey()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function parseMobileToken(token: string): { userId: string; issuedAt: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 3) return null;
    const [userId, issuedRaw, signature] = parts;
    const issuedAt = Number(issuedRaw);
    if (!userId || !Number.isFinite(issuedAt)) return null;
    if (Date.now() - issuedAt > TOKEN_TTL_MS) return null;
    const expected = createHmac("sha256", signingKey()).update(`${userId}.${issuedRaw}`).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { userId, issuedAt };
  } catch {
    return null;
  }
}

export async function getMobileSessionUser(request: Request): Promise<SessionUser | null> {
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (header) {
    const parsed = parseMobileToken(header);
    if (parsed && (!hasSupabaseConfig() || isDemoMode())) {
      const user = buildSessionUser(parsed.userId);
      if (!user || user.status === "DISABLED" || user.membershipStatus === "DISABLED") return null;
      if (user.organization.status === "SUSPENDED") return null;
      return user;
    }
  }
  return getSessionUser();
}

export function signDevicePayload(publicKey: string, payload: string) {
  return createHmac("sha256", publicKey).update(payload).digest("hex");
}

export function verifyDeviceSignature(publicKey: string, payload: string, signature: string) {
  const expected = signDevicePayload(publicKey, payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
