import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ROLE_PERMISSIONS, DEFAULT_SMART_SETTINGS, GEOFENCE_RADIUS_PRESETS } from "@/lib/constants";
import {
  canAutoAcceptAfterVerification,
  evaluateSmartEvent,
  haversineMeters,
  inEntryWindow,
  normalizeRadius,
  qrExpired,
  radiusIsPreset,
  type EvaluationInput,
} from "@/lib/smart-attendance/engine";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getFaceProvider } from "@/lib/smart-attendance/face-provider";
import { belongsToOrganization } from "@/lib/tenancy";
import { ORG_A, ORG_B } from "./helpers/fixtures.ts";

function base(overrides: Partial<EvaluationInput> = {}): EvaluationInput {
  return {
    settings: {
      enabled: true,
      accuracy_threshold_meters: 50,
      freshness_seconds: 120,
      require_trusted_device: true,
      auto_accept_policy: "LOW_RISK_ONLY",
      entry_window_start: "00:00",
      entry_window_end: "23:59",
      exit_window_start: "00:00",
      exit_window_end: "23:59",
      duplicate_interval_seconds: 120,
      face_provider_configured: false,
      qr_fallback_enabled: true,
    },
    employeeActive: true,
    membershipActive: true,
    device: { status: "ACTIVE", employee_id: "e1" },
    workplace: { latitude: 12.9716, longitude: 77.5946, radius_meters: 100, status: "ACTIVE" },
    latitude: 12.9716,
    longitude: 77.5946,
    accuracyMeters: 12,
    occurredAt: new Date(),
    receivedAt: new Date(),
    mockLocation: false,
    integrityResult: "UNAVAILABLE",
    previousDirection: null,
    requestedDirection: "IN",
    duplicate: false,
    ...overrides,
  };
}

test("haversine accepts inside radius and rejects outside", () => {
  const inside = haversineMeters(12.9716, 77.5946, 12.9717, 77.5947);
  const outside = haversineMeters(12.9716, 77.5946, 13.01, 77.65);
  assert.ok(inside < 100);
  assert.ok(outside > 100);
  const accepted = evaluateSmartEvent(base());
  assert.equal(accepted.status, "ACCEPTED");
  assert.equal(accepted.acceptToEngine, true);
  const rejected = evaluateSmartEvent(base({ latitude: 13.01, longitude: 77.65 }));
  assert.equal(rejected.status, "REJECTED");
  assert.match(rejected.reasons.join(" "), /radius 100m/);
});

test("radius is organization-configured, not a hard-coded constant", () => {
  assert.deepEqual([...GEOFENCE_RADIUS_PRESETS], [50, 100, 150, 250]);
  assert.equal(radiusIsPreset(100), true);
  assert.equal(radiusIsPreset(75), false);
  assert.equal(normalizeRadius(10), DEFAULT_SMART_SETTINGS.geofenceRadiusMeters);
  assert.equal(normalizeRadius(5000), 2000);
  assert.equal(normalizeRadius(75), 75);
  const tight = evaluateSmartEvent(
    base({
      workplace: { latitude: 12.9716, longitude: 77.5946, radius_meters: 50, status: "ACTIVE" },
      latitude: 12.9722,
      longitude: 77.5952,
    })
  );
  assert.equal(tight.status, "REJECTED");
});

test("untrusted device is rejected when required", () => {
  const result = evaluateSmartEvent(base({ device: { status: "REVOKED", employee_id: "e1" } }));
  assert.equal(result.status, "REJECTED");
  assert.ok(result.reasons.some((row) => /unauthorized device/i.test(row)));
});

test("mock location and Play Integrity are risk signals, not automatic fraud", () => {
  const mock = evaluateSmartEvent(base({ mockLocation: true }));
  assert.equal(mock.status, "PENDING_REVIEW");
  assert.ok(mock.reasons.some((row) => /not proof of fraud/i.test(row)));
  const integrity = evaluateSmartEvent(base({ integrityResult: "MEETS_BASIC_INTEGRITY" }));
  assert.equal(integrity.risk, "MEDIUM");
  assert.equal(integrity.status, "PENDING_VERIFICATION");
});

