import { collectHealth } from "@/lib/observability/health";

export async function GET() {
  const health = collectHealth();
  return Response.json(health, { status: 200 });
}
