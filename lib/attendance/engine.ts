import { TIMEZONE_OFFSETS, type AttendanceDayStatus } from "@/lib/constants";
import { addDays, toDateOnly, weekdayName } from "@/lib/leave/dates";

export type PunchPairing = "FIRST_LAST" | "PAIRWISE";

export type AttendancePolicyConfig = {
  graceMinutes: number;
  breakMinutes: number;
  fullDayMinutes: number;
  halfDayMinutes: number;
  otMinimumMinutes: number;
  otRoundingMinutes: number;
  punchPairing: PunchPairing;
  allowOvernight: boolean;
};

export type ShiftConfig = {
  startTime: string;
  endTime: string;
  breakMinutes: number;
  overnight: boolean;
};

export type EnginePunch = {
  id: string;
  punchedAt: Date;
  direction: "IN" | "OUT" | "UNKNOWN";
};

export type CalendarKind = "WORKING" | "WEEKLY_OFF" | "HOLIDAY";

export type LeaveOverlay = {
  status: AttendanceDayStatus;
  source: string;
};

export type DayCalculation = {
  workDate: string;
  status: AttendanceDayStatus;
  source: "ENGINE" | "LEAVE" | "CALENDAR" | "REGULARIZATION";
  firstIn: Date | null;
  lastOut: Date | null;
  workedMinutes: number;
  lateMinutes: number;
  earlyExitMinutes: number;
  otMinutes: number;
  missingIn: boolean;
  missingOut: boolean;
  sessionResult: "FULL" | "HALF" | "NONE";
  pairedIntervals: Array<{ inAt: Date; outAt: Date; minutes: number }>;
};

const DEFAULT_POLICY: AttendancePolicyConfig = {
  graceMinutes: 15,
  breakMinutes: 60,
  fullDayMinutes: 480,
  halfDayMinutes: 240,
  otMinimumMinutes: 30,
  otRoundingMinutes: 15,
  punchPairing: "FIRST_LAST",
  allowOvernight: true,
};

export function defaultAttendancePolicy(): AttendancePolicyConfig {
  return { ...DEFAULT_POLICY };
}

