import { WEEKDAYS, type LeaveDaySession } from "@/lib/constants";

export function toDateOnly(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function addDays(value: string, amount: number) {
  const date = parseDateOnly(value);
  date.setDate(date.getDate() + amount);
  return toDateOnly(date);
}

export function weekdayName(value: string) {
  return WEEKDAYS[parseDateOnly(value).getDay()];
}

export function eachDate(from: string, to: string) {
  const start = toDateOnly(from);
  const end = toDateOnly(to);
  if (start > end) return [] as string[];
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function todayInZone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "01";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

export function currentYear(timezone: string) {
  return Number(todayInZone(timezone).slice(0, 4));
}

export function sessionUnits(session: LeaveDaySession) {
  return session === "FULL" ? 1 : 0.5;
}
