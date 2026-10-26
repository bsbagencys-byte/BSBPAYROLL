import { executeDueJobs } from "@/lib/jobs/service";
import { processOutbox } from "@/lib/events/bus";
import { secureCompare } from "@/lib/crypto/secret";
import { logWarn } from "@/lib/observability/log";

export async function POST(request: Request) {
  const secret = process.env.JOBS_WORKER_SECRET ?? "";
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? request.headers.get("x-jobs-secret") ?? "";
  if (!secret || !secureCompare(header, secret)) {
    logWarn("jobs.unauthorized");
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const outbox = await processOutbox({ workerId: "internal" });
  const jobs = await executeDueJobs("internal");
  return Response.json({ ok: true, outbox, jobs });
}

export async function GET(request: Request) {
  return POST(request);
}
