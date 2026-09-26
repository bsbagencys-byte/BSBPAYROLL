import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, timezone = "Asia/Kolkata"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(d);
}

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "—";
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatTime(date: Date | string, timezone = "Asia/Kolkata"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  }).format(d);
}

export function formatDateTime(date: Date | string, timezone = "Asia/Kolkata"): string {
  return `${formatDate(date, timezone)} ${formatTime(date, timezone)}`;
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function lookupName<T extends { id: string; name?: string; display_name?: string }>(
  rows: T[],
  id: string | null | undefined
) {
  if (!id) return null;
  const row = rows.find((item) => item.id === id);
  return row?.name ?? row?.display_name ?? null;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
