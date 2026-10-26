import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeWebhookUrl } from "@/lib/webhooks/ssrf";
import { signWebhookPayload, verifyWebhookSignature } from "@/lib/webhooks/signature";

test("webhook SSRF blocks localhost and private hosts", async () => {
  await assert.rejects(() => assertSafeWebhookUrl("http://localhost/hook"), /not allowed|private/i);
  await assert.rejects(() => assertSafeWebhookUrl("http://127.0.0.1/hook"), /private/i);
  await assert.rejects(() => assertSafeWebhookUrl("http://10.0.0.8/hook"), /private/i);
  await assert.rejects(() => assertSafeWebhookUrl("http://169.254.169.254/latest"), /private/i);
  await assert.rejects(() => assertSafeWebhookUrl("ftp://example.com/hook"), /HTTP or HTTPS/i);
});

test("HMAC signature verifies only the matching secret", () => {
  const body = JSON.stringify({ id: "evt_1" });
  const signature = signWebhookPayload("whsec_test", "1700000000", body);
  assert.equal(verifyWebhookSignature("whsec_test", "1700000000", body, signature), true);
  assert.equal(verifyWebhookSignature("whsec_other", "1700000000", body, signature), false);
});
