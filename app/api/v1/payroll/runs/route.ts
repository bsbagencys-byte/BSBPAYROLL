import { apiOk, requireApiKey } from "@/lib/api/http";
import { apiPayrollRuns } from "@/lib/api/query";

export async function GET(request: Request) {
  const auth = await requireApiKey(request, "payroll.read");
  if (!auth.ok) return auth.response;
  const data = await apiPayrollRuns(auth.ctx.organizationId);
  return apiOk(auth.ctx, request, { data });
}
