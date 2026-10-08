import { amountForCode, roundMoney, ruleForHead } from "@/lib/payroll/engine";
import type {
  EmployeeSalarySnapshot,
  EmployeeStatutory,
  EmployeeTaxDeclaration,
  EmployeeTaxDeclarationItem,
  OrgStatutorySettings,
  StatutoryBreakdown,
  StatutoryRule,
  StatutoryRuleVersion,
} from "@/types";
import type { StatutoryHead, TaxRegime } from "@/lib/constants";

export type StatutoryRuleConfig = {
  employeeRate?: number;
  employerRate?: number;
  wageCeiling?: number | null;
  minWage?: number | null;
  maxWage?: number | null;
  epsRate?: number | null;
  epsCeiling?: number | null;
  wageComponents?: string[];
  rounding?: "NEAREST_RUPEE" | "NEAREST_PAISE" | "FLOOR_RUPEE";
  slabs?: Array<{ from: number; to: number | null; amount?: number; rate?: number }>;
  rebateLimit?: number | null;
  rebateAmount?: number | null;
  standardDeduction?: number | null;
  cessRate?: number | null;
  surchargeSlabs?: Array<{ from: number; to: number | null; rate: number }>;
  months?: number[] | null;
  month?: number | null;
};

export function parseRuleConfig(json: string | null | undefined): StatutoryRuleConfig {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json) as StatutoryRuleConfig;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function roundStatutory(value: number, mode: StatutoryRuleConfig["rounding"] = "NEAREST_PAISE") {
  if (!Number.isFinite(value)) return 0;
  if (mode === "NEAREST_RUPEE") return Math.round(value + Number.EPSILON);
  if (mode === "FLOOR_RUPEE") return Math.floor(value + Number.EPSILON);
  return roundMoney(value);
}

export function defaultOrgStatutorySettings(organizationId: string, now: string): OrgStatutorySettings {
  return {
    organization_id: organizationId,
    pf_enabled: true,
    esi_enabled: true,
    pt_enabled: true,
    lwf_enabled: false,
    tds_enabled: false,
    pf_restrict_to_ceiling: true,
    default_state_code: "KA",
    tds_default_regime: "NEW_ACT_2025",
    show_employer_on_payslip: true,
    updated_by: null,
    created_at: now,
    updated_at: now,
  };
}

export function emptyStatutoryBreakdown(): StatutoryBreakdown {
  return {
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
    warnings: [],
  };
}

export function resolveRuleVersion(
  versions: StatutoryRuleVersion[],
  head: StatutoryHead,
  onDate: string,
  extras?: { stateCode?: string | null; taxYear?: string | null; regime?: string | null }
) {
  const matches = versions.filter((item) => {
    if (item.head !== head) return false;
    if (item.status !== "ACTIVE") return false;
    if (item.effective_from > onDate) return false;
    if (item.effective_to && item.effective_to < onDate) return false;
    if (extras?.stateCode && item.state_code && item.state_code !== extras.stateCode) return false;
    if (extras?.taxYear && item.tax_year && item.tax_year !== extras.taxYear) return false;
    if (extras?.regime && item.regime && item.regime !== extras.regime) return false;
    return true;
  });
  matches.sort((a, b) => b.effective_from.localeCompare(a.effective_from) || b.version_code.localeCompare(a.version_code));
  return matches[0] ?? null;
}

function wageFromComponents(snapshot: EmployeeSalarySnapshot, components: string[] | undefined, fallback: number) {
  if (!components?.length) return fallback;
  const total = components.reduce((sum, code) => sum + amountForCode(snapshot.lines, code), 0);
  return total > 0 ? roundMoney(total) : fallback;
}

function periodMonth(onDate: string) {
  const month = Number(onDate.slice(5, 7));
  return Number.isFinite(month) ? month : 1;
}

export function indianFinancialYear(onDate: string) {
  const year = Number(onDate.slice(0, 4));
  const month = Number(onDate.slice(5, 7));
  if (month >= 4) return `${year}-${String(year + 1).slice(2)}`;
  return `${year - 1}-${String(year).slice(2)}`;
}