test("duplicate idempotency does not create a second accepted event", () => {
  const result = evaluateSmartEvent(base({ duplicate: true }));
  assert.equal(result.status, "DUPLICATE");
  assert.equal(result.acceptToEngine, false);
});

test("QR expiry rejects stale tokens", () => {
  const expires = new Date("2026-01-01T10:00:00Z");
  assert.equal(qrExpired(expires, new Date("2026-01-01T10:00:01Z")), true);
  assert.equal(qrExpired(expires, new Date("2026-01-01T09:59:59Z")), false);
});

test("auto-accept policy never accepts high risk after verification", () => {
  assert.equal(canAutoAcceptAfterVerification("LOW_RISK_ONLY", "LOW", "PASSED"), true);
  assert.equal(canAutoAcceptAfterVerification("LOW_RISK_ONLY", "MEDIUM", "PASSED"), false);
  assert.equal(canAutoAcceptAfterVerification("LOW_AND_MEDIUM", "MEDIUM", "PASSED"), true);
  assert.equal(canAutoAcceptAfterVerification("OFF", "LOW", "PASSED"), false);
  assert.equal(canAutoAcceptAfterVerification("LOW_AND_MEDIUM", "HIGH", "PASSED"), false);
});

test("face provider stays unconfigured and does not invent matching", async () => {
  const provider = getFaceProvider("NONE", false);
  const result = await provider.verify({ eventId: "evt-1" });
  assert.equal(result.outcome, "UNAVAILABLE");
  assert.match(result.notes, /not claimed/i);
});

test("HMAC device signatures verify and reject tampering", () => {
  const sign = (key: string, payload: string) =>
    createHmac("sha256", key).update(payload).digest("hex");
  const verify = (key: string, payload: string, signature: string) => {
    const expected = Buffer.from(sign(key, payload));
    const actual = Buffer.from(signature);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  };
  const sig = sign("device-public-key", "idem-1");
  assert.equal(verify("device-public-key", "idem-1", sig), true);
  assert.equal(verify("device-public-key", "idem-2", sig), false);
});

test("entry window and disabled overlay reject or flag events", () => {
  const disabled = evaluateSmartEvent(base({ settings: { ...base().settings, enabled: false } }));
  assert.equal(disabled.status, "REJECTED");
  const outside = evaluateSmartEvent(
    base({
      settings: { ...base().settings, entry_window_start: "09:00", entry_window_end: "18:00" },
      occurredAt: new Date("2026-01-15T02:00:00+05:30"),
      receivedAt: new Date("2026-01-15T02:00:05+05:30"),
    })
  );
  assert.equal(outside.status, "PENDING_VERIFICATION");
  assert.equal(inEntryWindow(new Date("2026-01-15T10:00:00+05:30"), "09:00", "18:00"), true);
});

test("smart attendance permissions stay additive and employee cannot manage devices", () => {
  assert.ok(DEFAULT_ROLE_PERMISSIONS.HR.includes("attendance.smart.manage"));
  assert.ok(DEFAULT_ROLE_PERMISSIONS.HR.includes("attendance.device.manage"));
  assert.ok(DEFAULT_ROLE_PERMISSIONS.EMPLOYEE.includes("attendance.smart.view"));
  assert.equal(DEFAULT_ROLE_PERMISSIONS.EMPLOYEE.includes("attendance.smart.manage"), false);
  assert.equal(DEFAULT_ROLE_PERMISSIONS.EMPLOYEE.includes("attendance.correct"), false);
});

test("smart attendance rows remain organization-scoped", () => {
  const rows = [
    { id: "a", organization_id: ORG_A },
    { id: "b", organization_id: ORG_B },
  ];
  assert.deepEqual(belongsToOrganization(ORG_A, rows).map((row) => row.id), ["a"]);
});

test("exit window flags OUT events independently of entry window", () => {
  const outside = evaluateSmartEvent(
    base({
      requestedDirection: "OUT",
      settings: {
        ...base().settings,
        entry_window_start: "00:00",
        entry_window_end: "23:59",
        exit_window_start: "17:00",
        exit_window_end: "20:00",
      },
      occurredAt: new Date("2026-01-15T10:00:00+05:30"),
      receivedAt: new Date("2026-01-15T10:00:05+05:30"),
    })
  );
  assert.equal(outside.status, "PENDING_VERIFICATION");
  assert.match(outside.reasons.join(" "), /exit window/);
});

