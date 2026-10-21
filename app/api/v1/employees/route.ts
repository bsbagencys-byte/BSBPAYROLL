import { apiOk, pageParams, requireApiKey } from "@/lib/api/http";
import { apiEmployees } from "@/lib/api/query";

export async function GET(request: Request) {
  const auth = await requireApiKey(request, "employees.read");
  if (!auth.ok) return auth.response;
  const all = await apiEmployees(auth.ctx.organizationId);
  const { page, perPage, offset } = pageParams(new URL(request.url));
  return apiOk(auth.ctx, request, { data: all.slice(offset, offset + perPage), page, per_page: perPage, total: all.length });
}
