import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { belongsToOrganization } from "@/lib/tenancy";
import type {
  DataExportJob,
  ImportJob,
  ImportJobRow,
  OffboardingRequest,
  OnboardingProgress,
  OnboardingStepRecord,
  OpeningBalance,
  SupportMessage,
  SupportTicket,
} from "@/types";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

function stamp() {
  return new Date().toISOString();
}

export async function getOnboardingProgress(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore().onboardingProgress.find((row) => row.organization_id === organizationId) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("onboarding_progress").select("*").eq("organization_id", organizationId).maybeSingle();
  return (data as OnboardingProgress | null) ?? null;
}

export async function upsertOnboardingProgress(row: OnboardingProgress) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const index = store.onboardingProgress.findIndex((item) => item.organization_id === row.organization_id);
    if (index >= 0) store.onboardingProgress[index] = row;
    else store.onboardingProgress.push(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("onboarding_progress").upsert(row).select("*").single();
  if (error) throw error;
  return data as OnboardingProgress;
}

export async function listOnboardingSteps(organizationId: string) {
  if (demoEnabled()) {
    return getDemoStore().onboardingSteps.filter((row) => row.organization_id === organizationId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("onboarding_steps").select("*").eq("organization_id", organizationId);
  return (data ?? []) as OnboardingStepRecord[];
}

export async function upsertOnboardingStep(row: OnboardingStepRecord) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const index = store.onboardingSteps.findIndex((item) => item.id === row.id || (item.organization_id === row.organization_id && item.step_key === row.step_key));
    if (index >= 0) store.onboardingSteps[index] = row;
    else store.onboardingSteps.push(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("onboarding_steps").upsert(row, { onConflict: "organization_id,step_key" }).select("*").single();
  if (error) throw error;
  return data as OnboardingStepRecord;
}

export async function listImportJobs(organizationId: string) {
  if (demoEnabled()) {
    return belongsToOrganization(organizationId, getDemoStore().importJobs).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("import_jobs").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
  return (data ?? []) as ImportJob[];
}

export async function getImportJob(organizationId: string, jobId: string) {
  const rows = await listImportJobs(organizationId);
  return rows.find((row) => row.id === jobId) ?? null;
}

export async function upsertImportJob(row: ImportJob) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const index = store.importJobs.findIndex((item) => item.id === row.id);
    if (index >= 0) store.importJobs[index] = row;
    else store.importJobs.push(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("import_jobs").upsert(row).select("*").single();
  if (error) throw error;
  return data as ImportJob;
}

export async function listImportJobRows(organizationId: string, jobId: string) {
  if (demoEnabled()) {
    return getDemoStore().importJobRows.filter((row) => row.organization_id === organizationId && row.job_id === jobId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("import_job_rows").select("*").eq("organization_id", organizationId).eq("job_id", jobId).order("row_number");
  return (data ?? []) as ImportJobRow[];
}

export async function replaceImportJobRows(jobId: string, rows: ImportJobRow[]) {
  if (demoEnabled()) {
    const store = getDemoStore();
    store.importJobRows = store.importJobRows.filter((row) => row.job_id !== jobId).concat(rows);
    return rows;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  await admin.from("import_job_rows").delete().eq("job_id", jobId);
  if (rows.length) {
    const { error } = await admin.from("import_job_rows").insert(rows);
    if (error) throw error;
  }
  return rows;
}

export async function insertOpeningBalance(row: OpeningBalance) {
  if (demoEnabled()) {
    getDemoStore().openingBalances.push(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("opening_balances").insert(row).select("*").single();
  if (error) throw error;
  return data as OpeningBalance;
}

export async function listOpeningBalances(organizationId: string) {
  if (demoEnabled()) return belongsToOrganization(organizationId, getDemoStore().openingBalances);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("opening_balances").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
  return (data ?? []) as OpeningBalance[];
}

export async function listSupportTickets(organizationId: string) {
  if (demoEnabled()) {
    return belongsToOrganization(organizationId, getDemoStore().supportTickets).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("support_tickets").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
  return (data ?? []) as SupportTicket[];
}

export async function listAllSupportTickets() {
  if (demoEnabled()) return getDemoStore().supportTickets.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("support_tickets").select("*").order("created_at", { ascending: false });
  return (data ?? []) as SupportTicket[];
}

export async function getSupportTicket(organizationId: string, ticketId: string) {
  const rows = await listSupportTickets(organizationId);
  return rows.find((row) => row.id === ticketId) ?? null;
}

export async function upsertSupportTicket(row: SupportTicket) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const index = store.supportTickets.findIndex((item) => item.id === row.id);
    if (index >= 0) store.supportTickets[index] = row;
    else store.supportTickets.push(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("support_tickets").upsert(row).select("*").single();
  if (error) throw error;
  return data as SupportTicket;
}

export async function listSupportMessages(organizationId: string, ticketId: string) {
  if (demoEnabled()) {
    return getDemoStore().supportMessages.filter((row) => row.organization_id === organizationId && row.ticket_id === ticketId);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("support_messages").select("*").eq("organization_id", organizationId).eq("ticket_id", ticketId).order("created_at");
  return (data ?? []) as SupportMessage[];
}

export async function insertSupportMessage(row: SupportMessage) {
  if (demoEnabled()) {
    getDemoStore().supportMessages.push(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("support_messages").insert(row).select("*").single();
  if (error) throw error;
  return data as SupportMessage;
}

export async function nextTicketSequence(organizationId: string) {
  const rows = await listSupportTickets(organizationId);
  return rows.length + 1;
}

export async function listDataExportJobs(organizationId: string) {
  if (demoEnabled()) {
    return belongsToOrganization(organizationId, getDemoStore().dataExportJobs).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("data_export_jobs").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
  return (data ?? []) as DataExportJob[];
}

export async function getDataExportJob(organizationId: string, jobId: string) {
  const rows = await listDataExportJobs(organizationId);
  return rows.find((row) => row.id === jobId) ?? null;
}

export async function upsertDataExportJob(row: DataExportJob) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const index = store.dataExportJobs.findIndex((item) => item.id === row.id);
    if (index >= 0) store.dataExportJobs[index] = row;
    else store.dataExportJobs.push(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("data_export_jobs").upsert(row).select("*").single();
  if (error) throw error;
  return data as DataExportJob;
}

export async function listOffboardingRequests(organizationId: string) {
  if (demoEnabled()) return belongsToOrganization(organizationId, getDemoStore().offboardingRequests);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("offboarding_requests").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
  return (data ?? []) as OffboardingRequest[];
}

export async function upsertOffboardingRequest(row: OffboardingRequest) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const index = store.offboardingRequests.findIndex((item) => item.id === row.id);
    if (index >= 0) store.offboardingRequests[index] = row;
    else store.offboardingRequests.push(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("offboarding_requests").upsert(row).select("*").single();
  if (error) throw error;
  return data as OffboardingRequest;
}

export async function listReadyExpiredExports(nowIso: string) {
  if (demoEnabled()) {
    return getDemoStore().dataExportJobs.filter((row) => row.status === "READY" && row.expires_at && row.expires_at < nowIso);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("data_export_jobs").select("*").eq("status", "READY").lt("expires_at", nowIso);
  return (data ?? []) as DataExportJob[];
}

export async function listOpenSupportTickets() {
  if (demoEnabled()) {
    return getDemoStore().supportTickets.filter((row) => row.status !== "RESOLVED" && row.status !== "CLOSED");
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("support_tickets").select("*").in("status", ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"]);
  return (data ?? []) as SupportTicket[];
}

export { stamp };
