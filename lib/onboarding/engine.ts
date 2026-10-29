import {
  DATA_EXPORT_TTL_HOURS,
  ONBOARDING_STEP_HREFS,
  ONBOARDING_STEP_KEYS,
  ONBOARDING_STEP_LABELS,
  SUPPORT_SLA_HOURS,
  type ImportEntityType,
  type ImportJobStatus,
  type OnboardingStepKey,
  type OnboardingStepStatus,
  type SupportPriority,
  type SupportTicketStatus,
} from "@/lib/constants";
import type { OnboardingStepView } from "@/types";

export const REQUIRED_ONBOARDING_STEPS: OnboardingStepKey[] = [
  "COMPANY",
  "BRANCHES",
  "EMPLOYEES",
  "STATUTORY",
  "SALARY",
  "LEAVE",
  "PAYROLL",
  "USERS",
  "REVIEW",
];

export type OnboardingFacts = {
  companyComplete: boolean;
  companyEvidence: string[];
  branchCount: number;
  departmentCount: number;
  employeeCount: number;
  statutoryConfigured: boolean;
  salaryStructureCount: number;
  leaveTypeCount: number;
  biometricDeviceCount: number;
  userCount: number;
  skippedAttendance: boolean;
};

export function splitCsv(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells: string[] = [];
      let current = "";
      let quoted = false;
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === '"') {
          if (quoted && line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else quoted = !quoted;
        } else if (char === "," && !quoted) {
          cells.push(current.trim());
          current = "";
        } else current += char;
      }
      cells.push(current.trim());
      return cells;
    });
}

export function headerIndex(headers: string[], name: string) {
  return headers.findIndex((header) => header.toLowerCase().replace(/\s+/g, "_") === name);
}

export function rejectNonCsv(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".xlsm")) {
    return "Excel files are not imported. Upload CSV only.";
  }
  if (!lower.endsWith(".csv") && lower.includes(".")) {
    return "Upload a CSV file.";
  }
  return null;
}

export function evaluateStep(key: OnboardingStepKey, facts: OnboardingFacts): OnboardingStepView {
  const base = {
    step_key: key,
    label: ONBOARDING_STEP_LABELS[key],
    href: ONBOARDING_STEP_HREFS[key],
    required: REQUIRED_ONBOARDING_STEPS.includes(key),
    blocked: false,
    skipped_reason: null as string | null,
  };
  if (key === "COMPANY") {
    return {
      ...base,
      status: facts.companyComplete ? "COMPLETE" : "NOT_STARTED",
      evidence: facts.companyEvidence,
    };
  }
  if (key === "BRANCHES") {
    const complete = facts.branchCount > 0 && facts.departmentCount > 0;
    return {
      ...base,
      status: complete ? "COMPLETE" : facts.branchCount > 0 ? "IN_PROGRESS" : "NOT_STARTED",
      evidence: [`${facts.branchCount} branch(es)`, `${facts.departmentCount} department(s)`],
    };
  }
  if (key === "EMPLOYEES") {
    return {
      ...base,
      status: facts.employeeCount > 0 ? "COMPLETE" : "NOT_STARTED",
      evidence: [`${facts.employeeCount} employee(s)`],
    };
  }
  if (key === "STATUTORY") {
    return {
      ...base,
      status: facts.statutoryConfigured ? "COMPLETE" : "NOT_STARTED",
      evidence: facts.statutoryConfigured ? ["Statutory settings present"] : ["Statutory settings missing"],
    };
  }
  if (key === "SALARY") {
    return {
      ...base,
      status: facts.salaryStructureCount > 0 ? "COMPLETE" : "NOT_STARTED",
      evidence: [`${facts.salaryStructureCount} salary structure(s)`],
    };
  }
  if (key === "LEAVE") {
    return {
      ...base,
      status: facts.leaveTypeCount > 0 ? "COMPLETE" : "NOT_STARTED",
      evidence: [`${facts.leaveTypeCount} leave type(s)`],
    };
  }
  if (key === "ATTENDANCE") {
    if (facts.skippedAttendance) {
      return {
        ...base,
        status: "SKIPPED",
        blocked: true,
        required: false,
        skipped_reason: "Phase 4 attendance is not started. This step is optional.",
        evidence: ["Attendance calculation is not available"],
      };
    }
    return {
      ...base,
      status: "BLOCKED",
      blocked: true,
      required: false,
      skipped_reason: "Phase 4 attendance is not started.",
      evidence: ["Shifts and punch-to-day calculation are not implemented"],
    };
  }
  if (key === "BIOMETRIC") {
    return {
      ...base,
      required: false,
      status: facts.biometricDeviceCount > 0 ? "COMPLETE" : "NOT_STARTED",
      evidence: [`${facts.biometricDeviceCount} device(s)`],
    };
  }
  if (key === "PAYROLL") {
    const ready = facts.employeeCount > 0 && facts.salaryStructureCount > 0 && facts.companyComplete;
    return {
      ...base,
      status: ready ? "COMPLETE" : "NOT_STARTED",
      evidence: ready
        ? ["Employees and salary structures are present. Payroll can be calculated when needed."]
        : ["Employees and salary structures are required before payroll is ready"],
    };
  }
  if (key === "USERS") {
    return {
      ...base,
      status: facts.userCount > 0 ? "COMPLETE" : "NOT_STARTED",
      evidence: [`${facts.userCount} user(s)`],
    };
  }
  const requiredDone = REQUIRED_ONBOARDING_STEPS.filter((step) => step !== "REVIEW").every((step) => {
    const view = evaluateStep(step, facts);
    return view.status === "COMPLETE" || view.status === "SKIPPED";
  });
  return {
    ...base,
    status: requiredDone ? "COMPLETE" : "NOT_STARTED",
    evidence: requiredDone
      ? ["Required onboarding steps have stored data"]
      : ["Complete required steps with stored data before go-live"],
  };
}

