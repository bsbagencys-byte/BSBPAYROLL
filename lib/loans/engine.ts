import { addDays, parseDateOnly, toDateOnly } from "@/lib/leave/dates";
import type {
  EmployeeEmployment,
  LoanAccount,
  LoanApplication,
  LoanInterestMethod,
  LoanPolicy,
  LoanScheduleItem,
  LoanType,
} from "@/types";

export function asBool(value: unknown) {
  return value === true || value === "on" || value === "true";
}

export function asNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  const escape = (cell: string | number | boolean | null | undefined) => {
    const text = cell === null || cell === undefined ? "" : String(cell);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  return [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
}

export function addMonths(value: string, amount: number) {
  const date = parseDateOnly(value);
  date.setMonth(date.getMonth() + amount);
  return toDateOnly(date);
}

export interface LoanQuote {
  principal: number;
  interestAmount: number;
  totalRepayment: number;
  emiAmount: number;
  firstDueDate: string;
  lastDueDate: string;
  schedule: Array<{
    installmentNumber: number;
    dueDate: string;
    principal: number;
    interest: number;
    emi: number;
  }>;
}

export function quoteLoan(input: {
  principal: number;
  tenureMonths: number;
  interestMethod: LoanInterestMethod;
  interestRate: number | null;
  startDate: string;
}): LoanQuote {
  const principal = roundMoney(Math.max(0, input.principal));
  const tenure = Math.max(1, Math.floor(input.tenureMonths));
  const annualRate = Math.max(0, input.interestRate ?? 0);
  const monthlyRate = annualRate / 12 / 100;
  const firstDueDate = addMonths(input.startDate, 1);

  if (input.interestMethod === "NONE" || annualRate === 0 || monthlyRate === 0) {
    const base = roundMoney(principal / tenure);
    const schedule = Array.from({ length: tenure }, (_, index) => {
      const installmentNumber = index + 1;
      const principalPart = installmentNumber === tenure ? roundMoney(principal - base * (tenure - 1)) : base;
      return {
        installmentNumber,
        dueDate: addMonths(firstDueDate, index),
        principal: principalPart,
        interest: 0,
        emi: principalPart,
      };
    });
    const total = roundMoney(schedule.reduce((sum, item) => sum + item.emi, 0));
    return {
      principal,
      interestAmount: 0,
      totalRepayment: total,
      emiAmount: schedule[0]?.emi ?? 0,
      firstDueDate,
      lastDueDate: schedule[schedule.length - 1]?.dueDate ?? firstDueDate,
      schedule,
    };
  }

  if (input.interestMethod === "FLAT") {
    const interestAmount = roundMoney(principal * (annualRate / 100) * (tenure / 12));
    const total = roundMoney(principal + interestAmount);
    const emi = roundMoney(total / tenure);
    let remainingPrincipal = principal;
    let remainingInterest = interestAmount;
    const schedule = Array.from({ length: tenure }, (_, index) => {
      const installmentNumber = index + 1;
      const last = installmentNumber === tenure;
      const principalPart = last ? remainingPrincipal : roundMoney(principal / tenure);
      const interestPart = last ? remainingInterest : roundMoney(interestAmount / tenure);
      remainingPrincipal = roundMoney(remainingPrincipal - principalPart);
      remainingInterest = roundMoney(remainingInterest - interestPart);
      return {
        installmentNumber,
        dueDate: addMonths(firstDueDate, index),
        principal: principalPart,
        interest: interestPart,
        emi: roundMoney(principalPart + interestPart),
      };
    });
    return {
      principal,
      interestAmount,
      totalRepayment: total,
      emiAmount: emi,
      firstDueDate,
      lastDueDate: schedule[schedule.length - 1]?.dueDate ?? firstDueDate,
      schedule,
    };
  }

  const factor = Math.pow(1 + monthlyRate, tenure);
  const emi = roundMoney((principal * monthlyRate * factor) / (factor - 1));
  let balance = principal;
  const schedule = Array.from({ length: tenure }, (_, index) => {
    const installmentNumber = index + 1;
    const interest = roundMoney(balance * monthlyRate);
    const last = installmentNumber === tenure;
    const principalPart = last ? roundMoney(balance) : roundMoney(Math.min(balance, emi - interest));
    balance = roundMoney(Math.max(0, balance - principalPart));
    return {
      installmentNumber,
      dueDate: addMonths(firstDueDate, index),
      principal: principalPart,
      interest,
      emi: roundMoney(principalPart + interest),
    };
  });
  const interestAmount = roundMoney(schedule.reduce((sum, item) => sum + item.interest, 0));
  return {
    principal,
    interestAmount,
    totalRepayment: roundMoney(principal + interestAmount),
    emiAmount: schedule[0]?.emi ?? emi,
    firstDueDate,
    lastDueDate: schedule[schedule.length - 1]?.dueDate ?? firstDueDate,
    schedule,
  };
}

export function policyInForce(policy: LoanPolicy, onDate: string) {
  if (policy.status !== "ACTIVE") return false;
  if (policy.effective_from > onDate) return false;
  if (policy.effective_to && policy.effective_to < onDate) return false;
  return true;
}

export function matchLoanPolicy(input: {
  policies: LoanPolicy[];
  loanTypeId: string;
  employment: EmployeeEmployment | null;
  employeeId: string;
  onDate: string;
}) {
  const scored = input.policies
    .filter((item) => item.loan_type_id === input.loanTypeId && policyInForce(item, input.onDate))
    .map((policy) => {
      let score = 0;
      if (policy.scope === "EMPLOYEE") {
        if (policy.employee_id !== input.employeeId) return null;
        score += 16;
      } else if (policy.scope === "DESIGNATION") {
        if (!input.employment || policy.designation_id !== input.employment.designation_id) return null;
        score += 8;
      } else if (policy.scope === "DEPARTMENT") {
        if (!input.employment || policy.department_id !== input.employment.department_id) return null;
        score += 6;
      } else if (policy.scope === "BRANCH") {
        if (!input.employment || policy.branch_id !== input.employment.branch_id) return null;
        score += 4;
      } else if (policy.scope === "EMPLOYMENT_TYPE") {
        if (!input.employment || policy.employment_type_id !== input.employment.employment_type_id) return null;
        score += 4;
      } else {
        score += 1;
      }
      return { policy, score };
    })
    .filter((item): item is { policy: LoanPolicy; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.policy ?? null;
}

export function monthsBetween(from: string, to: string) {
  const start = parseDateOnly(from);
  const end = parseDateOnly(to);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

export interface LoanCheck {
  check_code: string;
  result: "PASS" | "WARN" | "FAIL";
  message: string;
}

export function validateLoanApplication(input: {
  loanType: LoanType | null;
  policy: LoanPolicy | null;
  employment: EmployeeEmployment | null;
  requestedAmount: number;
  tenureMonths: number;
  onDate: string;
  activeAccounts: LoanAccount[];
  openApplications: LoanApplication[];
}): { checks: LoanCheck[]; blocking: LoanCheck[]; ok: boolean } {
  const checks: LoanCheck[] = [];
  const add = (check_code: string, result: LoanCheck["result"], message: string) => {
    checks.push({ check_code, result, message });
  };

  if (!input.loanType || input.loanType.status !== "ACTIVE") {
    add("TYPE_ACTIVE", "FAIL", "Loan type is missing or disabled.");
  } else {
    add("TYPE_ACTIVE", "PASS", "Loan type is active.");
    const maxAmount = input.policy?.max_amount ?? input.loanType.max_amount;
    if (maxAmount != null && input.requestedAmount > maxAmount) {
      add("MAX_AMOUNT", "FAIL", `Requested amount exceeds the limit of ${maxAmount}.`);
    } else {
      add("MAX_AMOUNT", "PASS", "Requested amount is within the limit.");
    }
    const maxTenure = input.policy?.max_tenure_months ?? input.loanType.max_tenure_months;
    if (maxTenure != null && input.tenureMonths > maxTenure) {
      add("MAX_TENURE", "FAIL", `Tenure exceeds the maximum of ${maxTenure} months.`);
    } else {
      add("MAX_TENURE", "PASS", "Tenure is within the limit.");
    }
    if (!input.loanType.allow_multiple_active && input.activeAccounts.length > 0) {
      add("ACTIVE_LOANS", "FAIL", "An active loan of this type already exists for the employee.");
    } else {
      const maxActive = input.policy?.max_active_loans;
      if (maxActive != null && input.activeAccounts.length >= maxActive) {
        add("ACTIVE_LOANS", "FAIL", `Employee already has ${input.activeAccounts.length} active loan(s).`);
      } else {
        add("ACTIVE_LOANS", "PASS", "Active loan limit is satisfied.");
      }
    }
  }

  if (input.openApplications.length > 0) {
    add("DUPLICATE", "FAIL", "A draft or pending application already exists for this loan type.");
  } else {
    add("DUPLICATE", "PASS", "No overlapping application found.");
  }

  const minService = input.policy?.min_service_months;
  if (minService != null) {
    const joining = input.employment?.joining_date;
    const served = joining ? monthsBetween(joining, input.onDate) : 0;
    if (!joining || served < minService) {
      add("ELIGIBILITY", "FAIL", `Minimum service of ${minService} months is required.`);
    } else {
      add("ELIGIBILITY", "PASS", "Service eligibility is met.");
    }
  } else {
    add("ELIGIBILITY", "PASS", "No service eligibility rule.");
  }

  if (input.requestedAmount <= 0) add("AMOUNT", "FAIL", "Requested amount must be greater than zero.");
  if (input.tenureMonths < 1) add("TENURE", "FAIL", "Tenure must be at least 1 month.");

  const blocking = checks.filter((item) => item.result === "FAIL");
  return { checks, blocking, ok: blocking.length === 0 };
}

export function installmentStatusForDate(item: LoanScheduleItem, today: string): LoanScheduleItem["status"] {
  if (item.status === "PAID" || item.status === "WAIVED" || item.status === "DEFERRED") return item.status;
  if (item.paid_amount > 0 && item.paid_amount < item.emi_amount) {
    return item.due_date < today ? "OVERDUE" : "PARTIALLY_PAID";
  }
  if (item.due_date < today) return "OVERDUE";
  if (item.due_date === today) return "DUE";
  return "UPCOMING";
}

export function periodKey(date: string) {
  return date.slice(0, 7);
}

export function nextWorkingDue(from: string) {
  return addDays(from, 0);
}
