import { addDays } from "@/lib/leave/dates";
import { listEmployment } from "@/lib/leave/repository";
import {
  asNumber,
  benefitForDate,
  calculateTravelAmounts,
  matchBenefitPolicy,
  matchTravelPolicy,
  overlappingBenefit,
  payrollSource,
  roundMoney,
  validateClaim,
} from "@/lib/claims/engine";
import {
  insertBenefitPolicy,
  insertBenefitType,
  insertClaim,
  insertClaimApproval,
  insertClaimAttachment,
  insertClaimItem,
  insertClaimPolicy,
  insertClaimType,
  insertEmployeeBenefit,
  listBenefitPolicies,
  listBenefitTypes,
  listClaimAttachments,
  listClaimPolicies,
  listClaimTypes,
  listClaims,
  listEmployeeBenefits,
  replaceClaimChecks,
  updateBenefitPolicy,
  updateBenefitType,
  updateClaim,
  updateClaimPolicy,
  updateClaimType,
  updateEmployeeBenefit,
} from "@/lib/claims/repository";
import type {
  BenefitPolicy,
  BenefitType,
  Claim,
  ClaimAttachment,
  ClaimItem,
  ClaimPolicy,
  ClaimType,
  EmployeeBenefit,
  EmployeeEmployment,
  PayrollClaimLine,
} from "@/types";

function stamp() {
  return new Date().toISOString();
}

export async function saveBenefitTypeRow(row: BenefitType, existing: BenefitType[]) {
  const code = row.code.toUpperCase();
  const duplicate = existing.find((item) => item.code.toUpperCase() === code && item.id !== row.id);
  if (duplicate) throw new Error("A benefit type with this code already exists.");
  const found = existing.find((item) => item.id === row.id);
  return found ? updateBenefitType(row.id, { ...row, code }) : insertBenefitType({ ...row, code });
}

export async function saveBenefitPolicyRow(row: BenefitPolicy) {
  const existing = await listBenefitPolicies(row.organization_id);
  const found = existing.find((item) => item.id === row.id);
  return found ? updateBenefitPolicy(row.id, row) : insertBenefitPolicy(row);
}

export async function assignEmployeeBenefit(input: {
  organizationId: string;
  employeeId: string;
  benefitTypeId: string;
  amount: number;
  calculationMethod: EmployeeBenefit["calculation_method"];
  percentage: number | null;
  effectiveFrom: string;
  notes: string | null;
  actorId: string | null;
}) {
  const existing = await listEmployeeBenefits(input.organizationId);
  const overlap = overlappingBenefit(existing, input.employeeId, input.benefitTypeId, input.effectiveFrom, null);
  if (overlap) {
    if (overlap.effective_from < input.effectiveFrom) {
      await updateEmployeeBenefit(overlap.id, { effective_to: addDays(input.effectiveFrom, -1), status: "CLOSED" });
    } else {
      throw new Error("This employee already has an active assignment for that benefit.");
    }
  }
  const row: EmployeeBenefit = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    employee_id: input.employeeId,
    benefit_type_id: input.benefitTypeId,
    amount: roundMoney(input.amount),
    calculation_method: input.calculationMethod,
    percentage: input.percentage,
    effective_from: input.effectiveFrom,
    effective_to: null,
    status: "ACTIVE",
    notes: input.notes,
    created_by: input.actorId,
    updated_by: input.actorId,
    created_at: stamp(),
    updated_at: stamp(),
  };
  await insertEmployeeBenefit(row);
  return row;
}

export async function closeEmployeeBenefit(organizationId: string, id: string, actorId: string | null) {
  const rows = await listEmployeeBenefits(organizationId);
  const found = rows.find((item) => item.id === id);
  if (!found) throw new Error("Benefit assignment not found.");
  return updateEmployeeBenefit(id, {
    status: "CLOSED",
    effective_to: found.effective_to ?? addDays(new Date().toISOString().slice(0, 10), -1),
    updated_by: actorId,
  });
}

