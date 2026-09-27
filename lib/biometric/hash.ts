import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function generateDeviceToken() {
  return randomBytes(24).toString("hex");
}

export function tokenHint(token: string) {
  return token.slice(-4);
}

export function hashesEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
