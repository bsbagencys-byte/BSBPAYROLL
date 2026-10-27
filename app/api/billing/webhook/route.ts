import { processProviderWebhook } from "@/lib/billing/service";
import { logWarn } from "@/lib/observability/log";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-razorpay-signature") ?? request.headers.get("x-webhook-signature") ?? "";
  const result = await processProviderWebhook(rawBody, signature);
  if (!result.ok) {
    logWarn("billing.webhook.rejected", { message: result.message });
    return Response.json({ ok: false, error: result.message }, { status: 400 });
  }
  return Response.json({ ok: true, duplicate: result.duplicate });
}