export async function saveClaimTypeRow(row: ClaimType, existing: ClaimType[]) {
  const code = row.code.toUpperCase();
  const duplicate = existing.find((item) => item.code.toUpperCase() === code && item.id !== row.id);
  if (duplicate) throw new Error("A claim type with this code already exists.");
  const found = existing.find((item) => item.id === row.id);
  return found ? updateClaimType(row.id, { ...row, code }) : insertClaimType({ ...row, code });
}

export async function saveClaimPolicyRow(row: ClaimPolicy) {
  const existing = await listClaimPolicies(row.organization_id);
  const found = existing.find((item) => item.id === row.id);
  return found ? updateClaimPolicy(row.id, row) : insertClaimPolicy(row);
}

export type ClaimDraftInput = {
  id: string;
  organizationId: string;
  employeeId: string;
  claimTypeId: string;
  claimDate: string;
  periodFrom: string | null;
  periodTo: string | null;
  purpose: string | null;
  amount: number | null;
  notes: string | null;
  referenceNumber: string | null;
  overrideReason: string | null;
  distance: number | null;
  ratePerKm: number | null;
  travelMode: Claim["travel_mode"];
  travelDays: number | null;
  cityCategory: Claim["city_category"];
  travelType: Claim["travel_type"];
  includeInPayroll: boolean;
  items: Omit<ClaimItem, "id" | "organization_id" | "claim_id" | "created_at">[];
  actorId: string | null;
  submit: boolean;
};

export async function buildClaim(input: ClaimDraftInput) {
  const [claimTypes, claimPolicies, benefitTypes, benefitPolicies, assignments, employment, existingClaims] = await Promise.all([
    listClaimTypes(input.organizationId),
    listClaimPolicies(input.organizationId),
    listBenefitTypes(input.organizationId),
    listBenefitPolicies(input.organizationId),
    listEmployeeBenefits(input.organizationId),
    loadEmploymentRow(input.organizationId, input.employeeId),
    listClaims(input.organizationId),
  ]);

  const claimType = claimTypes.find((item) => item.id === input.claimTypeId);
  if (!claimType) throw new Error("Claim type not found.");

  const matchedPolicy = matchTravelPolicy(claimPolicies, input.claimTypeId, input.claimDate, {
    designationId: employment?.designation_id ?? null,
    cityCategory: input.cityCategory ?? null,
    travelType: input.travelType ?? null,
  });

  const legacyBenefit =
    benefitTypes.find((item) => item.code.toUpperCase() === claimType.code.toUpperCase()) ?? null;
  const benefitPolicy = legacyBenefit
    ? matchBenefitPolicy(benefitPolicies, legacyBenefit.id, input.claimDate, employment, input.employeeId)
    : null;
  const assignment = legacyBenefit ? benefitForDate(assignments, input.employeeId, legacyBenefit.id, input.claimDate) : null;

  const travel = calculateTravelAmounts({
    distance: input.distance,
    ratePerKm: input.ratePerKm,
    travelDays: input.travelDays,
    policy: matchedPolicy,
  });
  const itemsTotal = input.items.reduce((sum, item) => sum + asNumber(item.amount), 0);
  const submitted = input.amount != null && input.amount > 0 ? input.amount : roundMoney(itemsTotal || travel.total);
  if (submitted <= 0) throw new Error("Enter an amount or claim items.");

  const currentStep: Claim["current_step"] =
    (matchedPolicy?.workflow_mode ?? claimType.workflow_mode) === "TWO_STEP" ? "MANAGER" : "SINGLE";

  const row: Claim = {
    id: input.id,
    organization_id: input.organizationId,
    employee_id: input.employeeId,
    claim_type_id: input.claimTypeId,
    claim_date: input.claimDate,
    period_from: input.periodFrom,
    period_to: input.periodTo,
    purpose: input.purpose,
    submitted_amount: roundMoney(submitted),
    calculated_amount: travel.total || null,
    approved_amount: null,
    override_reason: input.overrideReason,
    notes: input.notes,
    reference_number: input.referenceNumber,
    status: input.submit ? "SUBMITTED" : "DRAFT",
    policy_id: matchedPolicy?.id ?? null,
    distance: input.distance,
    rate_per_km: input.ratePerKm ?? (matchedPolicy?.mileage_rate ?? null),
    travel_mode: input.travelMode,
    travel_days: input.travelDays,
    city_category: input.cityCategory,
    travel_type: input.travelType,
    include_in_payroll: input.includeInPayroll,
    payroll_period: null,
    paid_at: null,
    current_step: input.submit ? currentStep : null,
    submitted_at: input.submit ? stamp() : null,
    created_by: input.actorId,
    updated_by: input.actorId,
    created_at: stamp(),
    updated_at: stamp(),
  };

  return { row, claimType, policy: matchedPolicy, benefitPolicy, assignment, existingClaims, items: input.items };
}

