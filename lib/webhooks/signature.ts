import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function generateWebhookSecret() {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

export function signWebhookPayload(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function verifyWebhookSignature(secret: string, timestamp: string, body: string, signature: string) {
  const expected = signWebhookPayload(secret, timestamp, body);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
