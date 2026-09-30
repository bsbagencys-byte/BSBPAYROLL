import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  EmployeeSalaryAssignment,
  ReimbursementEntry,
  SalaryComponent,
  SalaryHistory,
  SalaryRevision,
  SalaryStructure,
  SalaryStructureItem,
  VariableEarning,
} from "@/types";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

function stamp() {
  return new Date().toISOString();
}

export { demoEnabled };

export async function listSalaryComponents(organizationId: string) {
  if (demoEnabled()) return getDemoStore().salaryComponents.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("salary_components").select("*").eq("organization_id", organizationId).order("sort_order");
  return (data ?? []) as SalaryComponent[];
}

export async function insertSalaryComponent(row: SalaryComponent) {
  if (demoEnabled()) {
    getDemoStore().salaryComponents.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("salary_components").insert(row).select("*").single();
  if (error) throw error;
  return data as SalaryComponent;
}

export async function updateSalaryComponent(id: string, patch: Partial<SalaryComponent>) {
  if (demoEnabled()) {
    const row = getDemoStore().salaryComponents.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("salary_components").update({ ...patch, updated_at: stamp() }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data as SalaryComponent | null;
}

export async function listSalaryStructures(organizationId: string) {
  if (demoEnabled()) return getDemoStore().salaryStructures.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("salary_structures").select("*").eq("organization_id", organizationId).order("name");
  return (data ?? []) as SalaryStructure[];
}

export async function insertSalaryStructure(row: SalaryStructure) {
  if (demoEnabled()) {
    getDemoStore().salaryStructures.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("salary_structures").insert(row).select("*").single();
  if (error) throw error;
  return data as SalaryStructure;
}

export async function updateSalaryStructure(id: string, patch: Partial<SalaryStructure>) {
  if (demoEnabled()) {
    const row = getDemoStore().salaryStructures.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("salary_structures").update({ ...patch, updated_at: stamp() }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data as SalaryStructure | null;
}

export async function listStructureItems(organizationId: string, structureId?: string) {
  if (demoEnabled()) {
    return getDemoStore().salaryStructureItems.filter(
      (item) => item.organization_id === organizationId && (!structureId || item.structure_id === structureId)
    );
  }
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin.from("salary_structure_items").select("*").eq("organization_id", organizationId);
  if (structureId) query = query.eq("structure_id", structureId);
  const { data } = await query.order("sort_order");
  return (data ?? []) as SalaryStructureItem[];
}

export async function replaceStructureItems(organizationId: string, structureId: string, rows: SalaryStructureItem[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.salaryStructureItems = store.salaryStructureItems.filter((item) => item.structure_id !== structureId);
    store.salaryStructureItems.unshift(...rows);
    return rows;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("salary_structure_items").delete().eq("structure_id", structureId).eq("organization_id", organizationId);
  if (!rows.length) return [];
  const { data, error } = await admin.from("salary_structure_items").insert(rows).select("*");
  if (error) throw error;
  return (data ?? []) as SalaryStructureItem[];
}

export async function listAssignments(organizationId: string) {
  if (demoEnabled()) return getDemoStore().employeeSalaryAssignments.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("employee_salary_assignments").select("*").eq("organization_id", organizationId).order("effective_from", { ascending: false });
  return (data ?? []) as EmployeeSalaryAssignment[];
}

export async function insertAssignment(row: EmployeeSalaryAssignment) {
  if (demoEnabled()) {
    getDemoStore().employeeSalaryAssignments.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("employee_salary_assignments").insert(row).select("*").single();
  if (error) throw error;
  return data as EmployeeSalaryAssignment;
}

export async function updateAssignment(id: string, patch: Partial<EmployeeSalaryAssignment>) {
  if (demoEnabled()) {
    const row = getDemoStore().employeeSalaryAssignments.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("employee_salary_assignments").update({ ...patch, updated_at: stamp() }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data as EmployeeSalaryAssignment | null;
}

export async function listRevisions(organizationId: string) {
  if (demoEnabled()) return getDemoStore().salaryRevisions.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("salary_revisions").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
  return (data ?? []) as SalaryRevision[];
}

export async function insertRevision(row: SalaryRevision) {
  if (demoEnabled()) {
    getDemoStore().salaryRevisions.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("salary_revisions").insert(row).select("*").single();
  if (error) throw error;
  return data as SalaryRevision;
}

export async function updateRevision(id: string, patch: Partial<SalaryRevision>) {
  if (demoEnabled()) {
    const row = getDemoStore().salaryRevisions.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("salary_revisions").update({ ...patch, updated_at: stamp() }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data as SalaryRevision | null;
}

export async function listSalaryHistory(organizationId: string) {
  if (demoEnabled()) return getDemoStore().salaryHistory.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("salary_history").select("*").eq("organization_id", organizationId).order("applied_at", { ascending: false });
  return (data ?? []) as SalaryHistory[];
}

export async function insertSalaryHistory(row: SalaryHistory) {
  if (demoEnabled()) {
    getDemoStore().salaryHistory.unshift(row);
    getDemoStore().salaryHistory = getDemoStore().salaryHistory.slice(0, 800);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("salary_history").insert(row).select("*").single();
  if (error) throw error;
  return data as SalaryHistory;
}

export async function listVariableEarnings(organizationId: string) {
  if (demoEnabled()) return getDemoStore().variableEarnings.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("variable_earnings").select("*").eq("organization_id", organizationId).order("period_from", { ascending: false });
  return (data ?? []) as VariableEarning[];
}

export async function insertVariableEarning(row: VariableEarning) {
  if (demoEnabled()) {
    getDemoStore().variableEarnings.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("variable_earnings").insert(row).select("*").single();
  if (error) throw error;
  return data as VariableEarning;
}

export async function updateVariableEarning(id: string, patch: Partial<VariableEarning>) {
  if (demoEnabled()) {
    const row = getDemoStore().variableEarnings.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("variable_earnings").update({ ...patch, updated_at: stamp() }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data as VariableEarning | null;
}

export async function listReimbursements(organizationId: string) {
  if (demoEnabled()) return getDemoStore().reimbursementEntries.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("reimbursement_entries").select("*").eq("organization_id", organizationId).order("entry_date", { ascending: false });
  return (data ?? []) as ReimbursementEntry[];
}

export async function insertReimbursement(row: ReimbursementEntry) {
  if (demoEnabled()) {
    getDemoStore().reimbursementEntries.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("reimbursement_entries").insert(row).select("*").single();
  if (error) throw error;
  return data as ReimbursementEntry;
}

export async function updateReimbursement(id: string, patch: Partial<ReimbursementEntry>) {
  if (demoEnabled()) {
    const row = getDemoStore().reimbursementEntries.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("reimbursement_entries").update({ ...patch, updated_at: stamp() }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data as ReimbursementEntry | null;
}