export async function createClaim(input: ClaimDraftInput) {
  const built = await buildClaim(input);
  const prior = built.existingClaims.find((item) => item.id === built.row.id) ?? null;
  const attachments = await listClaimAttachments(input.organizationId, built.row.id);

  const { checks, ok } = validateClaim({
    claim: built.row,
    claimType: built.claimType,
    policy: built.policy,
    benefitPolicy: built.benefitPolicy,
    assignment: built.assignment,
    attachments,
    existing: built.existingClaims,
  });
  if (input.submit && !ok) {
    built.row.status = "DRAFT";
    built.row.current_step = null;
    built.row.submitted_at = null;
  }

  const saved = prior ? await updateClaim(built.row.id, built.row) : await insertClaim(built.row);
  await replaceClaimChecks(
    input.organizationId,
    built.row.id,
    checks.map((check) => ({
      ...check,
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      created_at: stamp(),
    }))
  );
  if (input.items.length) {
    const rows: ClaimItem[] = input.items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      claim_id: built.row.id,
      created_at: stamp(),
    }));
    await Promise.all(rows.map((row) => insertClaimItem(row)));
  }
  if (input.submit && !ok) {
    throw new Error("Claim saved as draft. Review the failed policy checks before submitting.");
  }
  return { claim: saved ?? built.row, checks };
}

export async function submitClaim(organizationId: string, claimId: string, actorId: string | null) {
  const [claims, claimTypes, policies, benefitPolicies, benefitTypes, assignments, attachments] = await Promise.all([
    listClaims(organizationId),
    listClaimTypes(organizationId),
    listClaimPolicies(organizationId),
    listBenefitPolicies(organizationId),
    listBenefitTypes(organizationId),
    listEmployeeBenefits(organizationId),
    listClaimAttachments(organizationId, claimId),
  ]);
  const claim = claims.find((item) => item.id === claimId);
  if (!claim) throw new Error("Claim not found.");
  if (claim.status !== "DRAFT") throw new Error("Only draft claims can be submitted.");
  const claimType = claimTypes.find((item) => item.id === claim.claim_type_id);
  if (!claimType) throw new Error("Claim type not found.");
  const policy = policies.find((item) => item.id === claim.policy_id) ?? null;
  const benefitType = benefitTypes.find((item) => item.code.toUpperCase() === claimType.code.toUpperCase()) ?? null;
  const benefitPolicy = benefitType
    ? matchBenefitPolicy(benefitPolicies, benefitType.id, claim.claim_date, null, claim.employee_id)
    : null;
  const assignment = benefitType
    ? benefitForDate(assignments, claim.employee_id, benefitType.id, claim.claim_date)
    : null;
  const { checks, ok } = validateClaim({ claim, claimType, policy, benefitPolicy, assignment, attachments, existing: claims });
  await replaceClaimChecks(
    organizationId,
    claimId,
    checks.map((check) => ({ ...check, id: crypto.randomUUID(), organization_id: organizationId, created_at: stamp() }))
  );
  if (!ok) throw new Error("Claim failed policy validation. Review the failed checks.");

  const step: Claim["current_step"] =
    (policy?.workflow_mode ?? claimType.workflow_mode) === "TWO_STEP" ? "MANAGER" : "SINGLE";
  return updateClaim(claimId, {
    status: "SUBMITTED",
    submitted_at: stamp(),
    current_step: step,
    updated_by: actorId,
  });
}

