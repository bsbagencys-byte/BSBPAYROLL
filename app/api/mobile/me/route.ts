import { NextRequest } from "next/server";
import { getMobileSessionUser } from "@/lib/smart-attendance/mobile-auth";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import { loadEmployeeSmart } from "@/lib/smart-attendance/service";

export async function GET(request: NextRequest) {
  const user = await getMobileSessionUser(request);
  if (!user) return Response.json({ ok: false, message: "Sign in required." }, { status: 401 });
  const identity = await resolveSelfEmployee(user);
  const smart = identity
    ? await loadEmployeeSmart(user.organization.id, identity.employee.id)
    : null;
  return Response.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.roleCode,
      organizationId: user.organization.id,
    },
    employee: identity
      ? {
          id: identity.employee.id,
          code: identity.employee.employee_code,
          name: identity.employee.display_name,
          department: identity.departmentName,
          designation: identity.designationName,
          branch: identity.branchName,
        }
      : null,
    settings: smart?.settings ?? null,
    workplaces: (smart?.workplaces ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      radiusMeters: row.radius_meters,
    })),
    devices: smart?.devices ?? [],
    events: smart?.events ?? [],
    tracking: {
      continuous: false,
      purpose: "Attendance evidence only. Location is collected for geofence or QR events, not throughout the day.",
      backgroundLocation: smart?.settings.background_location_enabled ?? false,
      preciseLocation: smart?.settings.require_precise_location ?? true,
    },
  });
}
