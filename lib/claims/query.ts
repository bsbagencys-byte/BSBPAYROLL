import { loadOrgCatalog } from "@/lib/org-data";
import { listEmployment } from "@/lib/leave/repository";
import { todayInZone } from "@/lib/leave/dates";
import { lookupName } from "@/lib/utils";
import {
  listBenefitPolicies,
  listBenefitTypes,
  listClaimApprovals,
  listClaimAttachments,
  listClaimItems,
  listClaimPolicies,
  listClaimTypes,
  listClaims,
  listEmployeeBenefits,
} from "@/lib/claims/repository";
import type {
  BenefitPolicy,
  BenefitType,
  Claim,
  ClaimListItem,
  ClaimPolicy,
  ClaimType,
  EmployeeBenefit,
  EmployeeEmployment,
} from "@/types";

export async function loadBenefitsCatalog(organizationId: string) {
  const [types, policies, assignments, catalog, employment] = await Promise.all([
    listBenefitTypes(organizationId),
    listBenefitPolicies(organizationId),
    listEmployeeBenefits(organizationId),
    loadOrgCatalog(organizationId),
    listEmployment(organizationId),
  ]);
  return { types, policies, assignments, employment, ...catalog };
}

export function toBenefitAssignmentRows(input: {
  assignments: EmployeeBenefit[];
  types: BenefitType[];
  employees: { id: string; display_name: string; employee_code: string }[];
  departments: { id: string; name: string }[];
  employment: EmployeeEmployment[];
}) {
  return input.assignments.map((assignment) => {
    const employee = input.employees.find((item) => item.id === assignment.employee_id) ?? null;
    const type = input.types.find((item) => item.id === assignment.benefit_type_id) ?? null;
    const job = input.employment.find((item) => item.employee_id === assignment.employee_id) ?? null;
    return {
      ...assignment,
      employeeName: employee?.display_name ?? "Unknown",
      employeeCode: employee?.employee_code ?? "—",
      benefitName: type?.name ?? "Unknown",
      benefitCode: type?.code ?? "—",
      category: type?.category ?? null,
      departmentName: lookupName(input.departments, job?.department_id),
    };
  });
}

export async function loadBenefitOverview(organizationId: string) {
  const catalog = await loadBenefitsCatalog(organizationId);
  const activeTypes = catalog.types.filter((item) => item.status === "ACTIVE");
  const activeAssignments = catalog.assignments.filter((item) => item.status === "ACTIVE");
  return {
    ...catalog,
    activeTypes,
    activeAssignments,
    assignmentsWithoutPolicy: activeAssignments.filter(
      (item) => !catalog.policies.some((policy) => policy.benefit_type_id === item.benefit_type_id && policy.status === "ACTIVE")
    ),
  };
}

export async function loadClaimsCatalog(organizationId: string) {
  const [types, policies, claims, catalog, employment] = await Promise.all([
    listClaimTypes(organizationId),
    listClaimPolicies(organizationId),
    listClaims(organizationId),
    loadOrgCatalog(organizationId),
    listEmployment(organizationId),
  ]);
  return { types, policies, claims, employment, ...catalog };
}

export function toClaimListItem(
  claim: Claim,
  context: {
    claimTypes: ClaimType[];
    policies: ClaimPolicy[];
    employees: { id: string; display_name: string; employee_code: string }[];
    departments: { id: string; name: string }[];
    branches: { id: string; name: string }[];
    employment: EmployeeEmployment[];
    receiptCount: number;
  }
): ClaimListItem {
  const employee = context.employees.find((item) => item.id === claim.employee_id) ?? null;
  const type = context.claimTypes.find((item) => item.id === claim.claim_type_id) ?? null;
  const policy = context.policies.find((item) => item.id === claim.policy_id) ?? null;
  const job = context.employment.find((item) => item.employee_id === claim.employee_id) ?? null;
  return {
    claim,
    employeeName: employee?.display_name ?? "Unknown",
    employeeCode: employee?.employee_code ?? "—",
    departmentName: lookupName(context.departments, job?.department_id),
    branchName: lookupName(context.branches, job?.branch_id),
    claimTypeName: type?.name ?? "Unknown",
    claimTypeCode: type?.code ?? "—",
    category: type?.category ?? "OTHER",
    policyName: policy?.name ?? null,
    policyLimit: policy?.max_amount ?? type?.max_amount ?? null,
    receiptCount: context.receiptCount,
  };
}

export async function loadClaimListItems(organizationId: string): Promise<ClaimListItem[]> {
  const [catalog, attachments] = await Promise.all([
    loadClaimsCatalog(organizationId),
    listClaimAttachments(organizationId),
  ]);
  return catalog.claims
    .slice()
    .sort((a, b) => (a.claim_date < b.claim_date ? 1 : -1))
    .map((claim) =>
      toClaimListItem(claim, {
        claimTypes: catalog.types,
        policies: catalog.policies,
        employees: catalog.employees,
        departments: catalog.departments,
        branches: catalog.branches,
        employment: catalog.employment,
        receiptCount: attachments.filter((item) => item.claim_id === claim.id).length,
      })
    );
}

export async function loadClaimsOverview(organizationId: string, timezone: string) {
  const today = todayInZone(timezone);
  const [items, catalog] = await Promise.all([loadClaimListItems(organizationId), loadClaimsCatalog(organizationId)]);
  const pending = items.filter((item) => item.claim.status === "SUBMITTED" || item.claim.status === "PENDING_APPROVAL");
  const approved = items.filter((item) => item.claim.status === "APPROVED");
  const drafts = items.filter((item) => item.claim.status === "DRAFT");
  const month = today.slice(0, 7);
  const approvedThisMonth = approved.filter((item) => (item.claim.claim_date ?? "").startsWith(month));
  return {
    today,
    items,
    recent: items.slice(0, 8),
    pending,
    approved,
    drafts,
    pendingAmount: pending.reduce((sum, item) => sum + item.claim.submitted_amount, 0),
    approvedAmount: approvedThisMonth.reduce((sum, item) => sum + (item.claim.approved_amount ?? item.claim.submitted_amount), 0),
    types: catalog.types,
    policies: catalog.policies,
    employees: catalog.employees,
  };
}

export async function loadClaimDetail(organizationId: string, claimId: string) {
  const [items, catalog, attachments, approvals, claimItems] = await Promise.all([
    loadClaimListItems(organizationId),
    loadClaimsCatalog(organizationId),
    listClaimAttachments(organizationId, claimId),
    listClaimApprovals(organizationId, claimId),
    listClaimItems(organizationId, claimId),
  ]);
  const row = items.find((item) => item.claim.id === claimId) ?? null;
  const policy = row ? catalog.policies.find((item) => item.id === row.claim.policy_id) ?? null : null;
  const type = row ? catalog.types.find((item) => item.id === row.claim.claim_type_id) ?? null : null;
  return { row, policy, type, attachments, approvals, items: claimItems };
}

export type BenefitOverview = Awaited<ReturnType<typeof loadBenefitOverview>>;
export type ClaimsOverview = Awaited<ReturnType<typeof loadClaimsOverview>>;
export type ClaimDetail = Awaited<ReturnType<typeof loadClaimDetail>>;
export type { BenefitPolicy, BenefitType, ClaimListItem, ClaimPolicy, ClaimType, EmployeeBenefit };
