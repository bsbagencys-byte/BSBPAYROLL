import { apiOk, requireApiKey } from "@/lib/api/http";
import { apiAttendanceSummaries } from "@/lib/api/query";

export async function GET(request: Request) {
  const auth = await requireApiKey(request, "attendance.read");
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const data = await apiAttendanceSummaries(auth.ctx.organizationId, url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined);
  return apiOk(auth.ctx, request, { data });
}
