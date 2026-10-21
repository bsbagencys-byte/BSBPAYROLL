import { reportCsvResponse } from "@/lib/reports/csv";
import type { ReportFilters } from "@/lib/reports/query";

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const url = new URL(request.url);
  const filters: ReportFilters = {
    period: url.searchParams.get("period") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    branchId: url.searchParams.get("branchId") ?? undefined,
    departmentId: url.searchParams.get("departmentId") ?? undefined,
    employeeId: url.searchParams.get("employeeId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  };
  return reportCsvResponse(decodeURIComponent(key), filters);
}
