import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CompOffEarning,
  EmployeeEmployment,
  Holiday,
  LeaveApproval,
  LeaveBalance,
  LeaveBalanceTransaction,
  LeavePolicy,
  LeavePolicyAssignment,
  LeaveRequest,
  LeaveRequestDay,
  LeaveType,
} from "@/types";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

function stamp() {
  return new Date().toISOString();
}

export { demoEnabled };

export async function listLeaveTypes(organizationId: string) {
  if (demoEnabled()) return getDemoStore().leaveTypes.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("leave_types").select("*").eq("organization_id", organizationId).order("name");
  return (data ?? []) as LeaveType[];
}

export async function insertLeaveType(row: LeaveType) {
  if (demoEnabled()) {
    getDemoStore().leaveTypes.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("leave_types").insert(row).select("*").single();
  if (error) throw error;
  return data as LeaveType;
}

export async function updateLeaveType(id: string, patch: Partial<LeaveType>) {
  if (demoEnabled()) {
    const row = getDemoStore().leaveTypes.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("leave_types").update({ ...patch, updated_at: stamp() }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data as LeaveType | null;
}

export async function listPolicies(organizationId: string) {
  if (demoEnabled()) return getDemoStore().leavePolicies.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("leave_policies").select("*").eq("organization_id", organizationId).order("name");
  return (data ?? []) as LeavePolicy[];
}

export async function listPolicyAssignments(organizationId: string) {
  if (demoEnabled()) return getDemoStore().leavePolicyAssignments.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("leave_policy_assignments").select("*").eq("organization_id", organizationId);
  return (data ?? []) as LeavePolicyAssignment[];
}

export async function insertPolicy(policy: LeavePolicy, assignment: LeavePolicyAssignment) {
  if (demoEnabled()) {
    getDemoStore().leavePolicies.unshift(policy);
    getDemoStore().leavePolicyAssignments.unshift(assignment);
    return policy;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("leave_policies").insert(policy).select("*").single();
  if (error) throw error;
  await admin.from("leave_policy_assignments").insert(assignment);
  return data as LeavePolicy;
}

export async function updatePolicy(id: string, patch: Partial<LeavePolicy>) {
  if (demoEnabled()) {
    const row = getDemoStore().leavePolicies.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("leave_policies").update({ ...patch, updated_at: stamp() }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data as LeavePolicy | null;
}

export async function listHolidays(organizationId: string) {
  if (demoEnabled()) return getDemoStore().holidays.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("holidays").select("*").eq("organization_id", organizationId).order("holiday_date");
  return (data ?? []) as Holiday[];
}

export async function insertHoliday(row: Holiday) {
  if (demoEnabled()) {
    getDemoStore().holidays.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("holidays").insert(row).select("*").single();
  if (error) throw error;
  return data as Holiday;
}

export async function updateHoliday(id: string, patch: Partial<Holiday>) {
  if (demoEnabled()) {
    const row = getDemoStore().holidays.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("holidays").update({ ...patch, updated_at: stamp() }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data as Holiday | null;
}

export async function listBalances(organizationId: string) {
  if (demoEnabled()) return getDemoStore().leaveBalances.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("leave_balances").select("*").eq("organization_id", organizationId);
  return (data ?? []) as LeaveBalance[];
}

export async function upsertBalance(row: LeaveBalance) {
  if (demoEnabled()) {
    const store = getDemoStore();
    const existing = store.leaveBalances.find(
      (item) =>
        item.employee_id === row.employee_id && item.leave_type_id === row.leave_type_id && item.year === row.year
    );
    if (existing) {
      Object.assign(existing, row, { updated_at: stamp() });
      return existing;
    }
    store.leaveBalances.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin
    .from("leave_balances")
    .upsert(row, { onConflict: "organization_id,employee_id,leave_type_id,year" })
    .select("*")
    .single();
  if (error) throw error;
  return data as LeaveBalance;
}

export async function insertLedger(row: LeaveBalanceTransaction) {
  if (demoEnabled()) {
    getDemoStore().leaveBalanceTransactions.unshift(row);
    getDemoStore().leaveBalanceTransactions = getDemoStore().leaveBalanceTransactions.slice(0, 800);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("leave_balance_transactions").insert(row).select("*").single();
  if (error) throw error;
  return data as LeaveBalanceTransaction;
}

export async function listLedger(organizationId: string) {
  if (demoEnabled()) return getDemoStore().leaveBalanceTransactions.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("leave_balance_transactions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(400);
  return (data ?? []) as LeaveBalanceTransaction[];
}

export async function listRequests(organizationId: string) {
  if (demoEnabled()) return getDemoStore().leaveRequests.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("leave_requests").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
  return (data ?? []) as LeaveRequest[];
}

export async function getRequest(organizationId: string, id: string) {
  const rows = await listRequests(organizationId);
  return rows.find((item) => item.id === id) ?? null;
}

export async function insertRequest(row: LeaveRequest, days: LeaveRequestDay[], approval: LeaveApproval) {
  if (demoEnabled()) {
    getDemoStore().leaveRequests.unshift(row);
    getDemoStore().leaveRequestDays.unshift(...days);
    getDemoStore().leaveApprovals.unshift(approval);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("leave_requests").insert(row).select("*").single();
  if (error) throw error;
  if (days.length) await admin.from("leave_request_days").insert(days);
  await admin.from("leave_approvals").insert(approval);
  return data as LeaveRequest;
}

export async function updateRequest(id: string, patch: Partial<LeaveRequest>) {
  if (demoEnabled()) {
    const row = getDemoStore().leaveRequests.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("leave_requests").update({ ...patch, updated_at: stamp() }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data as LeaveRequest | null;
}

export async function listRequestDays(organizationId: string) {
  if (demoEnabled()) return getDemoStore().leaveRequestDays.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("leave_request_days").select("*").eq("organization_id", organizationId);
  return (data ?? []) as LeaveRequestDay[];
}

export async function insertApproval(row: LeaveApproval) {
  if (demoEnabled()) {
    getDemoStore().leaveApprovals.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("leave_approvals").insert(row).select("*").single();
  if (error) throw error;
  return data as LeaveApproval;
}

export async function listApprovals(organizationId: string) {
  if (demoEnabled()) return getDemoStore().leaveApprovals.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("leave_approvals").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
  return (data ?? []) as LeaveApproval[];
}

export async function listEmployment(organizationId: string) {
  if (demoEnabled()) return getDemoStore().employeeEmployment.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("employee_employment").select("*").eq("organization_id", organizationId);
  return (data ?? []) as EmployeeEmployment[];
}

export async function listCompOff(organizationId: string) {
  if (demoEnabled()) return getDemoStore().compOffEarnings.filter((item) => item.organization_id === organizationId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("comp_off_earnings").select("*").eq("organization_id", organizationId).order("work_date", { ascending: false });
  return (data ?? []) as CompOffEarning[];
}

export async function insertCompOff(row: CompOffEarning) {
  if (demoEnabled()) {
    getDemoStore().compOffEarnings.unshift(row);
    return row;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data, error } = await admin.from("comp_off_earnings").insert(row).select("*").single();
  if (error) throw error;
  return data as CompOffEarning;
}

export async function updateCompOff(id: string, patch: Partial<CompOffEarning>) {
  if (demoEnabled()) {
    const row = getDemoStore().compOffEarnings.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: stamp() });
    return row;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("comp_off_earnings").update({ ...patch, updated_at: stamp() }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data as CompOffEarning | null;
}
