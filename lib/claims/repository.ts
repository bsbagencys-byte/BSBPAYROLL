import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BenefitPolicy,
  BenefitType,
  Claim,
  ClaimApproval,
  ClaimAttachment,
  ClaimItem,
  ClaimPolicy,
  ClaimPolicyCheck,
  ClaimType,
  EmployeeBenefit,
} from "@/types";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

function stamp() {
  return new Date().toISOString();
}

export { demoEnabled };

async function listRows<T>(table: string, organizationId: string, order?: string) {
  if (demoEnabled()) {
    const store = getDemoStore() as unknown as Record<string, T[]>;
    return (store[table] ?? []).filter((item) => (item as { organization_id: string }).organization_id === organizationId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from(table).select("*").eq("organization_id", organizationId);
  if (order) query = query.order(order);
  const { data } = await query;
  return (data ?? []) as T[];
}

async function insertRow<T extends { id: string }>(table: string, collection: keyof ReturnType<typeof getDemoStore>, row: T) {
  if (demoEnabled()) {
    (getDemoStore()[collection] as unknown as T[]).unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from(table).insert(row).select("*").single();
  if (error) throw error;
  return data as T;
}

async function updateRow<T extends { id: string }>(
  table: string,
  collection: keyof ReturnType<typeof getDemoStore>,
  id: string,
  patch: Partial<T>
) {
  if (demoEnabled()) {
    const row = (getDemoStore()[collection] as unknown as T[]).find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, "updated_at" in row ? { updated_at: stamp() } : {});
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from(table).update({ ...patch, updated_at: stamp() }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data as T | null;
}

export async function listBenefitTypes(organizationId: string) {
  if (demoEnabled()) return getDemoStore().benefitTypes.filter((item) => item.organization_id === organizationId);
  return listRows<BenefitType>("benefit_types", organizationId, "name");
}
export async function insertBenefitType(row: BenefitType) {
  return insertRow("benefit_types", "benefitTypes", row);
}
export async function updateBenefitType(id: string, patch: Partial<BenefitType>) {
  return updateRow("benefit_types", "benefitTypes", id, patch);
}

export async function listBenefitPolicies(organizationId: string) {
  if (demoEnabled()) return getDemoStore().benefitPolicies.filter((item) => item.organization_id === organizationId);
  return listRows<BenefitPolicy>("benefit_policies", organizationId, "name");
}
export async function insertBenefitPolicy(row: BenefitPolicy) {
  return insertRow("benefit_policies", "benefitPolicies", row);
}
export async function updateBenefitPolicy(id: string, patch: Partial<BenefitPolicy>) {
  return updateRow("benefit_policies", "benefitPolicies", id, patch);
}

export async function listEmployeeBenefits(organizationId: string) {
  if (demoEnabled()) return getDemoStore().employeeBenefits.filter((item) => item.organization_id === organizationId);
  return listRows<EmployeeBenefit>("employee_benefits", organizationId);
}
export async function insertEmployeeBenefit(row: EmployeeBenefit) {
  return insertRow("employee_benefits", "employeeBenefits", row);
}
export async function updateEmployeeBenefit(id: string, patch: Partial<EmployeeBenefit>) {
  return updateRow("employee_benefits", "employeeBenefits", id, patch);
}

export async function listClaimTypes(organizationId: string) {
  if (demoEnabled()) return getDemoStore().claimTypes.filter((item) => item.organization_id === organizationId);
  return listRows<ClaimType>("claim_types", organizationId, "name");
}
export async function insertClaimType(row: ClaimType) {
  return insertRow("claim_types", "claimTypes", row);
}
export async function updateClaimType(id: string, patch: Partial<ClaimType>) {
  return updateRow("claim_types", "claimTypes", id, patch);
}

export async function listClaimPolicies(organizationId: string) {
  if (demoEnabled()) return getDemoStore().claimPolicies.filter((item) => item.organization_id === organizationId);
  return listRows<ClaimPolicy>("claim_policies", organizationId, "name");
}
export async function insertClaimPolicy(row: ClaimPolicy) {
  return insertRow("claim_policies", "claimPolicies", row);
}
export async function updateClaimPolicy(id: string, patch: Partial<ClaimPolicy>) {
  return updateRow("claim_policies", "claimPolicies", id, patch);
}

export async function listClaims(organizationId: string) {
  if (demoEnabled()) return getDemoStore().claims.filter((item) => item.organization_id === organizationId);
  return listRows<Claim>("claims", organizationId);
}
export async function getClaim(organizationId: string, id: string) {
  const rows = await listClaims(organizationId);
  return rows.find((item) => item.id === id) ?? null;
}
export async function insertClaim(row: Claim) {
  return insertRow("claims", "claims", row);
}
export async function updateClaim(id: string, patch: Partial<Claim>) {
  return updateRow("claims", "claims", id, patch);
}

export async function listClaimItems(organizationId: string, claimId?: string) {
  if (demoEnabled()) {
    return getDemoStore().claimItems.filter(
      (item) => item.organization_id === organizationId && (!claimId || item.claim_id === claimId)
    );
  }
  const rows = await listRows<ClaimItem>("claim_items", organizationId);
  return claimId ? rows.filter((item) => item.claim_id === claimId) : rows;
}
export async function insertClaimItem(row: ClaimItem) {
  return insertRow("claim_items", "claimItems", row);
}

export async function listClaimApprovals(organizationId: string, claimId?: string) {
  if (demoEnabled()) {
    return getDemoStore().claimApprovals.filter(
      (item) => item.organization_id === organizationId && (!claimId || item.claim_id === claimId)
    );
  }
  const rows = await listRows<ClaimApproval>("claim_approvals", organizationId);
  return claimId ? rows.filter((item) => item.claim_id === claimId) : rows;
}
export async function insertClaimApproval(row: ClaimApproval) {
  return insertRow("claim_approvals", "claimApprovals", row);
}

export async function listClaimChecks(organizationId: string, claimId?: string) {
  if (demoEnabled()) {
    return getDemoStore().claimPolicyChecks.filter(
      (item) => item.organization_id === organizationId && (!claimId || item.claim_id === claimId)
    );
  }
  const rows = await listRows<ClaimPolicyCheck>("claim_policy_checks", organizationId);
  return claimId ? rows.filter((item) => item.claim_id === claimId) : rows;
}
export async function replaceClaimChecks(organizationId: string, claimId: string, rows: ClaimPolicyCheck[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.claimPolicyChecks = store.claimPolicyChecks.filter((item) => item.claim_id !== claimId);
    store.claimPolicyChecks.unshift(...rows);
    return rows;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("claim_policy_checks").delete().eq("claim_id", claimId).eq("organization_id", organizationId);
  if (!rows.length) return rows;
  const { error } = await admin.from("claim_policy_checks").insert(rows);
  if (error) throw error;
  return rows;
}

export async function listClaimAttachments(organizationId: string, claimId?: string) {
  if (demoEnabled()) {
    return getDemoStore().claimAttachments.filter(
      (item) => item.organization_id === organizationId && (!claimId || item.claim_id === claimId)
    );
  }
  const rows = await listRows<ClaimAttachment>("claim_attachments", organizationId);
  return claimId ? rows.filter((item) => item.claim_id === claimId) : rows;
}
export async function insertClaimAttachment(row: ClaimAttachment) {
  return insertRow("claim_attachments", "claimAttachments", row);
}
export async function getClaimAttachment(organizationId: string, id: string) {
  const rows = await listClaimAttachments(organizationId);
  return rows.find((item) => item.id === id) ?? null;
}