function amountFromSlabs(value: number, slabs: StatutoryRuleConfig["slabs"], kind: "amount" | "rate") {
  if (!slabs?.length) return 0;
  const match = slabs.find((slab) => value >= slab.from && (slab.to == null || value <= slab.to));
  if (!match) return 0;
  if (kind === "amount") return match.amount ?? 0;
  return match.rate ?? 0;
}

function taxFromSlabs(income: number, slabs: Array<{ from: number; to: number | null; rate: number }>) {
  if (income <= 0 || !slabs.length) return 0;
  let tax = 0;
  for (const slab of slabs) {
    if (income <= slab.from) continue;
    const top = slab.to == null ? income : Math.min(income, slab.to);
    const band = Math.max(0, top - slab.from);
    tax += (band * slab.rate) / 100;
  }
  return tax;
}

function configFromLegacy(rule: StatutoryRule | null): StatutoryRuleConfig {
  if (!rule) return {};
  const slabs = parseRuleConfig(rule.slab_json).slabs ?? (rule.slab_json ? parseRuleConfig(`{"slabs":${rule.slab_json}}`).slabs : undefined);
  return {
    employeeRate: rule.employee_rate,
    employerRate: rule.employer_rate,
    wageCeiling: rule.wage_ceiling,
    minWage: rule.min_wage,
    maxWage: rule.max_wage,
    slabs: slabs ?? (rule.slab_json
      ? (() => {
          try {
            return JSON.parse(rule.slab_json) as StatutoryRuleConfig["slabs"];
          } catch {
            return undefined;
          }
        })()
      : undefined),
  };
}

