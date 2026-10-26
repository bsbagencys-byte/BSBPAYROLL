import assert from "node:assert/strict";
import test from "node:test";
import {
  eligibleEmployee,
  periodBounds,
  prorate,
  roundMoney,
  summarizeAttendance,
} from "@/lib/payroll/engine";
import { attendanceDay, EMPLOYEE_A, ORG_A } from "./helpers/fixtures.ts";

test("roundMoney keeps two decimal places", () => {
  assert.equal(roundMoney(10.1), 10.1);
  assert.equal(roundMoney(10.126), 10.13);
  assert.equal(roundMoney(0), 0);
});

test("prorate pays full amount when paid days cover working days", () => {
  assert.equal(prorate(26000, 26, 26), 26000);
  assert.equal(prorate(26000, 13, 26), 13000);
  assert.equal(prorate(1000, 1, 0), 0);
});

test("periodBounds returns calendar month inclusive dates", () => {
  assert.deepEqual(periodBounds("2026-02"), { from: "2026-02-01", to: "2026-02-28", daysInMonth: 28 });
  assert.equal(periodBounds("2024-02").daysInMonth, 29);
});

test("summarizeAttendance treats unmarked working days as paid until Phase 4", () => {
  const summary = summarizeAttendance({
    from: "2026-01-01",
    to: "2026-01-07",
    weeklyOff: "SUNDAY",
    holidays: [
      {
        id: "h1",
        organization_id: ORG_A,
        name: "Test holiday",
        holiday_date: "2026-01-01",
        holiday_type: "NATIONAL",
        status: "ACTIVE",
        created_at: "",
        updated_at: "",
      } as never,
    ],
    days: [attendanceDay("2026-01-02", "UNPAID_LEAVE") as never],
    joiningDate: null,
  });
  assert.equal(summary.holidayDays, 1);
  assert.equal(summary.weeklyOffDays, 1);
  assert.equal(summary.lopDays, 1);
  assert.ok(summary.paidDays > 0);
  assert.ok(summary.presentDays >= 3, "unmarked weekdays remain paid without Phase 4");
});

test("eligibleEmployee rejects inactive and post-period joiners", () => {
  const employment = { joining_date: "2026-02-01" } as never;
  assert.equal(eligibleEmployee({ status: "ACTIVE", id: EMPLOYEE_A } as never, employment, "2026-01-31").ok, false);
  assert.equal(eligibleEmployee({ status: "TERMINATED", id: EMPLOYEE_A } as never, undefined, "2026-01-31").ok, false);
  assert.equal(eligibleEmployee({ status: "ACTIVE", id: EMPLOYEE_A } as never, employment, "2026-02-28").ok, true);
});
