import { NextRequest } from "next/server";
import { jsonError, mobileRateLimit, requireMobileEmployee } from "@/lib/smart-attendance/mobile-api";
import { scanQr } from "@/lib/smart-attendance/service";
import { qrScanSchema } from "@/lib/validations/smart-attendance";

export async function POST(request: NextRequest) {
  const limited = mobileRateLimit(request, "qr");
  if (!limited.ok) return limited.response;
  const auth = await requireMobileEmployee(request);
  if (!auth.ok) return auth.response;
  const parsed = qrScanSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("QR scan is incomplete.", 400);
  try {
    const event = await scanQr({
      organizationId: auth.user.organization.id,
      employeeId: auth.employeeId,
      deviceId: parsed.data.deviceId,
      token: parsed.data.token,
      pin: parsed.data.pin,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      accuracyMeters: parsed.data.accuracyMeters,
      occurredAt: parsed.data.occurredAt,
      mockLocation: parsed.data.mockLocation,
      integrityResult: parsed.data.integrityResult,
      idempotencyKey: parsed.data.idempotencyKey,
      signature: parsed.data.signature,
      actorId: auth.user.id,
    });
    return Response.json({
      ok: true,
      event,
      accepted: event.status === "ACCEPTED",
      message:
        event.status === "ACCEPTED"
          ? "Dynamic QR accepted. Permanent static QR codes are not valid."
          : `QR event ${event.status.replaceAll("_", " ").toLowerCase()}.`,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not scan QR.", 400);
  }
}
