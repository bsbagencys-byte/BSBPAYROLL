import type {
  AttendanceSalaryInputs,
  EmployeeSalaryAssignment,
  EmployeeSalarySnapshot,
  SalaryComponent,
  SalaryLine,
  SalaryStructure,
  SalaryStructureItem,
} from "@/types";
import { evaluateFormula, validateFormula } from "@/lib/salary/formula";

export function asBool(value: unknown, fallback = false) {
  if (value === true || value === "on" || value === "true") return true;
  if (value === false || value === "false" || value === "") return false;
  return fallback;
}

export function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function periodsOverlap(fromA: string, toA: string | null, fromB: string, toB: string | null) {
  const endA = toA ?? "9999-12-31";
  const endB = toB ?? "9999-12-31";
  return fromA <= endB && fromB <= endA;
}

export function assignmentForDate(rows: EmployeeSalaryAssignment[], employeeId: string, date: string) {
  return (
    rows.find(
      (item) =>
        item.employee_id === employeeId &&
        item.status === "ACTIVE" &&
        item.effective_from <= date &&
        (!item.effective_to || item.effective_to >= date)
    ) ?? null
  );
}

export function overlappingAssignment(
  rows: EmployeeSalaryAssignment[],
  employeeId: string,
  from: string,
  to: string | null,
  excludeId?: string
) {
  return rows.find(
    (item) =>
      item.employee_id === employeeId &&
      item.status === "ACTIVE" &&
      item.id !== excludeId &&
      periodsOverlap(item.effective_from, item.effective_to, from, to)
  ) ?? null;
}

function resolveAmount(
  item: SalaryStructureItem,
  component: SalaryComponent,
  amounts: Record<string, number>,
  ctc: number,
  knownCodes: string[]
): { amount: number; error?: string } {
  const method = item.calculation_method;
  if (method === "FIXED") return { amount: roundMoney(item.fixed_amount ?? component.fixed_amount ?? 0) };
  if (method === "MANUAL") return { amount: 0 };
  if (method === "PERCENTAGE") {
    const base = item.base_component_id
      ? Object.entries(amounts).find(([code]) => {
          return knownCodes.includes(code);
        })
      : null;
    const baseCode = item.base_component_id
      ? knownCodes.find((code) => amounts[code] !== undefined)
      : "CTC";
    const baseAmount = item.base_component_id
      ? (base ? amounts[base[0]] : amounts[baseCode ?? ""] ?? 0)
      : ctc;
    void base;
    const pct = item.percentage ?? component.percentage ?? 0;
    return { amount: roundMoney((baseAmount * pct) / 100) };
  }
  if (method === "FORMULA") {
    const formula = item.formula || component.formula;
    if (!formula) return { amount: 0, error: `${component.code} has no formula.` };
    const check = validateFormula(formula, knownCodes);
    if (!check.ok) return { amount: 0, error: check.error };
    const result = evaluateFormula(formula, { ...amounts, CTC: ctc, GROSS: amounts.GROSS ?? 0 }, knownCodes);
    if (!result.ok) return { amount: 0, error: result.error };
    return { amount: roundMoney(result.value) };
  }
  return { amount: 0 };
}

