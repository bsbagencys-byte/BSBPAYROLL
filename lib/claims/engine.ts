import { periodsOverlap } from "@/lib/salary/engine";
import type {
  BenefitPolicy,
  Claim,
  ClaimAttachment,
  ClaimPolicy,
  ClaimPolicyCheck,
  ClaimType,
  EmployeeBenefit,
  EmployeeEmployment,
} from "@/types";
import type { ClaimPolicyCheckResult, PolicyScope } from "@/lib/constants";

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

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (value: string | number | null | undefined) => {
    const text = value == null ? "" : String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  return [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
}

export function policyInForce(from: string, to: string | null, date: string) {
  return from <= date && (!to || to >= date);
}

export function overlappingBenefit(
  rows: EmployeeBenefit[],
  employeeId: string,
  benefitTypeId: string,
  from: string,
  to: string | null,
  excludeId?: string
) {
  return (
    rows.find(
      (item) =>
        item.employee_id === employeeId &&
        item.benefit_type_id === benefitTypeId &&
        item.status === "ACTIVE" &&
        item.id !== excludeId &&
        periodsOverlap(item.effective_from, item.effective_to, from, to)
    ) ?? null
  );
}

export function benefitForDate(rows: EmployeeBenefit[], employeeId: string, benefitTypeId: string, date: string) {
  return (
    rows.find(
      (item) =>
        item.employee_id === employeeId &&
        item.benefit_type_id === benefitTypeId &&
        item.status === "ACTIVE" &&
        item.effective_from <= date &&
        (!item.effective_to || item.effective_to >= date)
    ) ?? null
  );
}

function scopeMatches(scope: PolicyScope, policy: BenefitPolicy, employment: EmployeeEmployment | null, employeeId: string) {
  if (scope === "ORGANIZATION") return true;
  if (scope === "BRANCH") return Boolean(policy.branch_id && employment?.branch_id === policy.branch_id);
  if (scope === "DEPARTMENT") return Boolean(policy.department_id && employment?.department_id === policy.department_id);
  if (scope === "DESIGNATION") return Boolean(policy.designation_id && employment?.designation_id === policy.designation_id);
  if (scope === "EMPLOYMENT_TYPE") return Boolean(policy.employment_type_id && employment?.employment_type_id === policy.employment_type_id);
  if (scope === "EMPLOYEE") return policy.employee_id === employeeId;
  return false;
}

export function matchBenefitPolicy(
  policies: BenefitPolicy[],
  benefitTypeId: string,
  date: string,
  employment: EmployeeEmployment | null,
  employeeId: string
) {
  return (
    policies.find(
      (item) =>
        item.benefit_type_id === benefitTypeId &&
        item.status === "ACTIVE" &&
        policyInForce(item.effective_from, item.effective_to, date) &&
        scopeMatches(item.scope, item, employment, employeeId)
    ) ?? null
  );
}

export function matchTravelPolicy(
  policies: ClaimPolicy[],
  claimTypeId: string,
  date: string,
  extras: { designationId?: string | null; cityCategory?: string | null; travelType?: string | null }
) {
  const active = policies.filter(
    (item) => item.status === "ACTIVE" && policyInForce(item.effective_from, item.effective_to, date)
  );
  const scored = active
    .filter((item) => !item.claim_type_id || item.claim_type_id === claimTypeId)
    .map((item) => {
      let score = 0;
      if (item.claim_type_id === claimTypeId) score += 8;
      if (item.designation_id && extras.designationId && item.designation_id === extras.designationId) score += 4;
      if (item.city_category && extras.cityCategory && item.city_category === extras.cityCategory) score += 2;
      if (item.travel_type && extras.travelType && item.travel_type === extras.travelType) score += 2;
      if (item.designation_id && extras.designationId && item.designation_id !== extras.designationId) return null;
      if (item.city_category && extras.cityCategory && item.city_category !== extras.cityCategory) return null;
      if (item.travel_type && extras.travelType && item.travel_type !== extras.travelType) return null;
      return { item, score };
    })
    .filter((row): row is { item: ClaimPolicy; score: number } => Boolean(row))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.item ?? null;
}

export function calculateTravelAmounts(input: {
  distance?: number | null;
  ratePerKm?: number | null;
  travelDays?: number | null;
  policy: ClaimPolicy | null;
}) {
  const rate = input.ratePerKm ?? input.policy?.mileage_rate ?? 0;
  const days = input.travelDays ?? 0;
  const ta = roundMoney((input.distance ?? 0) * rate);
  const da = roundMoney(days * (input.policy?.da_per_day ?? 0));
  return { ta, da, total: roundMoney(ta + da), rate };
}

export type PolicyCheckInput = {
  claim: Pick<
    Claim,
    | "employee_id"
    | "claim_type_id"
    | "claim_date"
    | "period_from"
    | "period_to"
    | "submitted_amount"
    | "distance"
    | "rate_per_km"
    | "travel_days"
    | "id"
  >;
  claimType: ClaimType;
  policy: ClaimPolicy | null;
  benefitPolicy: BenefitPolicy | null;
  assignment: EmployeeBenefit | null;
  attachments: ClaimAttachment[];
  existing: Claim[];
};

export function validateClaim(input: PolicyCheckInput) {
  const checks: Omit<ClaimPolicyCheck, "id" | "organization_id" | "created_at">[] = [];
  const add = (check_code: string, result: ClaimPolicyCheckResult, message: string) => {
    checks.push({ claim_id: input.claim.id, check_code, result, message });
  };

  if (input.claimType.status !== "ACTIVE") add("TYPE_ACTIVE", "FAIL", "This claim type is disabled.");
  else add("TYPE_ACTIVE", "PASS", "Claim type is active.");

  if (input.benefitPolicy) {
    if (!policyInForce(input.benefitPolicy.effective_from, input.benefitPolicy.effective_to, input.claim.claim_date)) {
      add("DATE_VALIDITY", "FAIL", "Benefit policy is not in force for this date.");
    } else add("DATE_VALIDITY", "PASS", "Benefit policy date is valid.");
    if (input.benefitPolicy.require_assignment && !input.assignment) {
      add("ELIGIBLE_BENEFIT", "FAIL", "Employee does not have an active assignment for this benefit.");
    } else add("ELIGIBLE_BENEFIT", "PASS", "Employee is eligible for this benefit.");
  } else if (input.policy) {
    add("DATE_VALIDITY", policyInForce(input.policy.effective_from, input.policy.effective_to, input.claim.claim_date) ? "PASS" : "FAIL",
      policyInForce(input.policy.effective_from, input.policy.effective_to, input.claim.claim_date)
        ? "Travel policy date is valid."
        : "Travel policy is not in force for this date.");
    add("ELIGIBLE_BENEFIT", "PASS", "Claim type is available.");
  } else {
    add("ELIGIBLE_BENEFIT", "WARN", "No matching policy found. Approver should review.");
  }

  const limit = input.policy?.max_amount ?? input.benefitPolicy?.max_amount ?? input.claimType.max_amount;
  if (limit != null && input.claim.submitted_amount > limit) {
    add("MAX_AMOUNT", "FAIL", `Submitted amount exceeds policy limit of ${limit}.`);
  } else if (limit != null) {
    add("MAX_AMOUNT", "PASS", `Submitted amount is within the limit of ${limit}.`);
  } else {
    add("MAX_AMOUNT", "WARN", "No maximum amount is configured.");
  }

  const from = input.claim.period_from || input.claim.claim_date;
  const to = input.claim.period_to || input.claim.claim_date;
  const duplicate = input.existing.find(
    (item) =>
      item.id !== input.claim.id &&
      item.employee_id === input.claim.employee_id &&
      item.claim_type_id === input.claim.claim_type_id &&
      item.status !== "CANCELLED" &&
      item.status !== "REJECTED" &&
      periodsOverlap(item.period_from || item.claim_date, item.period_to || item.claim_date, from, to)
  );
  if (duplicate) add("DUPLICATE", "FAIL", `A similar claim already exists (${duplicate.reference_number || duplicate.id.slice(0, 8)}).`);
  else add("DUPLICATE", "PASS", "No overlapping claim found.");

  const needsReceipt = input.claimType.requires_receipt || input.policy?.require_receipt;
  if (needsReceipt && input.attachments.length === 0) add("RECEIPT", "FAIL", "A receipt is required for this claim type.");
  else if (needsReceipt) add("RECEIPT", "PASS", "Receipt attached.");
  else add("RECEIPT", "PASS", "Receipt is optional.");

  if (input.claimType.requires_travel_fields) {
    const days = input.claim.travel_days ?? 0;
    if (input.policy?.max_days != null && days > input.policy.max_days) {
      add("TRAVEL_DURATION", "FAIL", `Travel days exceed the policy maximum of ${input.policy.max_days}.`);
    } else add("TRAVEL_DURATION", "PASS", "Travel duration is within policy.");
    const rate = input.claim.rate_per_km ?? input.policy?.mileage_rate ?? 0;
    if (input.policy?.mileage_rate != null && input.claim.rate_per_km != null && input.claim.rate_per_km > input.policy.mileage_rate) {
      add("MILEAGE_RATE", "FAIL", `Rate per KM exceeds the policy rate of ${input.policy.mileage_rate}.`);
    } else add("MILEAGE_RATE", "PASS", "Mileage rate is within policy.");
    if (input.policy?.local_conveyance_limit != null) {
      const ta = roundMoney((input.claim.distance ?? 0) * rate);
      if (ta > input.policy.local_conveyance_limit) add("CONVEYANCE", "FAIL", "Local conveyance exceeds the policy limit.");
      else add("CONVEYANCE", "PASS", "Local conveyance is within the limit.");
    }
  }

  const blocking = checks.filter((item) => item.result === "FAIL");
  return { checks, blocking, ok: blocking.length === 0 };
}

export function payrollSource(category: ClaimType["category"]): "REIMBURSEMENT" | "TA" | "DA" | "BENEFIT" {
  if (category === "TA_DA" || category === "TRAVEL") return "TA";
  if (category === "FOOD") return "DA";
  return "REIMBURSEMENT";
}

export function editableStatuses() {
  return ["DRAFT", "SUBMITTED"] as const;
}