export function calculateStatutoryBreakdown(input: {
  snapshot: EmployeeSalarySnapshot;
  proratedEarnings: number;
  taxableEarnings: number;
  statutory: EmployeeStatutory | null;
  legacyRules: StatutoryRule[];
  versions: StatutoryRuleVersion[];
  settings: OrgStatutorySettings;
  onDate: string;
  stateCode?: string | null;
  declaration?: EmployeeTaxDeclaration | null;
  declarationItems?: EmployeeTaxDeclarationItem[];
}): StatutoryBreakdown {
  const result = emptyStatutoryBreakdown();
  const settings = input.settings;
  const stateCode = input.statutory?.pt_state_code || input.stateCode || settings.default_state_code;
  const taxYear = indianFinancialYear(input.onDate);
  const regime = (input.declaration?.regime || input.statutory?.tax_regime || settings.tds_default_regime) as TaxRegime;
  const month = periodMonth(input.onDate);

  const pick = (head: StatutoryHead, extras?: { stateCode?: string | null; taxYear?: string | null; regime?: string | null }) => {
    const version = resolveRuleVersion(input.versions, head, input.onDate, extras);
    if (version) {
      result.ruleVersions.push({
        head,
        versionId: version.id,
        versionCode: version.version_code,
        verified: version.verified,
      });
      if (!version.verified) {
        result.warnings.push(`${head} rule ${version.version_code} is not source-verified.`);
      }
      return { version, config: parseRuleConfig(version.config_json), enabled: version.status === "ACTIVE" };
    }
    const legacy = ruleForHead(input.legacyRules, head === "LWF" ? "PT" : head, input.onDate);
    if (head !== "LWF" && legacy) {
      result.warnings.push(`${head} is using the Phase 9 statutory_rules overlay; add a versioned rule.`);
      return { version: null, config: configFromLegacy(legacy), enabled: true };
    }
    return { version: null, config: {} as StatutoryRuleConfig, enabled: false };
  };

  if (settings.pf_enabled && input.statutory?.pf_applicable !== false) {
    const pf = pick("PF");
    if (!pf.enabled && !pf.version) {
      result.warnings.push("No active PF rule version for this period.");
    } else {
      const components = pf.config.wageComponents?.length ? pf.config.wageComponents : ["BASIC", "DA"];
      let wage = wageFromComponents(input.snapshot, components, roundMoney(input.proratedEarnings * 0.4));
      const ceiling = pf.config.wageCeiling ?? null;
      if (settings.pf_restrict_to_ceiling && ceiling != null) wage = roundMoney(Math.min(wage, ceiling));
      const rounding = pf.config.rounding ?? "NEAREST_RUPEE";
      const employeeRate = pf.config.employeeRate ?? 0;
      const employerRate = pf.config.employerRate ?? 0;
      result.pfWage = wage;
      result.pfEmployee = roundStatutory((wage * employeeRate) / 100, rounding);
      result.pfEmployer = roundStatutory((wage * employerRate) / 100, rounding);
      const epsRate = pf.config.epsRate ?? 0;
      const epsCeiling = pf.config.epsCeiling ?? ceiling ?? wage;
      const epsWage = Math.min(wage, epsCeiling);
      result.pfEps = roundStatutory((epsWage * epsRate) / 100, rounding);
      result.pfEpf = roundMoney(Math.max(0, result.pfEmployer - result.pfEps));
    }
  }

  if (settings.esi_enabled && Boolean(input.statutory?.esi_applicable)) {
    const esi = pick("ESI");
    if (!esi.enabled && !esi.version) {
      result.warnings.push("No active ESI rule version for this period.");
    } else {
      const wage = roundMoney(input.proratedEarnings);
      result.esiWage = wage;
      const maxWage = esi.config.maxWage ?? null;
      const minWage = esi.config.minWage ?? 0;
      const inBand = wage >= minWage && (maxWage == null || wage <= maxWage);
      if (inBand) {
        const rounding = esi.config.rounding ?? "NEAREST_RUPEE";
        result.esiEmployee = roundStatutory((wage * (esi.config.employeeRate ?? 0)) / 100, rounding);
        result.esiEmployer = roundStatutory((wage * (esi.config.employerRate ?? 0)) / 100, rounding);
      }
    }
  }

  if (settings.pt_enabled && input.statutory?.pt_applicable !== false) {
    const pt = pick("PT", { stateCode });
    if (!pt.enabled && !pt.version) {
      result.warnings.push("No active PT rule version for this period.");
    } else {
      result.ptStateCode = pt.version?.state_code ?? stateCode ?? null;
      const rounding = pt.config.rounding ?? "NEAREST_RUPEE";
      const months = pt.config.months;
      const dueThisMonth = !months?.length || months.includes(month);
      if (dueThisMonth) {
        result.ptAmount = roundStatutory(amountFromSlabs(input.proratedEarnings, pt.config.slabs, "amount"), rounding);
      }
    }
  }

  if (settings.lwf_enabled && input.statutory?.lwf_applicable) {
    const lwf = pick("LWF", { stateCode });
    if (!lwf.enabled && !lwf.version) {
      result.warnings.push("No active LWF rule version for this period.");
    } else {
      const rounding = lwf.config.rounding ?? "NEAREST_RUPEE";
      const months = lwf.config.months;
      const dueThisMonth = !months?.length || months.includes(month);
      if (dueThisMonth) {
        if (lwf.config.slabs?.length) {
          result.lwfEmployee = roundStatutory(amountFromSlabs(input.proratedEarnings, lwf.config.slabs, "amount"), rounding);
        } else {
          result.lwfEmployee = roundStatutory(lwf.config.employeeRate ?? 0, rounding);
        }
        result.lwfEmployer = roundStatutory(lwf.config.employerRate ?? 0, rounding);
      }
    }
  }

  if (settings.tds_enabled && input.statutory?.tds_applicable !== false) {
    const tds = pick("TDS", { taxYear, regime });
    result.tdsRegime = regime;
    if (!tds.version) {
      result.warnings.push("No active TDS rule version for this tax year and regime. TDS not calculated.");
    } else if (tds.version.regime && tds.version.regime !== regime) {
      result.warnings.push("TDS regime on the employee does not match the selected rule version.");
    } else if (!tds.config.slabs?.length) {
      result.warnings.push("TDS rule has no slabs. Amount left at 0.");
    } else {
      const annual = roundMoney(input.taxableEarnings * 12);
      const standardDeduction = tds.config.standardDeduction ?? 0;
      const approvedItems =
        input.declaration?.status === "APPROVED" && regime === "OLD"
          ? (input.declarationItems ?? []).reduce((sum, item) => sum + item.amount, 0)
          : 0;
      const taxable = Math.max(0, annual - standardDeduction - approvedItems);
      result.taxableIncome = roundMoney(taxable);
      const slabs = (tds.config.slabs ?? []).map((slab) => ({
        from: slab.from,
        to: slab.to,
        rate: slab.rate ?? 0,
      }));
      let tax = taxFromSlabs(taxable, slabs);
      if (tds.config.rebateLimit != null && taxable <= tds.config.rebateLimit) {
        tax = Math.max(0, tax - (tds.config.rebateAmount ?? tax));
      }
      const surchargeRate = amountFromSlabs(taxable, tds.config.surchargeSlabs, "rate");
      tax += (tax * surchargeRate) / 100;
      tax += (tax * (tds.config.cessRate ?? 0)) / 100;
      result.tdsAmount = roundStatutory(tax / 12, tds.config.rounding ?? "NEAREST_RUPEE");
    }
  }

  result.employeeTotal = roundMoney(
    result.pfEmployee + result.esiEmployee + result.ptAmount + result.lwfEmployee + result.tdsAmount
  );
  result.employerTotal = roundMoney(result.pfEmployer + result.esiEmployer + result.lwfEmployer);
  return result;
}