export function evaluateOnboarding(facts: OnboardingFacts): OnboardingStepView[] {
  return ONBOARDING_STEP_KEYS.map((key) => evaluateStep(key, facts));
}

export function onboardingComplete(steps: OnboardingStepView[]) {
  return REQUIRED_ONBOARDING_STEPS.every((key) => {
    const step = steps.find((item) => item.step_key === key);
    return step?.status === "COMPLETE" || step?.status === "SKIPPED";
  });
}

export function currentOnboardingStep(steps: OnboardingStepView[]): OnboardingStepKey {
  const pending = steps.find((step) => step.required && step.status !== "COMPLETE" && step.status !== "SKIPPED");
  return pending?.step_key ?? "REVIEW";
}

export function persistableStatus(view: OnboardingStepView): OnboardingStepStatus {
  return view.status;
}

export const IMPORT_TEMPLATES: Record<ImportEntityType, { headers: string[]; sample: string[][]; notes: string }> = {
  EMPLOYEES: {
    headers: ["employee_id", "first_name", "last_name", "mobile", "joining_date", "branch", "employment_type", "department", "designation"],
    sample: [
      ["BSB-2001", "Anita", "Nair", "9876500001", "2024-04-01", "Head Office", "Full Time", "Operations", "Staff"],
    ],
    notes: "Required: employee_id, first_name, last_name, mobile, joining_date, branch, employment_type.",
  },
  SALARY: {
    headers: ["employee_id", "structure_code", "ctc_amount", "effective_from"],
    sample: [["BSB-1001", "STAFF", "600000", "2024-04-01"]],
    notes: "Assigns CTC to an existing employee and salary structure. Does not overwrite closed history.",
  },
  LEAVE_BALANCES: {
    headers: ["employee_id", "leave_type_code", "year", "opening"],
    sample: [["BSB-1001", "CL", "2026", "6"]],
    notes: "Opening leave balances. Existing ledger rows are preserved; opening is adjusted, not deleted.",
  },
  LOAN_BALANCES: {
    headers: ["employee_id", "loan_type_code", "outstanding_principal", "emi_amount", "remaining_installments", "start_date"],
    sample: [["BSB-1001", "ADV", "15000", "5000", "3", "2026-01-01"]],
    notes: "Opening loan balances. Creates an imported opening account; does not rewrite paid history.",
  },
  HISTORICAL_PAYROLL: {
    headers: ["employee_id", "period", "gross", "deductions", "net", "pay_date"],
    sample: [["BSB-1001", "2025-12", "50000", "5000", "45000", "2025-12-31"]],
    notes: "Imported historical payroll is labelled imported. It is never claimed as BSB-calculated.",
  },
  OPENING_BALANCES: {
    headers: ["employee_id", "kind", "reference_code", "amount", "as_of_date", "notes"],
    sample: [["BSB-1001", "LEAVE", "CL", "6", "2026-01-01", "Opening CL"]],
    notes: "Generic opening balances. kind is LEAVE, LOAN or SALARY.",
  },
};