export function parseHhmm(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

export function formatHhmm(total: number) {
  const normalized = ((total % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const year = pick("year");
  const month = pick("month");
  const day = pick("day");
  const hour = Number(pick("hour"));
  const minute = Number(pick("minute"));
  const second = Number(pick("second"));
  return {
    dateOnly: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute,
    seconds: second,
  };
}

export function zonedDate(dateOnly: string, minutes: number, timezone: string) {
  let day = dateOnly.slice(0, 10);
  let mins = minutes;
  while (mins < 0) {
    day = addDays(day, -1);
    mins += 1440;
  }
  while (mins >= 1440) {
    day = addDays(day, 1);
    mins -= 1440;
  }
  const hh = String(Math.floor(mins / 60)).padStart(2, "0");
  const mm = String(mins % 60).padStart(2, "0");
  const offset = TIMEZONE_OFFSETS[timezone] ?? "+00:00";
  return new Date(`${day}T${hh}:${mm}:00${offset}`);
}

export function workDateForPunch(punchedAt: Date, timezone: string, shift: ShiftConfig) {
  const local = localParts(punchedAt, timezone);
  if (!shift.overnight) return local.dateOnly;
  const end = parseHhmm(shift.endTime);
  if (local.minutes < end) return addDays(local.dateOnly, -1);
  return local.dateOnly;
}

export function uniquePunches(punches: EnginePunch[]) {
  const seen = new Set<string>();
  const out: EnginePunch[] = [];
  const sorted = punches.slice().sort((a, b) => a.punchedAt.getTime() - b.punchedAt.getTime());
  for (const punch of sorted) {
    const key = `${punch.punchedAt.toISOString()}|${punch.direction}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(punch);
  }
  return out;
}

function minutesBetween(from: Date, to: Date) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}

export function roundOvertime(minutes: number, rounding: number) {
  if (minutes <= 0) return 0;
  if (rounding <= 0) return minutes;
  return Math.floor(minutes / rounding) * rounding;
}

function pairFirstLast(punches: EnginePunch[]) {
  if (!punches.length) {
    return { firstIn: null as Date | null, lastOut: null as Date | null, intervals: [] as DayCalculation["pairedIntervals"], missingIn: false, missingOut: false };
  }
  const ins = punches.filter((item) => item.direction === "IN");
  const outs = punches.filter((item) => item.direction === "OUT");
  const firstIn = ins[0]?.punchedAt ?? (punches[0].direction !== "OUT" ? punches[0].punchedAt : null);
  const lastOut =
    outs.at(-1)?.punchedAt ??
    (punches.length > 1 && punches.at(-1)?.direction !== "IN" ? punches.at(-1)!.punchedAt : null);
  const missingIn = !firstIn && Boolean(lastOut);
  const missingOut = Boolean(firstIn) && !lastOut;
  const intervals =
    firstIn && lastOut && lastOut > firstIn
      ? [{ inAt: firstIn, outAt: lastOut, minutes: minutesBetween(firstIn, lastOut) }]
      : [];
  return { firstIn, lastOut, intervals, missingIn, missingOut };
}

function pairPairwise(punches: EnginePunch[]) {
  const intervals: DayCalculation["pairedIntervals"] = [];
  let missingIn = false;
  let missingOut = false;
  let firstIn: Date | null = null;
  let lastOut: Date | null = null;
  let i = 0;
  while (i < punches.length) {
    const current = punches[i];
    const isIn = current.direction === "IN" || current.direction === "UNKNOWN";
    if (!isIn) {
      missingIn = true;
      lastOut = current.punchedAt;
      i += 1;
      continue;
    }
    if (!firstIn) firstIn = current.punchedAt;
    const outIndex = punches.findIndex((item, index) => index > i && (item.direction === "OUT" || item.direction === "UNKNOWN"));
    if (outIndex < 0) {
      missingOut = true;
      break;
    }
    const outAt = punches[outIndex].punchedAt;
    lastOut = outAt;
    if (outAt > current.punchedAt) {
      intervals.push({ inAt: current.punchedAt, outAt, minutes: minutesBetween(current.punchedAt, outAt) });
    }
    i = outIndex + 1;
  }
  return { firstIn, lastOut, intervals, missingIn, missingOut };
}

export function pairPunches(punches: EnginePunch[], pairing: PunchPairing) {
  const unique = uniquePunches(punches);
  return pairing === "PAIRWISE" ? pairPairwise(unique) : pairFirstLast(unique);
}

export function expectedShiftMinutes(shift: ShiftConfig, breakMinutes: number) {
  const start = parseHhmm(shift.startTime);
  const end = parseHhmm(shift.endTime);
  const span = shift.overnight || end <= start ? end + 1440 - start : end - start;
  return Math.max(0, span - breakMinutes);
}

export function calendarKind(workDate: string, weeklyOff: string, holidays: Set<string>): CalendarKind {
  if (holidays.has(workDate)) return "HOLIDAY";
  if (weekdayName(workDate) === weeklyOff) return "WEEKLY_OFF";
  return "WORKING";
}

export function calculateAttendanceDay(input: {
  workDate: string;
  timezone: string;
  shift: ShiftConfig;
  policy?: Partial<AttendancePolicyConfig>;
  punches: EnginePunch[];
  calendar: CalendarKind;
  leave?: LeaveOverlay | null;
}): DayCalculation {
  const policy = { ...DEFAULT_POLICY, ...input.policy };
  const breakMinutes = input.shift.breakMinutes || policy.breakMinutes;
  const paired = pairPunches(input.punches, policy.punchPairing);
  const gross = paired.intervals.reduce((sum, item) => sum + item.minutes, 0);
  const workedMinutes = paired.intervals.length ? Math.max(0, gross - breakMinutes) : 0;
  const start = zonedDate(input.workDate, parseHhmm(input.shift.startTime), input.timezone);
  let endMinutes = parseHhmm(input.shift.endTime);
  if (input.shift.overnight || endMinutes <= parseHhmm(input.shift.startTime)) endMinutes += 1440;
  const end = zonedDate(input.workDate, endMinutes, input.timezone);
  const graceMs = policy.graceMinutes * 60000;
  const lateMinutes =
    paired.firstIn && paired.firstIn.getTime() > start.getTime() + graceMs
      ? Math.round((paired.firstIn.getTime() - start.getTime()) / 60000)
      : 0;
  const earlyExitMinutes =
    paired.lastOut && paired.lastOut.getTime() < end.getTime() - graceMs
      ? Math.round((end.getTime() - paired.lastOut.getTime()) / 60000)
      : 0;
  const expected = expectedShiftMinutes(input.shift, breakMinutes);
  const rawOt = Math.max(0, workedMinutes - expected);
  const otMinutes = rawOt >= policy.otMinimumMinutes ? roundOvertime(rawOt, policy.otRoundingMinutes) : 0;
  const sessionResult =
    workedMinutes >= policy.fullDayMinutes ? "FULL" : workedMinutes >= policy.halfDayMinutes ? "HALF" : "NONE";

  if (input.leave && ["PAID_LEAVE", "UNPAID_LEAVE", "HALF_DAY_LEAVE", "COMP_OFF"].includes(input.leave.status)) {
    return {
      workDate: input.workDate,
      status: input.leave.status,
      source: "LEAVE",
      firstIn: paired.firstIn,
      lastOut: paired.lastOut,
      workedMinutes,
      lateMinutes: input.leave.status === "HALF_DAY_LEAVE" ? lateMinutes : 0,
      earlyExitMinutes: input.leave.status === "HALF_DAY_LEAVE" ? earlyExitMinutes : 0,
      otMinutes: 0,
      missingIn: false,
      missingOut: false,
      sessionResult: input.leave.status === "HALF_DAY_LEAVE" ? "HALF" : "FULL",
      pairedIntervals: paired.intervals,
    };
  }

  if (input.calendar === "WEEKLY_OFF" && !paired.firstIn && !paired.lastOut) {
    return emptyDay(input.workDate, "WEEKLY_OFF", "CALENDAR");
  }
  if (input.calendar === "HOLIDAY" && !paired.firstIn && !paired.lastOut) {
    return emptyDay(input.workDate, "HOLIDAY", "CALENDAR");
  }

  if (!paired.firstIn && !paired.lastOut) {
    return emptyDay(input.workDate, "ABSENT", "ENGINE");
  }

  const present = sessionResult !== "NONE" || Boolean(paired.firstIn && paired.lastOut);
  return {
    workDate: input.workDate,
    status: present ? "PRESENT" : "ABSENT",
    source: "ENGINE",
    firstIn: paired.firstIn,
    lastOut: paired.lastOut,
    workedMinutes,
    lateMinutes,
    earlyExitMinutes,
    otMinutes,
    missingIn: paired.missingIn,
    missingOut: paired.missingOut,
    sessionResult: present ? sessionResult === "NONE" ? "HALF" : sessionResult : "NONE",
    pairedIntervals: paired.intervals,
  };
}

function emptyDay(workDate: string, status: AttendanceDayStatus, source: DayCalculation["source"]): DayCalculation {
  return {
    workDate,
    status,
    source,
    firstIn: null,
    lastOut: null,
    workedMinutes: 0,
    lateMinutes: 0,
    earlyExitMinutes: 0,
    otMinutes: 0,
    missingIn: false,
    missingOut: false,
    sessionResult: "NONE",
    pairedIntervals: [],
  };
}

export function exceptionCodesFor(result: DayCalculation, calendar: CalendarKind) {
  const codes: Array<"MISSING_IN" | "MISSING_OUT" | "ABSENT" | "LATE" | "EARLY_EXIT"> = [];
  if (result.status === "ABSENT" && calendar === "WORKING") codes.push("ABSENT");
  if (result.missingIn) codes.push("MISSING_IN");
  if (result.missingOut) codes.push("MISSING_OUT");
  if (result.status === "PRESENT" && result.lateMinutes > 0) codes.push("LATE");
  if (result.status === "PRESENT" && result.earlyExitMinutes > 0) codes.push("EARLY_EXIT");
  return codes;
}

export function payrollPeriodOf(dateOnly: string) {
  return dateOnly.slice(0, 7);
}

export function dateInPayrollPeriod(dateOnly: string, periodFrom: string, periodTo: string) {
  const day = toDateOnly(dateOnly);
  return day >= periodFrom && day <= periodTo;
}
