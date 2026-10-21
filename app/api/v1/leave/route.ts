import { apiOk, requireApiKey } from "@/lib/api/http";
import { apiLeave } from "@/lib/api/query";

export async function GET(request: Request) {
  const auth = await requireApiKey(request, "leave.read");
  if (!auth.ok) return auth.response;
  const data = await apiLeave(auth.ctx.organizationId);
  return apiOk(auth.ctx, request, { data });
}