export function statutoryPayrollLines(input: {
  organizationId: string;
  runId: string;
  itemId: string;
  employeeId: string;
  breakdown: StatutoryBreakdown;
  createdAt: string;
}) {
  const rows: Array<{
    kind: "STATUTORY" | "EMPLOYER";
    code: string;
    name: string;
    amount: number;
    notes: string | null;
    sort_order: number;
  }> = [];
  const { breakdown } = input;
  if (breakdown.pfEmployee > 0) {
    rows.push({
      kind: "STATUTORY",
      code: "PF",
      name: "Provident Fund",
      amount: breakdown.pfEmployee,
      notes: `Wage ${breakdown.pfWage}`,
      sort_order: 90,
    });
  }
  if (breakdown.pfEmployer > 0) {
    rows.push({
      kind: "EMPLOYER",
      code: "PF_ER",
      name: "Employer PF",
      amount: breakdown.pfEmployer,
      notes: breakdown.pfEps > 0 ? `EPS ${breakdown.pfEps}; EPF ${breakdown.pfEpf}` : null,
      sort_order: 91,
    });
  }
  if (breakdown.esiEmployee > 0) {
    rows.push({
      kind: "STATUTORY",
      code: "ESI",
      name: "ESI",
      amount: breakdown.esiEmployee,
      notes: `Wage ${breakdown.esiWage}`,
      sort_order: 92,
    });
  }
  if (breakdown.esiEmployer > 0) {
    rows.push({
      kind: "EMPLOYER",
      code: "ESI_ER",
      name: "Employer ESI",
      amount: breakdown.esiEmployer,
      notes: null,
      sort_order: 93,
    });
  }
  if (breakdown.ptAmount > 0) {
    rows.push({
      kind: "STATUTORY",
      code: "PT",
      name: "Professional Tax",
      amount: breakdown.ptAmount,
      notes: breakdown.ptStateCode,
      sort_order: 94,
    });
  }
  if (breakdown.tdsAmount > 0) {
    rows.push({
      kind: "STATUTORY",
      code: "TDS",
      name: "TDS",
      amount: breakdown.tdsAmount,
      notes: breakdown.tdsRegime,
      sort_order: 95,
    });
  }
  if (breakdown.lwfEmployee > 0) {
    rows.push({
      kind: "STATUTORY",
      code: "LWF",
      name: "Labour Welfare Fund",
      amount: breakdown.lwfEmployee,
      notes: null,
      sort_order: 96,
    });
  }
  if (breakdown.lwfEmployer > 0) {
    rows.push({
      kind: "EMPLOYER",
      code: "LWF_ER",
      name: "Employer LWF",
      amount: breakdown.lwfEmployer,
      notes: null,
      sort_order: 97,
    });
  }
  return rows.map((row) => ({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    run_id: input.runId,
    item_id: input.itemId,
    employee_id: input.employeeId,
    kind: row.kind,
    code: row.code,
    name: row.name,
    amount: row.amount,
    taxable: false,
    reference_id: null,
    notes: row.notes,
    sort_order: row.sort_order,
    created_at: input.createdAt,
  }));
}
