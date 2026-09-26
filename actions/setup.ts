"use server";

import { revalidatePath } from "next/cache";
import { companyStep1Schema, companyStep2Schema, companyStep3Schema } from "@/lib/validations/company";
import { getSessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";

function flattenErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  const fieldErrors = error.flatten().fieldErrors;
  const errors: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(fieldErrors)) {
    if (value?.length) errors[key] = value;
  }
  return errors;
}

async function requireSetupAccess() {
  const user = await getSessionUser();
  if (!user) return { user: null, error: { success: false, message: "Sign in required." } as ActionResult };
  if (!["SUPER_ADMIN", "ADMIN"].includes(user.roleCode) && !user.permissions.includes("settings.manage")) {
    return { user: null, error: { success: false, message: "You do not have permission to complete setup." } as ActionResult };
  }
  return { user, error: null };
}

export async function saveSetupStep1(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireSetupAccess();
  if (access.error || !access.user) return access.error!;

  const parsed = companyStep1Schema.safeParse({
    name: formData.get("name"),
    legalName: formData.get("legalName"),
    displayName: formData.get("displayName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") ?? "",
    city: formData.get("city"),
    state: formData.get("state"),
    pin: formData.get("pin"),
    pan: formData.get("pan"),
    tan: formData.get("tan") ?? "",
    gstin: formData.get("gstin") ?? "",
  });
  if (!parsed.success) {
    return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  }

  const payload = {
    name: parsed.data.name,
    legal_name: parsed.data.legalName,
    display_name: parsed.data.displayName,
    phone: parsed.data.phone,
    email: parsed.data.email,
    address_line1: parsed.data.addressLine1,
    address_line2: parsed.data.addressLine2 || null,
    city: parsed.data.city,
    state: parsed.data.state,
    pin: parsed.data.pin,
    pan: parsed.data.pan,
    tan: parsed.data.tan || null,
    gstin: parsed.data.gstin || null,
    setup_step: Math.max(access.user.organization.setup_step, 2),
  };

  if (!hasSupabaseConfig() || isDemoMode()) {
    const store = getDemoStore();
    Object.assign(store.org, payload, { updated_at: new Date().toISOString() });
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    const { error } = await admin.from("organizations").update(payload).eq("id", access.user.organization.id);
    if (error) return { success: false, message: error.message };
  }

  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "company_setting_change",
    entityType: "organizations",
    entityId: access.user.organization.id,
    metadata: { step: 1 },
  });
  revalidatePath("/setup");
  return { success: true, message: "Company profile saved." };
}

export async function saveSetupStep2(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireSetupAccess();
  if (access.error || !access.user) return access.error!;

  const parsed = companyStep2Schema.safeParse({
    branchName: formData.get("branchName"),
    departmentName: formData.get("departmentName"),
    designationName: formData.get("designationName"),
  });
  if (!parsed.success) {
    return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  }

  if (!hasSupabaseConfig() || isDemoMode()) {
    const store = getDemoStore();
    if (store.branches[0]) store.branches[0].name = parsed.data.branchName;
    else {
      store.branches.push({
        id: crypto.randomUUID(),
        organization_id: store.org.id,
        name: parsed.data.branchName,
        code: "HO",
        address: null,
        city: null,
        state: null,
        pin: null,
        phone: null,
        email: null,
        is_default: true,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    if (store.departments[0]) store.departments[0].name = parsed.data.departmentName;
    else {
      store.departments.push({
        id: crypto.randomUUID(),
        organization_id: store.org.id,
        name: parsed.data.departmentName,
        code: "OPS",
        manager_employee_id: null,
        is_default: true,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    if (store.designations[0]) store.designations[0].name = parsed.data.designationName;
    else {
      store.designations.push({
        id: crypto.randomUUID(),
        organization_id: store.org.id,
        name: parsed.data.designationName,
        code: "STF",
        department_id: store.departments[0]?.id ?? null,
        is_default: true,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    store.org.setup_step = Math.max(store.org.setup_step, 3);
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    const orgId = access.user.organization.id;
    const { data: branch } = await admin.from("branches").select("id").eq("organization_id", orgId).eq("is_default", true).maybeSingle();
    if (branch) {
      await admin.from("branches").update({ name: parsed.data.branchName }).eq("id", branch.id);
    } else {
      await admin.from("branches").insert({ organization_id: orgId, name: parsed.data.branchName, is_default: true, code: "HO" });
    }
    const { data: dept } = await admin.from("departments").select("id").eq("organization_id", orgId).eq("is_default", true).maybeSingle();
    if (dept) {
      await admin.from("departments").update({ name: parsed.data.departmentName }).eq("id", dept.id);
    } else {
      await admin.from("departments").insert({ organization_id: orgId, name: parsed.data.departmentName, is_default: true, code: "OPS" });
    }
    const { data: desig } = await admin.from("designations").select("id").eq("organization_id", orgId).eq("is_default", true).maybeSingle();
    if (desig) {
      await admin.from("designations").update({ name: parsed.data.designationName }).eq("id", desig.id);
    } else {
      await admin.from("designations").insert({ organization_id: orgId, name: parsed.data.designationName, is_default: true, code: "STF" });
    }
    await admin.from("organizations").update({ setup_step: Math.max(access.user.organization.setup_step, 3) }).eq("id", orgId);
  }

  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "company_setting_change",
    metadata: { step: 2 },
  });
  revalidatePath("/setup");
  return { success: true, message: "Structure saved." };
}

export async function saveSetupStep3(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireSetupAccess();
  if (access.error || !access.user) return access.error!;

  const parsed = companyStep3Schema.safeParse({
    industry: formData.get("industry"),
    payrollFrequency: formData.get("payrollFrequency"),
    weeklyOff: formData.get("weeklyOff"),
    timezone: formData.get("timezone"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) {
    return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  }

  const payload = {
    industry: parsed.data.industry,
    payroll_frequency: parsed.data.payrollFrequency,
    weekly_off: parsed.data.weeklyOff,
    timezone: parsed.data.timezone,
    currency: parsed.data.currency,
    setup_step: 4,
  };

  if (!hasSupabaseConfig() || isDemoMode()) {
    Object.assign(getDemoStore().org, payload);
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    const { error } = await admin.from("organizations").update(payload).eq("id", access.user.organization.id);
    if (error) return { success: false, message: error.message };
  }

  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "company_setting_change",
    metadata: { step: 3 },
  });
  revalidatePath("/setup");
  return { success: true, message: "Business defaults saved." };
}

export async function completeSetupAction(): Promise<ActionResult> {
  const access = await requireSetupAccess();
  if (access.error || !access.user) return access.error!;

  if (!hasSupabaseConfig() || isDemoMode()) {
    const org = getDemoStore().org;
    org.setup_completed = true;
    org.setup_step = 4;
    org.status = "ACTIVE";
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    const { error } = await admin
      .from("organizations")
      .update({ setup_completed: true, setup_step: 4, status: "ACTIVE" })
      .eq("id", access.user.organization.id);
    if (error) return { success: false, message: error.message };
  }

  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: "company_setting_change",
    metadata: { step: 4, completed: true },
  });
  revalidatePath("/");
  return { success: true, message: "Setup complete." };
}

export async function saveCompanySettings(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const step1 = await saveSetupStep1(undefined, formData);
  if (!step1.success) return step1;
  const step3 = await saveSetupStep3(undefined, formData);
  return step3.success ? { success: true, message: "Company settings saved." } : step3;
}
