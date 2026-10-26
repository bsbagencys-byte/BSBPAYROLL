import assert from "node:assert/strict";
import test from "node:test";
import { prorate, roundMoney, summarizeAttendance, eligibleEmployee } from "@/lib/payroll/engine";
import { quoteLoan } from "@/lib/loans/engine";
import { evaluateFormula } from "@/lib/salary/formula";
import { canCancelRun, canFinalize, canRecalculate, isPayrollImmutable } from "@/lib/payroll/workflow";
import { exitBlocksOrdinaryPayroll } from "@/lib/exits/eligibility";
import { genericAdapter } from "@/lib/biometric/adapters/generic";
import { attendanceDay, EMPLOYEE_A, ORG_A } from "./helpers/fixtures.ts";

const adapterContext = {
  contentType: "application/json",
  headers: {},
  searchParams: new URLSearchParams(),
  timezone: "Asia/Kolkata",
  rawBody: "",
};

test("journey A: join employee, assign salary, leave, payroll — attendance calc skipped (Phase 4)", () => {
  const salary = evaluateFormula("BASIC * 0.4", { BASIC: 25000 });
  assert.equal(salary.ok, true);
  const attendance = summarizeAttendance({
    from: "2026-01-01",
    to: "2026-01-31",
    weeklyOff: "SUNDAY",
    holidays: [],
    days: [attendanceDay("2026-01-05", "PAID_LEAVE") as never],
    joiningDate: "2026-01-01",
  });
  assert.equal(attendance.paidLeaveDays, 1);
  assert.ok(attendance.presentDays > 0, "unmarked working days paid until Phase 4");
  const net = roundMoney(prorate(25000, attendance.paidDays, attendance.workingDays));
  assert.ok(net > 0);
  assert.equal(eligibleEmployee({ status: "ACTIVE", id: EMPLOYEE_A } as never, { joining_date: "2026-01-01" } as never, "2026-01-31").ok, true);
});

test("journey B: punch ingest maps or stays unmapped; day calc not claimed", () => {
  const mapped = genericAdapter.parse({ deviceUserId: "101", punchedAt: "2026-01-15T09:00:00+05:30" }, adapterContext);
  const retry = genericAdapter.parse({ deviceUserId: "101", punchedAt: "2026-01-15T09:00:00+05:30" }, adapterContext);
  assert.equal(mapped.ok && retry.ok, true);
  if (mapped.ok && retry.ok) {
    assert.equal(mapped.events[0]?.punchedAt.toISOString(), retry.events[0]?.punchedAt.toISOString());
  }
  const unmapped = genericAdapter.parse({ deviceUserId: "no-map", punchedAt: "2026-01-15T18:00:00+05:30" }, adapterContext);
  assert.equal(unmapped.ok, true);
});

test("journey C: leave unpaid day becomes LOP in payroll summary", () => {
  const summary = summarizeAttendance({
    from: "2026-01-05",
    to: "2026-01-05",
    weeklyOff: "SUNDAY",
    holidays: [],
    days: [attendanceDay("2026-01-05", "UNPAID_LEAVE") as never],
    joiningDate: null,
  });
  assert.equal(summary.lopDays, 1);
  assert.equal(summary.paidDays, 0);
});

test("journey D: loan EMI is quoted before payroll deduction", () => {
  const quote = quoteLoan({ principal: 20000, tenureMonths: 4, interestMethod: "NONE", interestRate: 0, startDate: "2026-01-01" });
  assert.equal(quote.emiAmount, 5000);
  assert.equal(quote.schedule.length, 4);
});

test("journey E: finalize then lock is immutable; cancel blocked", () => {
  assert.equal(canFinalize("APPROVED"), true);
  assert.equal(isPayrollImmutable("FINALIZED"), true);
  assert.equal(canRecalculate("FINALIZED"), false);
  assert.equal(canCancelRun("FINALIZED"), false);
  assert.equal(canCancelRun("PROCESSED"), false);
});

test("journey F: exit before period excludes from ordinary payroll", () => {
  assert.equal(
    exitBlocksOrdinaryPayroll({ employee_id: EMPLOYEE_A, status: "SETTLED", last_working_date: "2025-12-31" }, EMPLOYEE_A, "2026-01-01"),
    true
  );
  assert.equal(
    exitBlocksOrdinaryPayroll({ employee_id: EMPLOYEE_A, status: "DRAFT", last_working_date: "2025-12-31" }, EMPLOYEE_A, "2026-01-01"),
    false
  );
  assert.equal(
    exitBlocksOrdinaryPayroll({ employee_id: EMPLOYEE_A, status: "APPROVED", last_working_date: "2026-01-15" }, EMPLOYEE_A, "2026-01-01"),
    false
  );
});

test("synthetic fixtures never use production identifiers", () => {
  assert.equal(ORG_A.startsWith("org-"), true);
  assert.equal(EMPLOYEE_A.startsWith("emp-synthetic"), true);
});
