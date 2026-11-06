import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/constants";
import {
  calculateAttendanceDay,
  calendarKind,
  dateInPayrollPeriod,
  exceptionCodesFor,
  pairPunches,
  roundOvertime,
  uniquePunches,
  workDateForPunch,
  type EnginePunch,
  type ShiftConfig,
} from "@/lib/attendance/engine";
import { belongsToOrganization } from "@/lib/tenancy";
import { ORG_A, ORG_B } from "./helpers/fixtures.ts";

const shift: ShiftConfig = { startTime: "09:00", endTime: "18:00", breakMinutes: 60, overnight: false };
const tz = "Asia/Kolkata";

function punch(id: string, punchedAt: string, direction: EnginePunch["direction"]): EnginePunch {
  return { id, punchedAt: new Date(punchedAt), direction };
}

test("FIRST_LAST pairing uses earliest IN and latest OUT", () => {
  const paired = pairPunches(
    [
      punch("1", "2026-01-15T09:05:00+05:30", "IN"),
      punch("2", "2026-01-15T13:00:00+05:30", "OUT"),
      punch("3", "2026-01-15T14:00:00+05:30", "IN"),
      punch("4", "2026-01-15T18:10:00+05:30", "OUT"),
    ],
    "FIRST_LAST"
  );
  assert.equal(paired.firstIn?.toISOString(), new Date("2026-01-15T09:05:00+05:30").toISOString());
  assert.equal(paired.lastOut?.toISOString(), new Date("2026-01-15T18:10:00+05:30").toISOString());
  assert.equal(paired.intervals.length, 1);
  assert.equal(paired.missingIn, false);
  assert.equal(paired.missingOut, false);
});

test("PAIRWISE pairing sums IN/OUT intervals", () => {
  const paired = pairPunches(
    [
      punch("1", "2026-01-15T09:00:00+05:30", "IN"),
      punch("2", "2026-01-15T13:00:00+05:30", "OUT"),
      punch("3", "2026-01-15T14:00:00+05:30", "IN"),
      punch("4", "2026-01-15T18:00:00+05:30", "OUT"),
    ],
    "PAIRWISE"
  );
  assert.equal(paired.intervals.length, 2);
  assert.equal(paired.intervals[0]?.minutes, 240);
  assert.equal(paired.intervals[1]?.minutes, 240);
});

test("overnight punches assign to the previous work date", () => {
  const night: ShiftConfig = { startTime: "22:00", endTime: "06:00", breakMinutes: 30, overnight: true };
  assert.equal(workDateForPunch(new Date("2026-01-16T01:00:00+05:30"), tz, night), "2026-01-15");
  assert.equal(workDateForPunch(new Date("2026-01-15T22:10:00+05:30"), tz, night), "2026-01-15");
});

test("leave overlay wins over punches and calendar", () => {
  const result = calculateAttendanceDay({
    workDate: "2026-01-15",
    timezone: tz,
    shift,
    punches: [punch("1", "2026-01-15T09:00:00+05:30", "IN"), punch("2", "2026-01-15T18:00:00+05:30", "OUT")],
    calendar: "WORKING",
    leave: { status: "PAID_LEAVE", source: "LEAVE" },
  });
  assert.equal(result.status, "PAID_LEAVE");
  assert.equal(result.source, "LEAVE");
  assert.equal(result.otMinutes, 0);
});

test("weekly off and holiday are not marked absent without punches", () => {
  const off = calculateAttendanceDay({ workDate: "2026-01-18", timezone: tz, shift, punches: [], calendar: "WEEKLY_OFF" });
  const holiday = calculateAttendanceDay({ workDate: "2026-01-26", timezone: tz, shift, punches: [], calendar: "HOLIDAY" });
  assert.equal(off.status, "WEEKLY_OFF");
  assert.equal(holiday.status, "HOLIDAY");
  assert.deepEqual(exceptionCodesFor(off, "WEEKLY_OFF"), []);
  assert.deepEqual(exceptionCodesFor(holiday, "HOLIDAY"), []);
});

test("working day without punches is ABSENT", () => {
  const result = calculateAttendanceDay({ workDate: "2026-01-15", timezone: tz, shift, punches: [], calendar: "WORKING" });
  assert.equal(result.status, "ABSENT");
  assert.deepEqual(exceptionCodesFor(result, "WORKING"), ["ABSENT"]);
});

test("late and overtime are calculated from first/last punches", () => {
  const result = calculateAttendanceDay({
    workDate: "2026-01-15",
    timezone: tz,
    shift,
    punches: [punch("1", "2026-01-15T09:30:00+05:30", "IN"), punch("2", "2026-01-15T19:30:00+05:30", "OUT")],
    calendar: "WORKING",
  });
  assert.equal(result.status, "PRESENT");
  assert.ok(result.lateMinutes >= 30);
  assert.ok(result.otMinutes >= 30);
  assert.ok(exceptionCodesFor(result, "WORKING").includes("LATE"));
});

test("missing OUT is flagged and unique punches are de-duplicated", () => {
  const missing = calculateAttendanceDay({
    workDate: "2026-01-15",
    timezone: tz,
    shift,
    punches: [punch("1", "2026-01-15T09:00:00+05:30", "IN")],
    calendar: "WORKING",
  });
  assert.equal(missing.missingOut, true);
  assert.ok(exceptionCodesFor(missing, "WORKING").includes("MISSING_OUT"));
  const unique = uniquePunches([
    punch("1", "2026-01-15T09:00:00+05:30", "IN"),
    punch("2", "2026-01-15T09:00:00+05:30", "IN"),
  ]);
  assert.equal(unique.length, 1);
});

test("overtime rounds down and locked payroll dates are detected", () => {
  assert.equal(roundOvertime(44, 15), 30);
  assert.equal(roundOvertime(14, 15), 0);
  assert.equal(dateInPayrollPeriod("2026-01-15", "2026-01-01", "2026-01-31"), true);
  assert.equal(dateInPayrollPeriod("2026-02-01", "2026-01-01", "2026-01-31"), false);
  assert.equal(calendarKind("2026-01-18", "SUNDAY", new Set()), "WEEKLY_OFF");
});

test("attendance permissions stay additive and employees cannot manage settings", () => {
  assert.ok(DEFAULT_ROLE_PERMISSIONS.HR.includes("attendance.manage"));
  assert.ok(DEFAULT_ROLE_PERMISSIONS.HR.includes("attendance.regularize"));
  assert.ok(DEFAULT_ROLE_PERMISSIONS.EMPLOYEE.includes("attendance.regularize"));
  assert.equal(DEFAULT_ROLE_PERMISSIONS.EMPLOYEE.includes("attendance.manage"), false);
  assert.ok(DEFAULT_ROLE_PERMISSIONS.PAYROLL.includes("attendance.view"));
});

test("attendance rows remain organization-scoped", () => {
  const rows = [
    { id: "a", organization_id: ORG_A },
    { id: "b", organization_id: ORG_B },
  ];
  assert.deepEqual(belongsToOrganization(ORG_A, rows).map((row) => row.id), ["a"]);
});
