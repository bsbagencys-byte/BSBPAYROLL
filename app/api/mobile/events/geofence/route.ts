import { NextRequest } from "next/server";
import { jsonError, mobileRateLimit, requireMobileEmployee } from "@/lib/smart-attendance/mobile-api";
import { recordGeofenceEvent } from "@/lib/smart-attendance/service";
import { geofenceEventSchema } from "@/lib/validations/smart-attendance";

export async function POST(request: NextRequest) {
  const limited = mobileRateLimit(request, "geofence");
  if (!limited.ok) return limited.response;
  const auth = await requireMobileEmployee(request);
  if (!auth.ok) return auth.response;
  const parsed = geofenceEventSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Geofence event is incomplete.", 400);
  try {
    const event = await recordGeofenceEvent({
      organizationId: auth.user.organization.id,
      employeeId: auth.employeeId,
      deviceId: parsed.data.deviceId,
      workplaceId: parsed.data.workplaceId,
      kind: parsed.data.kind,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      accuracyMeters: parsed.data.accuracyMeters,
      occurredAt: parsed.data.occurredAt,
      permissionStatus: parsed.data.permissionStatus,
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
          ? "Event accepted into the existing punch pipeline. Attendance days are not calculated here."
          : `Event ${event.status.replaceAll("_", " ").toLowerCase()}. The app does not decide validity.`,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not record geofence event.", 400);
  }
}