export function templateCsv(entity: ImportEntityType) {
  const template = IMPORT_TEMPLATES[entity];
  const escape = (cell: string) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);
  return [template.headers.map(escape).join(","), ...template.sample.map((row) => row.map(escape).join(","))].join("\n");
}

export function requiredColumns(entity: ImportEntityType) {
  const map: Record<ImportEntityType, string[]> = {
    EMPLOYEES: ["employee_id", "first_name", "last_name", "mobile", "joining_date", "branch", "employment_type"],
    SALARY: ["employee_id", "structure_code", "ctc_amount", "effective_from"],
    LEAVE_BALANCES: ["employee_id", "leave_type_code", "year", "opening"],
    LOAN_BALANCES: ["employee_id", "loan_type_code", "outstanding_principal", "emi_amount", "remaining_installments", "start_date"],
    HISTORICAL_PAYROLL: ["employee_id", "period", "gross", "net"],
    OPENING_BALANCES: ["employee_id", "kind", "amount", "as_of_date"],
  };
  return map[entity];
}

export function canConfirmImport(status: ImportJobStatus) {
  return status === "PREVIEWED";
}

export function importOutcome(imported: number, errors: number, total: number): ImportJobStatus {
  if (total === 0) return "FAILED";
  if (imported === 0) return "FAILED";
  if (errors > 0 || imported < total) return "PARTIAL";
  return "IMPORTED";
}

export function slaDueAt(priority: SupportPriority, from = new Date()) {
  return new Date(from.getTime() + SUPPORT_SLA_HOURS[priority] * 3600 * 1000).toISOString();
}

export function ticketNumber(sequence: number) {
  return `SUP-${String(sequence).padStart(5, "0")}`;
}

export function canCustomerReply(status: SupportTicketStatus) {
  return status !== "CLOSED";
}

export function nextTicketStatus(current: SupportTicketStatus, action: "reply" | "progress" | "waiting" | "resolve" | "close"): SupportTicketStatus {
  if (current === "CLOSED") return "CLOSED";
  if (action === "close") return "CLOSED";
  if (action === "resolve") return "RESOLVED";
  if (action === "waiting") return "WAITING_CUSTOMER";
  if (action === "progress") return "IN_PROGRESS";
  if (action === "reply" && current === "WAITING_CUSTOMER") return "IN_PROGRESS";
  if (action === "reply" && current === "OPEN") return "OPEN";
  return current;
}

export function exportExpiresAt(from = new Date()) {
  return new Date(from.getTime() + DATA_EXPORT_TTL_HOURS * 3600 * 1000).toISOString();
}

export function maskSecret(value: string | null | undefined) {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

export function isSlaBreached(dueAt: string | null, status: SupportTicketStatus, now = new Date()) {
  if (!dueAt) return false;
  if (status === "RESOLVED" || status === "CLOSED") return false;
  return new Date(dueAt).getTime() < now.getTime();
}

export function historicalPayrollNotes(period: string) {
  return `Imported historical payroll for ${period}. Not calculated by BSB Payroll.`;
}
