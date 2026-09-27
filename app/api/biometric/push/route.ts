import { NextRequest } from "next/server";
import { ingestBiometricRequest } from "@/lib/biometric/gateway";
import { checkBiometricRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = checkBiometricRateLimit(`push:${ip}`);
  if (!limit.allowed) {
    return Response.json(
      { ok: false, message: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }
  const result = await ingestBiometricRequest(request, "PUSH");
  return Response.json(
    {
      ok: result.accepted,
      message: result.message,
      punches: result.punches,
      unmapped: result.unmapped,
      duplicates: result.duplicates,
    },
    { status: result.status }
  );
}

export async function GET(request: NextRequest) {
  return POST(request);
}
