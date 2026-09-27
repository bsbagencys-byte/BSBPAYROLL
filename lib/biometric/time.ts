import { TIMEZONE_OFFSETS } from "@/lib/constants";

export function timezoneOffset(timezone: string) {
  return TIMEZONE_OFFSETS[timezone] ?? "+00:00";
}

export function parsePunchTime(value: unknown, timezone: string): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return parsePunchTime(Number(text), timezone);
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(text)) {
    const normalized = text.replace(" ", "T");
    const withSeconds = normalized.length === 16 ? `${normalized}:00` : normalized;
    const date = new Date(`${withSeconds}${timezoneOffset(timezone)}`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLocalDateTime(date: Date, timezone: string) {
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
  return `${pick("year")}-${pick("month")}-${pick("day")} ${pick("hour")}:${pick("minute")}:${pick("second")}`;
}

export function isStale(lastSeenAt: string | null, minutes = 15) {
  if (!lastSeenAt) return true;
  return Date.now() - new Date(lastSeenAt).getTime() > minutes * 60 * 1000;
}
