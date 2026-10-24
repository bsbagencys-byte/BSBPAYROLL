import { analyticsCsvResponse } from "@/lib/analytics/csv";

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const url = new URL(request.url);
  return analyticsCsvResponse(kind, url.searchParams.get("period") ?? undefined);
}
