import { eachDate, parseDateOnly, toDateOnly, weekdayName } from "@/lib/leave/dates";
import type {
  AttendanceDay,
  Employee,
  EmployeeEmployment,
  EmployeeSalarySnapshot,
  EmployeeStatutory,
  Holiday,
  PayrollAttendanceSummary,
  PayrollLineKind,
  SalaryLine,
  StatutoryBreakdown,
  StatutoryRule,
} from "@/types";

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function periodBounds(period: string) {
  const [year, month] = period.split("-").map(Number);
  const from = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(year, month, 0).getDate();
  const to = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to, daysInMonth: last };
}

export function periodLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, 1));
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function currentPeriod(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "01";
  return `${pick("year")}-${pick("month")}`;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  const escape = (cell: string | number | boolean | null | undefined) => {
    const text = cell === null || cell === undefined ? "" : String(cell);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  return [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
}

export function summarizeAttendance(input: {
  from: string;
  to: string;
  weeklyOff: string;
  holidays: Holiday[];
  days: AttendanceDay[];
  joiningDate: string | null;
}): PayrollAttendanceSummary {
  const holidaySet = new Set(
    input.holidays
      .filter((item) => item.status === "ACTIVE" && item.holiday_date >= input.from && item.holiday_date <= input.to)
      .map((item) => item.holiday_date)
  );
  const byDate = new Map(input.days.map((item) => [item.work_date, item]));
  let workingDays = 0;
  let presentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let holidayDays = 0;
  let weeklyOffDays = 0;
  let paidDays = 0;
  let lopDays = 0;

  for (const date of eachDate(input.from, input.to)) {
    if (input.joiningDate && date < input.joiningDate) continue;
    const marked = byDate.get(date);
    const weeklyOff = weekdayName(date) === input.weeklyOff;
    const holiday = holidaySet.has(date);
    if (marked) {
      if (marked.status === "WEEKLY_OFF") {
        weeklyOffDays += 1;
        paidDays += 1;
      } else if (marked.status === "HOLIDAY") {
        holidayDays += 1;
        paidDays += 1;
      } else if (marked.status === "UNPAID_LEAVE") {
        workingDays += 1;
        unpaidLeaveDays += 1;
        lopDays += 1;
      } else if (marked.status === "HALF_DAY_LEAVE") {
        workingDays += 1;
        paidLeaveDays += 0.5;
        presentDays += 0.5;
        paidDays += 1;
      } else if (marked.status === "PAID_LEAVE" || marked.status === "COMP_OFF") {
        workingDays += 1;
        paidLeaveDays += 1;
        paidDays += 1;
      } else if (marked.status === "ABSENT") {
        workingDays += 1;
        unpaidLeaveDays += 1;
        lopDays += 1;
      } else {
        workingDays += 1;
        presentDays += 1;
        paidDays += 1;
      }
      continue;
    }
    if (weeklyOff) {
      weeklyOffDays += 1;
      paidDays += 1;
      continue;
    }
    if (holiday) {
      holidayDays += 1;
      paidDays += 1;
      continue;
    }
    workingDays += 1;
    presentDays += 1;
    paidDays += 1;
  }

  return {
    workingDays,
    presentDays,
    paidLeaveDays,
    unpaidLeaveDays,
    holidayDays,
    weeklyOffDays,
    paidDays,
    lopDays,
  };
}

export function prorate(amount: number, paidDays: number, workingDays: number) {
  if (workingDays <= 0) return 0;
  if (paidDays >= workingDays) return roundMoney(amount);
  return roundMoney((amount * paidDays) / workingDays);
}

export function amountForCode(lines: SalaryLine[], code: string) {
  return lines.find((line) => line.code.toUpperCase() === code.toUpperCase())?.amount ?? 0;
}

export function ruleForHead(rules: StatutoryRule[], head: StatutoryRule["head"], onDate: string) {
  return (
    rules.find(
      (item) =>
        item.head === head &&
        item.status === "ACTIVE" &&
        item.effective_from <= onDate &&
        (!item.effective_to || item.effective_to >= onDate)
    ) ?? null
  );
}

function ptFromSlabs(gross: number, rule: StatutoryRule) {
  if (rule.fixed_amount != null && rule.fixed_amount > 0 && !rule.slab_json) return roundMoney(rule.fixed_amount);
  if (rule.slab_json) {
    try {
      const slabs = JSON.parse(rule.slab_json) as Array<{ from: number; to: number | null; amount: number }>;
      const match = slabs.find((slab) => gross >= slab.from && (slab.to == null || gross <= slab.to));
      if (match) return roundMoney(match.amount);
    } catch {
      return 0;
    }
  }
  if (gross <= 15000) return 0;
  if (gross <= 20000) return 200;
  return 300;
}

export function calculateStatutory(input: {
  snapshot: EmployeeSalarySnapshot;
  proratedEarnings: number;
  statutory: EmployeeStatutory | null;
  rules: StatutoryRule[];
  onDate: string;
}): StatutoryBreakdown {
  const empty: StatutoryBreakdown = {
    pfWage: 0,
    pfEmployee: 0,
    pfEmployer: 0,
    pfEps: 0,
    pfEpf: 0,
    esiWage: 0,
    esiEmployee: 0,
    esiEmployer: 0,
    ptAmount: 0,
    ptStateCode: null,
    lwfEmployee: 0,
    lwfEmployer: 0,
    tdsAmount: 0,
    tdsRegime: null,
    taxableIncome: 0,
    employeeTotal: 0,
    employerTotal: 0,
    ruleVersions: [],
    warnings: ["Legacy calculateStatutory is a fallback only. Use lib/statutory/engine."],
  };
  const pfRule = ruleForHead(input.rules, "PF", input.onDate);
  const esiRule = ruleForHead(input.rules, "ESI", input.onDate);
  const ptRule = ruleForHead(input.rules, "PT", input.onDate);
  const tdsRule = ruleForHead(input.rules, "TDS", input.onDate);
  const basic = amountForCode(input.snapshot.lines, "BASIC");
  const da = amountForCode(input.snapshot.lines, "DA");
  let pfWage = roundMoney(basic + da);
  if (pfWage <= 0) pfWage = roundMoney(input.proratedEarnings * 0.4);
  if (pfRule?.wage_ceiling != null) pfWage = roundMoney(Math.min(pfWage, pfRule.wage_ceiling));

  const pfApplicable = input.statutory?.pf_applicable !== false;
  const esiApplicable = Boolean(input.statutory?.esi_applicable);
  const ptApplicable = input.statutory?.pt_applicable !== false;

  if (pfApplicable && pfRule && pfWage > 0) {
    empty.pfWage = pfWage;
    empty.pfEmployee = roundMoney((pfWage * pfRule.employee_rate) / 100);
    empty.pfEmployer = roundMoney((pfWage * pfRule.employer_rate) / 100);
  }

  empty.esiWage = input.proratedEarnings;
  const esiMax = esiRule?.max_wage ?? null;
  const esiMin = esiRule?.min_wage ?? 0;
  if (esiApplicable && esiRule && empty.esiWage >= esiMin && (esiMax == null || empty.esiWage <= esiMax)) {
    empty.esiEmployee = roundMoney((empty.esiWage * esiRule.employee_rate) / 100);
    empty.esiEmployer = roundMoney((empty.esiWage * esiRule.employer_rate) / 100);
  }

  if (ptApplicable && ptRule) {
    empty.ptAmount = ptFromSlabs(input.proratedEarnings, ptRule);
    empty.ptStateCode = ptRule.state_code;
  }

  if (tdsRule && (tdsRule.employee_rate || 0) > 0) {
    empty.tdsAmount = roundMoney((input.proratedEarnings * tdsRule.employee_rate) / 100);
  }

  empty.employeeTotal = roundMoney(empty.pfEmployee + empty.esiEmployee + empty.ptAmount + empty.lwfEmployee + empty.tdsAmount);
  empty.employerTotal = roundMoney(empty.pfEmployer + empty.esiEmployer + empty.lwfEmployer);
  return empty;
}

export function eligibleEmployee(employee: Employee, employment: EmployeeEmployment | undefined, periodTo: string) {
  if (employee.status !== "ACTIVE") return { ok: false, reason: "Employee is not active." };
  if (employment?.joining_date && employment.joining_date > periodTo) {
    return { ok: false, reason: "Joined after this payroll period." };
  }
  return { ok: true, reason: null as string | null };
}

export function lineKindFromSalary(line: SalaryLine): PayrollLineKind {
  if (line.componentType === "DEDUCTION") return "DEDUCTION";
  if (line.componentType === "REIMBURSEMENT") return "REIMBURSEMENT";
  return "EARNING";
}

export function daysInPeriodInclusive(from: string, to: string) {
  const start = parseDateOnly(from).getTime();
  const end = parseDateOnly(to).getTime();
  return Math.floor((end - start) / 86400000) + 1;
}

export function overlapsPeriod(from: string, to: string, periodFrom: string, periodTo: string) {
  return from <= periodTo && to >= periodFrom;
}

export { toDateOnly };