export function calculateStructure(
  structure: SalaryStructure,
  items: SalaryStructureItem[],
  components: SalaryComponent[],
  ctc: number,
  extras?: AttendanceSalaryInputs
): { snapshot: Omit<EmployeeSalarySnapshot, "employeeId" | "assignmentId" | "effectiveFrom" | "effectiveTo">; error?: string } {
  const componentById = new Map(components.map((item) => [item.id, item]));
  const ordered = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const knownCodes = components.map((item) => item.code.toUpperCase());
  const amounts: Record<string, number> = {
    CTC: ctc,
    GROSS: 0,
    WORKING_DAYS: extras?.workingDays ?? 0,
    PRESENT_DAYS: extras?.presentDays ?? 0,
    LOP_DAYS: extras?.unpaidLeaveDays ?? 0,
    OT_HOURS: extras ? roundMoney(extras.otMinutes / 60) : 0,
  };

  const residualItems = ordered.filter((item) => item.calculation_method === "RESIDUAL");
  const computed: { item: SalaryStructureItem; component: SalaryComponent; amount: number }[] = [];

  for (const item of ordered) {
    const component = componentById.get(item.component_id);
    if (!component) continue;
    if (item.calculation_method === "RESIDUAL") continue;
    let amount = 0;
    if (item.calculation_method === "PERCENTAGE") {
      const baseComponent = item.base_component_id ? componentById.get(item.base_component_id) : null;
      const baseAmount = baseComponent ? amounts[baseComponent.code.toUpperCase()] ?? 0 : ctc;
      const pct = item.percentage ?? component.percentage ?? 0;
      amount = roundMoney((baseAmount * pct) / 100);
    } else {
      const resolved = resolveAmount(item, component, amounts, ctc, knownCodes);
      if (resolved.error) {
        return {
          snapshot: emptySnapshot(structure, ctc),
          error: resolved.error,
        };
      }
      amount = resolved.amount;
    }
    amounts[component.code.toUpperCase()] = amount;
    computed.push({ item, component, amount });
  }

  const monthlyCtc = roundMoney(ctc / 12);
  const assigned = roundMoney(
    computed
      .filter((row) => row.item.include_in_ctc && row.component.component_type === "EARNING")
      .reduce((sum, row) => sum + row.amount, 0)
  );
  const residual = roundMoney(Math.max(0, monthlyCtc - assigned));
  for (const item of residualItems) {
    const component = componentById.get(item.component_id);
    if (!component) continue;
    amounts[component.code.toUpperCase()] = residual;
    computed.push({ item, component, amount: residual });
  }

  const lines: SalaryLine[] = computed
    .sort((a, b) => a.item.sort_order - b.item.sort_order)
    .map((row) => ({
      componentId: row.component.id,
      code: row.component.code,
      name: row.component.name,
      componentType: row.component.component_type,
      category: row.component.category,
      calculationMethod: row.item.calculation_method,
      formula: row.item.formula ?? row.component.formula,
      amount: row.amount,
      includeInCtc: row.item.include_in_ctc,
      includeInGross: row.item.include_in_gross,
      variable: row.component.variable,
    }));

  const earningLines = lines.filter((line) => line.componentType === "EARNING");
  const gross = roundMoney(earningLines.filter((line) => line.includeInGross && !line.variable).reduce((sum, line) => sum + line.amount, 0));
  amounts.GROSS = gross;

  return {
    snapshot: {
      structureId: structure.id,
      structureName: structure.name,
      structureCode: structure.code,
      ctc,
      gross,
      fixedEarnings: roundMoney(earningLines.filter((line) => !line.variable).reduce((sum, line) => sum + line.amount, 0)),
      variableEarnings: roundMoney(earningLines.filter((line) => line.variable).reduce((sum, line) => sum + line.amount, 0)),
      deductions: roundMoney(lines.filter((line) => line.componentType === "DEDUCTION").reduce((sum, line) => sum + line.amount, 0)),
      reimbursements: roundMoney(lines.filter((line) => line.componentType === "REIMBURSEMENT").reduce((sum, line) => sum + line.amount, 0)),
      employerBenefits: roundMoney(lines.filter((line) => line.category === "BENEFIT" || line.category === "STATUTORY_PLACEHOLDER").reduce((sum, line) => sum + line.amount, 0)),
      lines,
    },
  };
}

function emptySnapshot(structure: SalaryStructure, ctc: number) {
  return {
    structureId: structure.id,
    structureName: structure.name,
    structureCode: structure.code,
    ctc,
    gross: 0,
    fixedEarnings: 0,
    variableEarnings: 0,
    deductions: 0,
    reimbursements: 0,
    employerBenefits: 0,
    lines: [] as SalaryLine[],
  };
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  return [headers.join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n");
}

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}
