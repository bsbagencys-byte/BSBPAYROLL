import { LOGIN_RATE_LIMIT } from "@/lib/constants";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkLoginRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + LOGIN_RATE_LIMIT.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= LOGIN_RATE_LIMIT.maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearLoginRateLimit(key: string) {
  buckets.delete(key);
}
