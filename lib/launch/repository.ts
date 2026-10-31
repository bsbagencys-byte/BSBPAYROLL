import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BiometricVerificationRecord,
  IncidentRecord,
  LaunchDecisionRecord,
  ModuleReadiness,
  ParallelPayrollRun,
  PilotChecklistItem,
  PilotFeedback,
  PilotOrganization,
  ReleaseBlocker,
  ReleaseGateRecord,
  UatChecklistItem,
} from "@/types";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

export function stamp() {
  return new Date().toISOString();
}

async function listTable<T>(table: string): Promise<T[]> {
  if (demoEnabled()) return [];
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from(table).select("*").order("created_at", { ascending: false });
  return (data ?? []) as T[];
}

async function upsertTable<T extends { id: string }>(table: string, row: T): Promise<T> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from(table).upsert(row).select("*").single();
  if (error) throw error;
  return data as T;
}

function upsertLocal<T extends { id: string }>(rows: T[], row: T) {
  const index = rows.findIndex((item) => item.id === row.id);
  if (index >= 0) rows[index] = row;
  else rows.push(row);
  return row;
}

export async function listModuleReadiness() {
  if (demoEnabled()) {
    return [...getDemoStore().moduleReadiness].sort((a, b) => a.sort_order - b.sort_order);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("module_readiness").select("*").order("sort_order");
  return (data ?? []) as ModuleReadiness[];
}

export async function upsertModuleReadiness(row: ModuleReadiness) {
  if (demoEnabled()) return upsertLocal(getDemoStore().moduleReadiness, row);
  return upsertTable("module_readiness", row);
}

export async function listReleaseBlockers() {
  if (demoEnabled()) {
    return [...getDemoStore().releaseBlockers].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return listTable<ReleaseBlocker>("release_blockers");
}

export async function upsertReleaseBlocker(row: ReleaseBlocker) {
  if (demoEnabled()) return upsertLocal(getDemoStore().releaseBlockers, row);
  return upsertTable("release_blockers", row);
}

export async function listPilotOrganizations() {
  if (demoEnabled()) {
    return [...getDemoStore().pilotOrganizations].sort((a, b) => a.code.localeCompare(b.code));
  }
  return listTable<PilotOrganization>("pilot_organizations");
}

export async function getPilotOrganization(id: string) {
  const rows = await listPilotOrganizations();
  return rows.find((row) => row.id === id) ?? null;
}

export async function upsertPilotOrganization(row: PilotOrganization) {
  if (demoEnabled()) return upsertLocal(getDemoStore().pilotOrganizations, row);
  return upsertTable("pilot_organizations", row);
}

export async function listPilotChecklist(pilotId: string) {
  if (demoEnabled()) {
    return getDemoStore().pilotChecklistItems.filter((row) => row.pilot_id === pilotId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("pilot_checklist_items").select("*").eq("pilot_id", pilotId);
  return (data ?? []) as PilotChecklistItem[];
}

export async function upsertPilotChecklistItem(row: PilotChecklistItem) {
  if (demoEnabled()) return upsertLocal(getDemoStore().pilotChecklistItems, row);
  return upsertTable("pilot_checklist_items", row);
}

export async function listBiometricVerifications() {
  if (demoEnabled()) return [...getDemoStore().biometricVerifications];
  return listTable<BiometricVerificationRecord>("biometric_verifications");
}

export async function upsertBiometricVerification(row: BiometricVerificationRecord) {
  if (demoEnabled()) return upsertLocal(getDemoStore().biometricVerifications, row);
  return upsertTable("biometric_verifications", row);
}

export async function listParallelPayrollRuns() {
  if (demoEnabled()) return [...getDemoStore().parallelPayrollRuns];
  return listTable<ParallelPayrollRun>("parallel_payroll_runs");
}

export async function upsertParallelPayrollRun(row: ParallelPayrollRun) {
  if (demoEnabled()) return upsertLocal(getDemoStore().parallelPayrollRuns, row);
  return upsertTable("parallel_payroll_runs", row);
}

export async function listUatChecklist() {
  if (demoEnabled()) return [...getDemoStore().uatChecklistItems];
  return listTable<UatChecklistItem>("uat_checklist_items");
}

export async function listUatChecklistForPilot(pilotId: string) {
  const rows = await listUatChecklist();
  return rows.filter((row) => row.pilot_id === pilotId);
}

export async function upsertUatChecklistItem(row: UatChecklistItem) {
  if (demoEnabled()) return upsertLocal(getDemoStore().uatChecklistItems, row);
  return upsertTable("uat_checklist_items", row);
}

export async function listIncidents() {
  if (demoEnabled()) {
    return [...getDemoStore().incidentRecords].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return listTable<IncidentRecord>("incident_records");
}

export async function upsertIncident(row: IncidentRecord) {
  if (demoEnabled()) return upsertLocal(getDemoStore().incidentRecords, row);
  return upsertTable("incident_records", row);
}

export async function listPilotFeedback() {
  if (demoEnabled()) {
    return [...getDemoStore().pilotFeedback].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return listTable<PilotFeedback>("pilot_feedback");
}

export async function upsertPilotFeedback(row: PilotFeedback) {
  if (demoEnabled()) return upsertLocal(getDemoStore().pilotFeedback, row);
  return upsertTable("pilot_feedback", row);
}

export async function listReleaseGates() {
  if (demoEnabled()) return [...getDemoStore().releaseGates];
  return listTable<ReleaseGateRecord>("release_gates");
}

export async function upsertReleaseGate(row: ReleaseGateRecord) {
  if (demoEnabled()) return upsertLocal(getDemoStore().releaseGates, row);
  return upsertTable("release_gates", row);
}

export async function listLaunchDecisions() {
  if (demoEnabled()) {
    return [...getDemoStore().launchDecisions].sort((a, b) => b.decided_at.localeCompare(a.decided_at));
  }
  return listTable<LaunchDecisionRecord>("launch_decisions");
}

export async function insertLaunchDecision(row: LaunchDecisionRecord) {
  if (demoEnabled()) {
    getDemoStore().launchDecisions.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("launch_decisions").insert(row).select("*").single();
  if (error) throw error;
  return data as LaunchDecisionRecord;
}

export async function nextIncidentSequence() {
  const rows = await listIncidents();
  return rows.length + 1;
}
