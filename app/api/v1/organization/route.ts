import { apiOk, requireApiKey } from "@/lib/api/http";
import { apiOrganization } from "@/lib/api/query";

export async function GET(request: Request) {
  const auth = await requireApiKey(request, "organization.read");
  if (!auth.ok) return auth.response;
  const data = await apiOrganization(auth.ctx.organizationId);
  return apiOk(auth.ctx, request, { data });
}
