import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/constants";
import {
  canConfirmImport,
  evaluateOnboarding,
  exportExpiresAt,
  historicalPayrollNotes,
  importOutcome,
  isSlaBreached,
  maskSecret,
  nextTicketStatus,
  onboardingComplete,
  rejectNonCsv,
  requiredColumns,
  slaDueAt,
  splitCsv,
  ticketNumber,
  type OnboardingFacts,
} from "@/lib/onboarding/engine";
import { belongsToOrganization } from "@/lib/tenancy";
import { ORG_A, ORG_B } from "./helpers/fixtures.ts";

function facts(overrides: Partial<OnboardingFacts> = {}): OnboardingFacts {
  return {
    companyComplete: true,
    companyEvidence: ["Name", "Legal name", "Timezone"],
    branchCount: 1,
    departmentCount: 1,
    employeeCount: 3,
    statutoryConfigured: true,
    salaryStructureCount: 1,
    leaveTypeCount: 4,
    biometricDeviceCount: 1,
    userCount: 4,
    skippedAttendance: false,
    ...overrides,
  };
}

test("onboarding is complete only when required steps have stored data", () => {
  const ready = evaluateOnboarding(facts());
  assert.equal(onboardingComplete(ready), true);
  const empty = evaluateOnboarding(facts({
    companyComplete: false,
    companyEvidence: [],
    branchCount: 0,
    departmentCount: 0,
    employeeCount: 0,
    statutoryConfigured: false,
    salaryStructureCount: 0,
    leaveTypeCount: 0,
    userCount: 0,
  }));
  assert.equal(onboardingComplete(empty), false);
  assert.equal(empty.find((step) => step.step_key === "COMPANY")?.status, "NOT_STARTED");
});

test("opening attendance does not complete onboarding and skip stays optional", () => {
  const blocked = evaluateOnboarding(facts());
  const attendance = blocked.find((step) => step.step_key === "ATTENDANCE");
  assert.equal(attendance?.status, "BLOCKED");
  assert.equal(attendance?.required, false);
  const skipped = evaluateOnboarding(facts({ skippedAttendance: true }));
  assert.equal(skipped.find((step) => step.step_key === "ATTENDANCE")?.status, "SKIPPED");
  assert.equal(onboardingComplete(evaluateOnboarding(facts({ employeeCount: 0, skippedAttendance: true }))), false);
});

test("xlsx is rejected and csv preview columns are required", () => {
  assert.equal(rejectNonCsv("staff.xlsx"), "Excel files are not imported. Upload CSV only.");
  assert.equal(rejectNonCsv("staff.xls"), "Excel files are not imported. Upload CSV only.");
  assert.equal(rejectNonCsv("staff.csv"), null);
  assert.deepEqual(requiredColumns("EMPLOYEES").slice(0, 3), ["employee_id", "first_name", "last_name"]);
});

test("confirm is only allowed after preview and never from upload alone", () => {
  assert.equal(canConfirmImport("UPLOADED"), false);
  assert.equal(canConfirmImport("PREVIEWED"), true);
  assert.equal(canConfirmImport("IMPORTED"), false);
  assert.equal(importOutcome(2, 0, 2), "IMPORTED");
  assert.equal(importOutcome(1, 1, 2), "PARTIAL");
  assert.equal(importOutcome(0, 2, 2), "FAILED");
});

test("historical payroll is labelled imported and is not BSB-calculated", () => {
  const notes = historicalPayrollNotes("2025-12");
  assert.match(notes, /Imported historical payroll/);
  assert.match(notes, /Not calculated by BSB Payroll/);
});

test("csv splitter keeps quoted commas", () => {
  const rows = splitCsv('employee_id,first_name\nBSB-1,"Nair, Anita"');
  assert.equal(rows[1][1], "Nair, Anita");
});

test("support tickets stay org-isolated and SLA hours are explicit", () => {
  const tickets = [
    { id: "t1", organization_id: ORG_A },
    { id: "t2", organization_id: ORG_B },
  ];
  assert.deepEqual(belongsToOrganization(ORG_A, tickets).map((row) => row.id), ["t1"]);
  const due = new Date(slaDueAt("URGENT", new Date("2026-01-01T00:00:00.000Z")));
  assert.equal(due.toISOString(), "2026-01-01T04:00:00.000Z");
  assert.equal(ticketNumber(1), "SUP-00001");
  assert.equal(isSlaBreached("2020-01-01T00:00:00.000Z", "OPEN"), true);
  assert.equal(isSlaBreached("2020-01-01T00:00:00.000Z", "CLOSED"), false);
  assert.equal(nextTicketStatus("OPEN", "close"), "CLOSED");
  assert.equal(nextTicketStatus("CLOSED", "reply"), "CLOSED");
});

test("export TTL is 72 hours and secrets are masked", () => {
  const from = new Date("2026-01-01T00:00:00.000Z");
  assert.equal(exportExpiresAt(from), "2026-01-04T00:00:00.000Z");
  assert.equal(maskSecret("9876543210"), "98****10");
  assert.equal(maskSecret("12"), "****");
});

test("platform support and ops permissions stay SUPER_ADMIN-only", () => {
  assert.equal(DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN.includes("support.platform"), true);
  assert.equal(DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN.includes("platform.ops"), true);
  assert.equal(DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN.includes("data.offboard"), true);
  assert.equal(DEFAULT_ROLE_PERMISSIONS.ADMIN.includes("support.platform"), false);
  assert.equal(DEFAULT_ROLE_PERMISSIONS.ADMIN.includes("platform.ops"), false);
  assert.equal(DEFAULT_ROLE_PERMISSIONS.ADMIN.includes("data.offboard"), false);
  assert.equal(DEFAULT_ROLE_PERMISSIONS.HR.includes("onboarding.manage"), true);
  assert.equal(DEFAULT_ROLE_PERMISSIONS.EMPLOYEE.includes("support.create"), true);
  assert.equal(DEFAULT_ROLE_PERMISSIONS.EMPLOYEE.includes("migration.manage"), false);
});
