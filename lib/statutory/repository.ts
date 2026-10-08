import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  EmployeeTaxDeclaration,
  EmployeeTaxDeclarationItem,
  EmployeeTaxProof,
  OrgStatutorySettings,
  PayrollStatutoryLine,
  PayrollStatutoryResult,
  StatutoryRuleVersion,
} from "@/types";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

function stamp() {
  return new Date().toISOString();
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

export async function listStatutoryRuleVersions(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore()
      .statutoryRuleVersions.filter((item) => item.organization_id === organizationId)
      .slice()
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("statutory_rule_versions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("effective_from", { ascending: false });
  return (data ?? []) as StatutoryRuleVersion[];
}

export async function getStatutoryRuleVersion(organizationId: string, id: string) {
  const rows = await listStatutoryRuleVersions(organizationId);
  return rows.find((item) => item.id === id) ?? null;
}

export async function insertStatutoryRuleVersion(row: StatutoryRuleVersion) {
  return insertRow("statutory_rule_versions", "statutoryRuleVersions", row);
}

export async function updateStatutoryRuleVersion(id: string, patch: Partial<StatutoryRuleVersion>) {
  return updateRow("statutory_rule_versions", "statutoryRuleVersions", id, patch);
}

export async function getOrgStatutorySettings(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore().orgStatutorySettings.find((item) => item.organization_id === organizationId) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("org_statutory_settings").select("*").eq("organization_id", organizationId).maybeSingle();
  return (data as OrgStatutorySettings | null) ?? null;
}

export async function upsertOrgStatutorySettings(row: OrgStatutorySettings) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const found = store.orgStatutorySettings.find((item) => item.organization_id === row.organization_id);
    if (found) {
      Object.assign(found, row, { updated_at: stamp() });
      return found;
    }
    store.orgStatutorySettings.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("org_statutory_settings").upsert(row).select("*").single();
  if (error) throw error;
  return data as OrgStatutorySettings;
}

export async function listTaxDeclarations(organizationId: string, employeeId?: string) {
  if (demoEnabled()) {
    return getDemoStore().employeeTaxDeclarations.filter(
      (item) => item.organization_id === organizationId && (!employeeId || item.employee_id === employeeId)
    );
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("employee_tax_declarations").select("*").eq("organization_id", organizationId);
  if (employeeId) query = query.eq("employee_id", employeeId);
  const { data } = await query.order("tax_year", { ascending: false });
  return (data ?? []) as EmployeeTaxDeclaration[];
}

export async function getTaxDeclaration(organizationId: string, id: string) {
  const rows = await listTaxDeclarations(organizationId);
  return rows.find((item) => item.id === id) ?? null;
}

export async function insertTaxDeclaration(row: EmployeeTaxDeclaration) {
  return insertRow("employee_tax_declarations", "employeeTaxDeclarations", row);
}

export async function updateTaxDeclaration(id: string, patch: Partial<EmployeeTaxDeclaration>) {
  return updateRow("employee_tax_declarations", "employeeTaxDeclarations", id, patch);
}

export async function listTaxDeclarationItems(organizationId: string, declarationId?: string) {
  if (demoEnabled()) {
    return getDemoStore().employeeTaxDeclarationItems.filter(
      (item) => item.organization_id === organizationId && (!declarationId || item.declaration_id === declarationId)
    );
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("employee_tax_declaration_items").select("*").eq("organization_id", organizationId);
  if (declarationId) query = query.eq("declaration_id", declarationId);
  const { data } = await query;
  return (data ?? []) as EmployeeTaxDeclarationItem[];
}

export async function insertTaxDeclarationItem(row: EmployeeTaxDeclarationItem) {
  return insertRow("employee_tax_declaration_items", "employeeTaxDeclarationItems", row);
}

export async function updateTaxDeclarationItem(id: string, patch: Partial<EmployeeTaxDeclarationItem>) {
  return updateRow("employee_tax_declaration_items", "employeeTaxDeclarationItems", id, patch);
}

export async function listTaxProofs(organizationId: string, declarationId?: string) {
  if (demoEnabled()) {
    return getDemoStore().employeeTaxProofs.filter(
      (item) => item.organization_id === organizationId && (!declarationId || item.declaration_id === declarationId)
    );
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("employee_tax_proofs").select("*").eq("organization_id", organizationId);
  if (declarationId) query = query.eq("declaration_id", declarationId);
  const { data } = await query.order("created_at", { ascending: false });
  return (data ?? []) as EmployeeTaxProof[];
}

export async function insertTaxProof(row: EmployeeTaxProof) {
  return insertRow("employee_tax_proofs", "employeeTaxProofs", row);
}

export async function updateTaxProof(id: string, patch: Partial<EmployeeTaxProof>) {
  return updateRow("employee_tax_proofs", "employeeTaxProofs", id, patch);
}

export async function listPayrollStatutoryResults(organizationId: string, runId?: string) {
  if (demoEnabled()) {
    return getDemoStore().payrollStatutoryResults.filter(
      (item) => item.organization_id === organizationId && (!runId || item.run_id === runId)
    );
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("payroll_statutory_results").select("*").eq("organization_id", organizationId);
  if (runId) query = query.eq("run_id", runId);
  const { data } = await query;
  return (data ?? []) as PayrollStatutoryResult[];
}

export async function listPayrollStatutoryLines(organizationId: string, runId?: string) {
  if (demoEnabled()) {
    return getDemoStore()
      .payrollStatutoryLines.filter(
        (item) => item.organization_id === organizationId && (!runId || item.run_id === runId)
      )
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("payroll_statutory_lines").select("*").eq("organization_id", organizationId);
  if (runId) query = query.eq("run_id", runId);
  const { data } = await query;
  return ((data ?? []) as PayrollStatutoryLine[]).sort((a, b) => a.sort_order - b.sort_order);
}

export async function replacePayrollStatutoryResults(
  organizationId: string,
  runId: string,
  results: PayrollStatutoryResult[],
  lines: PayrollStatutoryLine[]
) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.payrollStatutoryResults = store.payrollStatutoryResults.filter((item) => item.run_id !== runId);
    store.payrollStatutoryLines = store.payrollStatutoryLines.filter((item) => item.run_id !== runId);
    store.payrollStatutoryResults.unshift(...results);
    store.payrollStatutoryLines.unshift(...lines);
    return { results, lines };
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("payroll_statutory_lines").delete().eq("run_id", runId).eq("organization_id", organizationId);
  await admin.from("payroll_statutory_results").delete().eq("run_id", runId).eq("organization_id", organizationId);
  if (results.length) {
    const { error } = await admin.from("payroll_statutory_results").insert(results);
    if (error) throw error;
  }
  if (lines.length) {
    const { error } = await admin.from("payroll_statutory_lines").insert(lines);
    if (error) throw error;
  }
  return { results, lines };
}