export async function decideClaim(input: {
  organizationId: string;
  claimId: string;
  decision: "APPROVED" | "REJECTED" | "REQUEST_CORRECTION";
  amount: number | null;
  reason: string | null;
  actorId: string | null;
}) {
  const claims = await listClaims(input.organizationId);
  const claim = claims.find((item) => item.id === input.claimId);
  if (!claim) throw new Error("Claim not found.");
  if (claim.status !== "SUBMITTED" && claim.status !== "PENDING_APPROVAL") {
    throw new Error("This claim is not awaiting a decision.");
  }
  const step = claim.current_step ?? "SINGLE";

  await insertClaimApproval({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    claim_id: claim.id,
    step,
    decision: input.decision,
    amount: input.amount,
    reason: input.reason,
    actor_id: input.actorId,
    decided_at: stamp(),
    created_at: stamp(),
  });

  if (input.decision === "REJECTED") {
    return updateClaim(claim.id, { status: "REJECTED", current_step: null, updated_by: input.actorId });
  }
  if (input.decision === "REQUEST_CORRECTION") {
    return updateClaim(claim.id, { status: "DRAFT", current_step: null, submitted_at: null, updated_by: input.actorId });
  }
  if (step === "MANAGER") {
    return updateClaim(claim.id, { status: "PENDING_APPROVAL", current_step: "FINANCE", updated_by: input.actorId });
  }
  return updateClaim(claim.id, {
    status: "APPROVED",
    current_step: null,
    approved_amount: roundMoney(input.amount ?? claim.submitted_amount),
    updated_by: input.actorId,
  });
}

export async function cancelClaim(organizationId: string, claimId: string, actorId: string | null) {
  const claims = await listClaims(organizationId);
  const claim = claims.find((item) => item.id === claimId);
  if (!claim) throw new Error("Claim not found.");
  if (claim.status === "APPROVED" || claim.status === "PAID" || claim.status === "INCLUDED_IN_PAYROLL") {
    throw new Error("Approved claims cannot be cancelled.");
  }
  return updateClaim(claimId, { status: "CANCELLED", current_step: null, updated_by: actorId });
}

export async function saveClaimAttachmentRow(row: ClaimAttachment) {
  return insertClaimAttachment(row);
}

async function loadEmploymentRow(organizationId: string, employeeId: string): Promise<EmployeeEmployment | null> {
  const rows = await listEmployment(organizationId);
  return rows.find((item) => item.employee_id === employeeId) ?? null;
}

export async function getApprovedPayrollClaimLines(organizationId: string, period: string): Promise<PayrollClaimLine[]> {
  const [claims, types] = await Promise.all([listClaims(organizationId), listClaimTypes(organizationId)]);
  return claims
    .filter(
      (item) =>
        item.status === "APPROVED" &&
        item.include_in_payroll &&
        (item.payroll_period === period || (!item.payroll_period && item.claim_date.startsWith(period.slice(0, 7))))
    )
    .map((item) => {
      const type = types.find((row) => row.id === item.claim_type_id);
      return {
        claimId: item.id,
        employeeId: item.employee_id,
        claimTypeId: item.claim_type_id,
        category: type?.category ?? "OTHER",
        source: payrollSource(type?.category ?? "OTHER"),
        amount: item.approved_amount ?? item.submitted_amount,
        includeInPayroll: item.include_in_payroll,
        payrollPeriod: item.payroll_period ?? period,
        status: item.status,
      };
    });
}

export { listBenefitTypes, listBenefitPolicies, listEmployeeBenefits, listClaimTypes, listClaimPolicies, listClaims };
