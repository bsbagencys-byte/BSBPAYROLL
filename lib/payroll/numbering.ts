import { periodBounds } from "@/lib/payroll/engine";

const MONTH_CODES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function fiscalYearForPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  if ((month ?? 1) >= 4) return `${year}-${String((year ?? 0) + 1).slice(-2)}`;
  return `${(year ?? 1) - 1}-${String(year).slice(-2)}`;
}

export function monthCodeForPeriod(period: string) {
  const month = Number(period.split("-")[1] ?? "1");
  return MONTH_CODES[Math.max(1, Math.min(12, month)) - 1] ?? "JAN";
}

export function orgPayslipPrefix(name: string) {
  const letters = name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 4);
  return letters || "BSB";
}

export function formatPayslipNumber(input: {
  prefix: string;
  fiscalYear: string;
  monthCode: string;
  sequence: number;
}) {
  return `${input.prefix}/${input.fiscalYear}/${input.monthCode}/${String(input.sequence).padStart(6, "0")}`;
}

export function payslipPeriodMeta(period: string) {
  return {
    ...periodBounds(period),
    fiscalYear: fiscalYearForPeriod(period),
    monthCode: monthCodeForPeriod(period),
  };
}
