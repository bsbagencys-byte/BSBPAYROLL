import { apiOk, requireApiKey } from "@/lib/api/http";
import { apiPayslips } from "@/lib/api/query";

export async function GET(request: Request) {
  const auth = await requireApiKey(request, "payslips.read");
  if (!auth.ok) return auth.response;
  const data = await apiPayslips(auth.ctx.organizationId);
  return apiOk(auth.ctx, request, { data });
}