test("same-direction events inside the duplicate interval are not a second punch", () => {
  const result = evaluateSmartEvent(
    base({
      previousDirection: "IN",
      previousOccurredAt: new Date("2026-01-15T09:00:00Z"),
      occurredAt: new Date("2026-01-15T09:00:30Z"),
      receivedAt: new Date("2026-01-15T09:00:31Z"),
      requestedDirection: "IN",
    })
  );
  assert.equal(result.status, "DUPLICATE");
  assert.equal(result.acceptToEngine, false);
});

test("delayed geofence candidate opens an exception without inventing a punch time", async () => {
  const { getDemoStore } = await import("@/lib/demo-store");
  const { signDevicePayload } = await import("@/lib/smart-attendance/mobile-auth");
  const { recordGeofenceEvent, registerTrustedDevice, setTrustedDeviceStatus } = await import(
    "@/lib/smart-attendance/service"
  );
  const store = getDemoStore();
  const orgId = store.org.id;
  const employee = store.employees.find((item) => item.status === "ACTIVE");
  const workplace = store.attendanceLocationConfigs[0];
  const actor = store.users[0];
  assert.ok(employee && workplace && actor);
  const publicKey = `delayed-device-key-${Date.now()}`;
  const device = await registerTrustedDevice({
    organizationId: orgId,
    employeeId: employee.id,
    publicKey,
    deviceModel: "Pixel",
    osVersion: "16",
    appVersion: "1.0",
    actorId: actor.id,
  });
  await setTrustedDeviceStatus(orgId, device.id, "ACTIVE", null, actor.id);
  const punchCount = store.attendancePunches.length;
  const occurredAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const idempotencyKey = `delayed-${Date.now()}`;
  const event = await recordGeofenceEvent({
    organizationId: orgId,
    employeeId: employee.id,
    deviceId: device.id,
    workplaceId: workplace.id,
    kind: "EXIT",
    latitude: workplace.latitude,
    longitude: workplace.longitude,
    accuracyMeters: 12,
    occurredAt,
    permissionStatus: "GRANTED",
    mockLocation: false,
    integrityResult: "UNAVAILABLE",
    idempotencyKey,
    signature: signDevicePayload(publicKey, idempotencyKey),
    actorId: actor.id,
  });
  assert.notEqual(event.status, "ACCEPTED");
  assert.equal(event.occurred_at, occurredAt);
  assert.equal(store.attendancePunches.length, punchCount);
  const exception = store.attendanceExceptions.find(
    (row) => row.employee_id === employee.id && row.code === "MISSING_OUT" && row.status === "OPEN"
  );
  assert.ok(exception);
  assert.match(exception.notes ?? "", /Delayed geofence/);
});

test("retention purge drops stale evidence and never deletes punches or days", async () => {
  const { getDemoStore } = await import("@/lib/demo-store");
  const { purgeExpiredSmartEvidence } = await import("@/lib/smart-attendance/repository");
  const store = getDemoStore();
  const orgId = store.org.id;
  const punchCount = store.attendancePunches.length;
  const dayCount = store.attendanceDays.length;
  store.smartAttendanceEvents.unshift({
    id: "evt-old-purge",
    organization_id: orgId,
    employee_id: store.employees[0]?.id ?? "emp",
    device_id: null,
    workplace_id: null,
    candidate_id: null,
    source: "GEOFENCE",
    direction: "IN",
    status: "REJECTED",
    risk_level: "HIGH",
    risk_reasons: ["stale"],
    latitude: 1,
    longitude: 1,
    accuracy_meters: 10,
    occurred_at: "2020-01-01T00:00:00.000Z",
    idempotency_key: "old-purge-key",
    punch_id: null,
    notes: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: "2020-01-01T00:00:00.000Z",
    updated_at: "2020-01-01T00:00:00.000Z",
  });
  const result = await purgeExpiredSmartEvidence(orgId, "2021-01-01T00:00:00.000Z");
  assert.ok(result.events >= 1);
  assert.equal(store.smartAttendanceEvents.some((row) => row.id === "evt-old-purge"), false);
  assert.equal(store.attendancePunches.length, punchCount);
  assert.equal(store.attendanceDays.length, dayCount);
});
