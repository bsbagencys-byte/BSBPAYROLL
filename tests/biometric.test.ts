import assert from "node:assert/strict";
import test from "node:test";
import { genericAdapter } from "@/lib/biometric/adapters/generic";
import { parseWithVendor } from "@/lib/biometric/adapters";
import { sha256, hashesEqual } from "@/lib/biometric/hash";
import { parsePunchTime } from "@/lib/biometric/time";

const context = {
  contentType: "application/json",
  headers: {},
  searchParams: new URLSearchParams(),
  timezone: "Asia/Kolkata",
  rawBody: "",
};

test("generic adapter maps a punch", () => {
  const result = genericAdapter.parse(
    { deviceUserId: "101", punchedAt: "2026-01-15T09:00:00+05:30", direction: "IN" },
    context
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.events[0]?.deviceUserId, "101");
    assert.equal(result.events[0]?.direction, "IN");
  }
});

test("duplicate identity is device + user + punched_at", () => {
  const first = genericAdapter.parse({ userId: "101", timestamp: "2026-01-15T09:00:00+05:30" }, context);
  const second = genericAdapter.parse({ userId: "101", timestamp: "2026-01-15T09:00:00+05:30" }, context);
  assert.equal(first.ok && second.ok, true);
  if (first.ok && second.ok) {
    assert.equal(first.events[0]?.deviceUserId, second.events[0]?.deviceUserId);
    assert.equal(first.events[0]?.punchedAt.toISOString(), second.events[0]?.punchedAt.toISOString());
  }
});

test("unmapped punch is still a valid parse with device user id", () => {
  const result = parseWithVendor("GENERIC", { deviceUserId: "unmapped-9", punchedAt: "2026-01-15T18:00:00+05:30" }, context);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.events[0]?.deviceUserId, "unmapped-9");
});

test("token hashes compare in constant time", () => {
  const hash = sha256("demo-essl-ho-token");
  assert.equal(hashesEqual(hash, sha256("demo-essl-ho-token")), true);
  assert.equal(hashesEqual(hash, sha256("other")), false);
});

test("invalid punch time is rejected", () => {
  assert.equal(parsePunchTime("not-a-date", "Asia/Kolkata"), null);
  assert.ok(parsePunchTime("2026-01-15 09:00:00", "Asia/Kolkata"));
});
