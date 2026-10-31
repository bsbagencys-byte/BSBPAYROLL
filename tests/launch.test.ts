import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/constants";
import {
  advertisedHardwareClaimed,
  classifyFeedback,
  decideLaunch,
  defaultModuleReadiness,
  evaluateReleaseGates,
  incidentNumber,
  parallelRunSafe,
  redactHealth,
  sanitizeIncidentText,
  stagingMustNotShareProduction,
  type LaunchFacts,
} from "@/lib/launch/engine";
import { belongsToOrganization } from "@/lib/tenancy";
import { ORG_A, ORG_B } from "./helpers/fixtures.ts";

function facts(overrides: Partial<LaunchFacts> = {}): LaunchFacts {
  return {
    modules: defaultModuleReadiness().map((row) => ({ key: row.key, status: row.status })),
    blockers: [
      { severity: "CRITICAL", status: "OPEN" },
      { severity: "HIGH", status: "OPEN" },
    ],
    gates: [],
    pilots: [{ status: "PREPARED" }],
    biometric: [
      { method: "SIMULATED", advertised: false, result: "PARTIAL" },
      { method: "SIMULATED", advertised: false, result: "NOT_TESTED" },
    ],
    parallelRuns: [
      { status: "DRAFT", mismatch_count: 0, finalized: false },
      { status: "DRAFT", mismatch_count: 0, finalized: false },
    ],
    uat: [{ status: "NOT_TESTED" }, { status: "BLOCKED" }],
    openCriticalIncidents: 0,
    ...overrides,
  };
}

test("current evidence yields NOT READY and does not claim hardware", () => {
  const verdict = decideLaunch(facts());
  assert.equal(verdict.decision, "NOT_READY");
  assert.match(verdict.summary, /NOT READY/);
  assert.equal(advertisedHardwareClaimed(facts().biometric), false);
  const attendance = defaultModuleReadiness().find((row) => row.key === "ATTENDANCE");
  assert.equal(attendance?.status, "BLOCKED");
});

test("advertised unverified hardware and finalized pilot payroll fail launch", () => {
  assert.equal(
    advertisedHardwareClaimed([{ method: "SIMULATED", advertised: true, result: "PARTIAL" }]),
    true
  );
  assert.equal(parallelRunSafe([{ status: "COMPARED", mismatch_count: 0, finalized: true }]), false);
  const verdict = decideLaunch(facts({
    biometric: [{ method: "API_TESTED", advertised: true, result: "PARTIAL" }],
    parallelRuns: [{ status: "COMPARED", mismatch_count: 0, finalized: true }],
  }));
  assert.equal(verdict.decision, "NOT_READY");
});

test("release gates stay failed without restore, UAT, statutory and sign-off evidence", () => {
  const gates = evaluateReleaseGates(facts());
  const map = Object.fromEntries(gates.map((gate) => [gate.gate_key, gate.passing]));
  assert.equal(map.STATUTORY, false);
  assert.equal(map.BIOMETRIC_HARDWARE, false);
  assert.equal(map.BACKUP_RESTORE, false);
  assert.equal(map.UAT, false);
  assert.equal(map.PILOT_SIGNOFF, false);
  assert.equal(map.ROLLBACK_DOCS, true);
});

test("incident text redacts secrets and PAN-like values", () => {
  const text = sanitizeIncidentText("password=Admin@123 PAN ABCDE1234F account 123456789012");
  assert.equal(/Admin@123/.test(text), false);
  assert.equal(/ABCDE1234F/.test(text), false);
  assert.equal(/123456789012/.test(text), false);
  assert.equal(incidentNumber(1), "INC-00001");
  assert.equal(redactHealth(JSON.stringify({ ok: true })), true);
  assert.equal(redactHealth("SUPABASE_SERVICE_ROLE_KEY=secret"), false);
});

test("defects stay separate from feature requests and ADMIN cannot manage launch", () => {
  assert.equal(classifyFeedback("FEATURE_REQUEST", "LOW"), "backlog");
  assert.equal(classifyFeedback("DEFECT", "CRITICAL"), "defect-priority");
  assert.equal(DEFAULT_ROLE_PERMISSIONS.ADMIN.includes("launch.manage"), false);
  assert.equal(DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN.includes("launch.manage"), true);
  assert.equal(DEFAULT_ROLE_PERMISSIONS.HR.includes("launch.view"), false);
});

test("pilot tenants remain organization-scoped", () => {
  const rows = [
    { organization_id: ORG_A, id: "pilot-a" },
    { organization_id: ORG_B, id: "pilot-b" },
  ];
  assert.deepEqual(belongsToOrganization(ORG_A, rows).map((row) => row.id), ["pilot-a"]);
});

test("staging URL must not equal production URL", () => {
  assert.equal(stagingMustNotShareProduction("https://staging.example", "https://app.example"), true);
  assert.equal(stagingMustNotShareProduction("https://app.example/", "https://app.example"), false);
  assert.equal(stagingMustNotShareProduction(null, "https://app.example"), true);
});
