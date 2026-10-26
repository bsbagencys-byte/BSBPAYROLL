import assert from "node:assert/strict";
import test from "node:test";
import { decryptSecret, encryptSecret, secureCompare } from "@/lib/crypto/secret";
import { collectHealth } from "@/lib/observability/health";

test("secureCompare is length-safe", () => {
  assert.equal(secureCompare("abc", "abc"), true);
  assert.equal(secureCompare("abc", "abd"), false);
  assert.equal(secureCompare("abc", "ab"), false);
});

test("encryptSecret is a no-op without SESSION_SECRET", () => {
  const previous = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "";
  assert.equal(encryptSecret("whsec_test"), null);
  process.env.SESSION_SECRET = "unit-test-session-secret-value";
  const packed = encryptSecret("whsec_test");
  assert.ok(packed?.startsWith("v1:"));
  assert.equal(decryptSecret(packed), "whsec_test");
  assert.equal(decryptSecret("v1:00:00:00"), null);
  process.env.SESSION_SECRET = previous;
});

test("health payload never includes secrets", () => {
  const health = collectHealth();
  const text = JSON.stringify(health);
  assert.equal(/service_role|password|whsec_|bsb_live_/i.test(text), false);
  assert.equal(health.ok, true);
  assert.equal(health.limitations.attendanceCalculation, false);
});
