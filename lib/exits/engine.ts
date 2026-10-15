import { addDays } from "@/lib/leave/dates";
import { parseRuleConfig, resolveRuleVersion, roundStatutory } from "@/lib/statutory/engine";
import type { StatutoryRuleVersion } from "@/types";
import { roundMoney } from "@/lib/payroll/engine";

export function asBool(value: unknown) {
  return value === true || value === "on" || value === "true";
}

export function asNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export { roundMoney };

export function toCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  const escape = (cell: string | number | boolean | null | undefined) => {
    const text = cell === null || cell === undefined ? "" : String(cell);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  return [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
}

export function noticeShortfall(periodDays: number, servedDays: number) {
  return Math.max(0, periodDays - servedDays);
}

export function noticeExtra(periodDays: number, servedDays: number) {
  return Math.max(0, servedDays - periodDays);
}

export function dailyAmount(monthly: number, daysInMonth: number) {
  if (daysInMonth <= 0) return 0;
  return roundMoney(monthly / daysInMonth);
}

export function nextReference(prefix: string, existing: Array<string | null | undefined>) {
  const numbers = existing
    .map((value) => {
      if (!value) return 0;
      const match = value.match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .filter((value) => Number.isFinite(value));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export function daysUntil(from: string, to: string | null) {
  if (!to) return null;
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  return Math.ceil((end - start) / 86400000);
}

export function periodFromDate(value: string) {
  return value.slice(0, 7);
}

export function periodStart(period: string) {
  return `${period}-01`;
}

export function addOneDay(value: string) {
  return addDays(value, 1);
}

export type ContractorWithholdingResult = {
  amount: number;
  basis: number;
  section: string | null;
  versionId: string | null;
  versionCode: string | null;
  verified: boolean;
  warning: string | null;
  blocked: boolean;
};

export function calculateContractorWithholding(input: {
  versions: StatutoryRuleVersion[];
  onDate: string;
  gross: number;
  adjustment: number;
}): ContractorWithholdingResult {
  const basis = roundMoney(Math.max(0, input.gross + input.adjustment));
  const version = resolveRuleVersion(input.versions, "TDS", input.onDate);
  if (!version) {
    return {
      amount: 0,
      basis,
      section: null,
      versionId: null,
      versionCode: null,
      verified: false,
      warning: "No active TDS rule version for this invoice date. Withholding not calculated.",
      blocked: true,
    };
  }
  const config = parseRuleConfig(version.config_json);
  const rate = config.employeeRate ?? 0;
  if (!version.verified) {
    return {
      amount: 0,
      basis,
      section: version.notes ?? version.version_code,
      versionId: version.id,
      versionCode: version.version_code,
      verified: false,
      warning: `TDS rule ${version.version_code} is not source-verified. Withholding left at 0.`,
      blocked: true,
    };
  }
  if (rate <= 0) {
    return {
      amount: 0,
      basis,
      section: version.notes ?? version.version_code,
      versionId: version.id,
      versionCode: version.version_code,
      verified: true,
      warning: `TDS rule ${version.version_code} has no contractor withholding rate. Amount left at 0.`,
      blocked: false,
    };
  }
  const rounding = config.rounding ?? "NEAREST_RUPEE";
  return {
    amount: roundStatutory((basis * rate) / 100, rounding),
    basis,
    section: version.notes ?? version.version_code,
    versionId: version.id,
    versionCode: version.version_code,
    verified: true,
    warning: null,
    blocked: false,
  };
}

export const DEFAULT_CLEARANCE_TEMPLATES = [
  { department: "HR" as const, code: "HR-FILE", name: "Personnel file and ID card", required: true, default_due_days: 3, sort_order: 10 },
  { department: "FINANCE" as const, code: "FIN-LOAN", name: "Loan and advance clearance", required: true, default_due_days: 5, sort_order: 20 },
  { department: "IT" as const, code: "IT-ASSET", name: "Laptop and access revocation", required: true, default_due_days: 2, sort_order: 30 },
  { department: "ADMIN" as const, code: "ADM-ACCESS", name: "Office access and parking", required: false, default_due_days: 5, sort_order: 40 },
  { department: "MANAGER" as const, code: "MGR-Handover", name: "Knowledge handover", required: true, default_due_days: 7, sort_order: 50 },
];
