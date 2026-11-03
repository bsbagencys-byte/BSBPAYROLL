import { NextRequest } from "next/server";
import { jsonError, mobileRateLimit, requireMobileEmployee } from "@/lib/smart-attendance/mobile-api";
import { registerTrustedDevice } from "@/lib/smart-attendance/service";
import { deviceRegisterSchema } from "@/lib/validations/smart-attendance";

export async function POST(request: NextRequest) {
  const limited = mobileRateLimit(request, "device");
  if (!limited.ok) return limited.response;
  const auth = await requireMobileEmployee(request);
  if (!auth.ok) return auth.response;
  const parsed = deviceRegisterSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Device registration is incomplete.", 400);
  try {
    const device = await registerTrustedDevice({
      organizationId: auth.user.organization.id,
      employeeId: auth.employeeId,
      publicKey: parsed.data.publicKey,
      deviceModel: parsed.data.deviceModel,
      osVersion: parsed.data.osVersion,
      appVersion: parsed.data.appVersion,
      attestationKind: parsed.data.attestationKind,
      attestationResult: parsed.data.attestationResult,
      actorId: auth.user.id,
    });
    return Response.json({
      ok: true,
      device,
      message:
        device.status === "ACTIVE"
          ? "Trusted device updated."
          : "Device registered and pending HR activation. Attendance from unauthorized devices is rejected.",
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not register device.", 400);
  }
}
