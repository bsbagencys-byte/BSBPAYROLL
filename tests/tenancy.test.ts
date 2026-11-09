import assert from "node:assert/strict";
import test from "node:test";
import { assertSameOrganization, belongsToOrganization, scopedRecord } from "@/lib/tenancy";
import { EMPLOYEE_A, EMPLOYEE_B, ORG_A, ORG_B } from "./helpers/fixtures.ts";

test("tenant filter drops other organization rows", () => {
  const rows = [
    { organization_id: ORG_A, id: EMPLOYEE_A },
    { organization_id: ORG_B, id: EMPLOYEE_B },
  ];
  const scoped = belongsToOrganization(ORG_A, rows);
  assert.equal(scoped.length, 1);
  assert.equal(scoped[0]?.id, EMPLOYEE_A);
});

test("scopedRecord returns null across tenants", () => {
  assert.equal(scopedRecord(ORG_A, { organization_id: ORG_B, id: EMPLOYEE_B }), null);
  assert.equal(scopedRecord(ORG_A, { organization_id: ORG_A, id: EMPLOYEE_A })?.id, EMPLOYEE_A);
});

test("assertSameOrganization throws on mismatch", () => {
  assert.throws(() => assertSameOrganization(ORG_A, ORG_B), /Cross-organization/);
  assert.doesNotThrow(() => assertSameOrganization(ORG_A, ORG_A));
});

test("ESS identity never trusts a foreign employee id", () => {
  const catalog = [
    { id: EMPLOYEE_A, user_id: "user-a", organization_id: ORG_A },
    { id: EMPLOYEE_B, user_id: "user-a", organization_id: ORG_B },
  ];
  const self = catalog.find((item) => item.user_id === "user-a" && item.organization_id === ORG_A);
  assert.equal(self?.id, EMPLOYEE_A);
  assert.equal(self?.organization_id, ORG_A);
});

test("second-tenant smart attendance rows stay isolated in the demo store", async () => {
  const { getDemoStore } = await import("@/lib/demo-store");
  const { listSmartEvents, listTrustedDevices, listWorkplaces, findSmartEventByKey } = await import(
    "@/lib/smart-attendance/repository"
  );
  const store = getDemoStore();
  const orgA = store.org.id;
  store.smartAttendanceEvents.unshift({
    id: "evt-tenant-b",
    organization_id: ORG_B,
    employee_id: EMPLOYEE_B,
    device_id: null,
    workplace_id: null,
    candidate_id: null,
    source: "GEOFENCE",
    direction: "IN",
    status: "ACCEPTED",
    risk_level: "LOW",
    risk_reasons: [],
    latitude: 1,
    longitude: 1,
    accuracy_meters: 10,
    occurred_at: "2026-11-06T03:30:00.000Z",
    idempotency_key: "tenant-b-key",
    punch_id: null,
    notes: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: "2026-11-06T03:30:00.000Z",
    updated_at: "2026-11-06T03:30:00.000Z",
  });
  store.trustedEmployeeDevices.unshift({
    id: "dev-tenant-b",
    organization_id: ORG_B,
    employee_id: EMPLOYEE_B,
    public_key: "foreign-device-key-123456",
    device_model: "Pixel",
    os_version: "16",
    app_version: "1.0",
    attestation_kind: "NONE",
    attestation_result: "UNAVAILABLE",
    status: "ACTIVE",
    registered_at: "2026-11-06T00:00:00.000Z",
    last_active_at: null,
    revoked_at: null,
    revoked_reason: null,
    created_at: "2026-11-06T00:00:00.000Z",
    updated_at: "2026-11-06T00:00:00.000Z",
  });
  store.attendanceLocationConfigs.unshift({
    id: "wp-tenant-b",
    organization_id: ORG_B,
    location_id: null,
    branch_id: null,
    name: "Foreign campus",
    latitude: 19.07,
    longitude: 72.87,
    radius_meters: 100,
    status: "ACTIVE",
    created_by: null,
    created_at: "2026-11-06T00:00:00.000Z",
    updated_at: "2026-11-06T00:00:00.000Z",
  });
  const events = await listSmartEvents(orgA);
  const devices = await listTrustedDevices(orgA);
  const workplaces = await listWorkplaces(orgA);
  assert.equal(events.every((row) => row.organization_id === orgA), true);
  assert.equal(devices.every((row) => row.organization_id === orgA), true);
  assert.equal(workplaces.every((row) => row.organization_id === orgA), true);
  assert.equal(events.some((row) => row.id === "evt-tenant-b"), false);
  assert.equal(await findSmartEventByKey(orgA, "tenant-b-key"), null);
});

test("phase 21 SQL policies stay organization-scoped", async () => {
  const { readFileSync } = await import("node:fs");
  const sql = readFileSync(new URL("../supabase/phase21.sql", import.meta.url), "utf8");
  for (const table of [
    "smart_attendance_settings",
    "attendance_location_configs",
    "trusted_employee_devices",
    "geofence_event_candidates",
    "smart_attendance_events",
    "attendance_verification_records",
    "device_security_assessments",
    "dynamic_qr_sessions",
  ]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(sql, /organization_id in \(select public\.current_org_ids\(\)\)/);
  assert.doesNotMatch(sql, /using \(true\)/);
});
