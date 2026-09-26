"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { getDemoStore } from "@/lib/demo-store";
import { flattenErrors, optional } from "@/lib/form-errors";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  branchSchema,
  departmentSchema,
  designationSchema,
  employmentTypeSchema,
  locationSchema,
} from "@/lib/validations/org";
import type { ActionResult, Branch, Department, Designation, EmploymentType, Location } from "@/types";
import type { PermissionCode } from "@/lib/constants";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

async function requireOrgPermission(permission: PermissionCode) {
  const user = await getSessionUser();
  if (!user) return { user: null, error: { success: false, message: "Sign in required." } as ActionResult };
  if (!hasPermission(user, permission) && !hasPermission(user, "settings.manage")) {
    return { user: null, error: { success: false, message: "You do not have permission to manage this record." } as ActionResult };
  }
  return { user, error: null };
}

function stamp() {
  return new Date().toISOString();
}

export async function saveBranchAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireOrgPermission("organization.branch.manage");
  if (access.error || !access.user) return access.error!;

  const parsed = branchSchema.safeParse({
    name: formData.get("name"),
    code: optional(formData.get("code")),
    address: optional(formData.get("address")),
    city: optional(formData.get("city")),
    state: optional(formData.get("state")),
    pin: optional(formData.get("pin")),
    phone: optional(formData.get("phone")),
    email: optional(formData.get("email")),
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) {
    return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  }

  const id = optional(formData.get("id"));
  const payload = {
    name: parsed.data.name,
    code: parsed.data.code || null,
    address: parsed.data.address || null,
    city: parsed.data.city || null,
    state: parsed.data.state || null,
    pin: parsed.data.pin || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    status: parsed.data.status,
    updated_at: stamp(),
  };

  if (demoEnabled()) {
    const store = getDemoStore();
    if (id) {
      const row = store.branches.find((item) => item.id === id);
      if (!row) return { success: false, message: "Branch not found." };
      Object.assign(row, payload);
    } else {
      const duplicate = store.branches.some((item) => item.name.toLowerCase() === parsed.data.name.toLowerCase());
      if (duplicate) return { success: false, errors: { name: ["A branch with this name already exists."] } };
      store.branches.push({
        id: crypto.randomUUID(),
        organization_id: access.user.organization.id,
        is_default: store.branches.length === 0,
        created_at: stamp(),
        ...payload,
      } as Branch);
    }
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    if (id) {
      const { error } = await admin.from("branches").update(payload).eq("id", id).eq("organization_id", access.user.organization.id);
      if (error) return { success: false, message: error.message };
    } else {
      const { error } = await admin.from("branches").insert({
        organization_id: access.user.organization.id,
        is_default: false,
        ...payload,
      });
      if (error) return { success: false, message: error.message };
    }
  }

  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: id ? "branch_updated" : "branch_created",
    entityType: "branches",
    entityId: id || undefined,
    metadata: { name: parsed.data.name },
  });
  revalidatePath("/settings/branches");
  revalidatePath("/employees");
  return { success: true, message: id ? "Branch updated." : "Branch created." };
}

export async function toggleBranchStatusAction(id: string, enable: boolean): Promise<ActionResult> {
  const access = await requireOrgPermission("organization.branch.manage");
  if (access.error || !access.user) return access.error!;
  const status = enable ? "ACTIVE" : "DISABLED";

  if (demoEnabled()) {
    const row = getDemoStore().branches.find((item) => item.id === id);
    if (!row) return { success: false, message: "Branch not found." };
    row.status = status;
    row.updated_at = stamp();
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    const { error } = await admin.from("branches").update({ status }).eq("id", id).eq("organization_id", access.user.organization.id);
    if (error) return { success: false, message: error.message };
  }

  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: enable ? "branch_activated" : "branch_deactivated",
    entityType: "branches",
    entityId: id,
  });
  revalidatePath("/settings/branches");
  return { success: true, message: enable ? "Branch activated." : "Branch deactivated." };
}

export async function saveDepartmentAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireOrgPermission("organization.department.manage");
  if (access.error || !access.user) return access.error!;
  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    code: optional(formData.get("code")),
    managerEmployeeId: optional(formData.get("managerEmployeeId")),
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) {
    return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  }
  const id = optional(formData.get("id"));
  const payload = {
    name: parsed.data.name,
    code: parsed.data.code || null,
    manager_employee_id: parsed.data.managerEmployeeId || null,
    status: parsed.data.status,
    updated_at: stamp(),
  };

  if (demoEnabled()) {
    const store = getDemoStore();
    if (id) {
      const row = store.departments.find((item) => item.id === id);
      if (!row) return { success: false, message: "Department not found." };
      Object.assign(row, payload);
    } else {
      if (store.departments.some((item) => item.name.toLowerCase() === parsed.data.name.toLowerCase())) {
        return { success: false, errors: { name: ["A department with this name already exists."] } };
      }
      store.departments.push({
        id: crypto.randomUUID(),
        organization_id: access.user.organization.id,
        is_default: store.departments.length === 0,
        created_at: stamp(),
        ...payload,
      } as Department);
    }
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    if (id) {
      const { error } = await admin.from("departments").update(payload).eq("id", id).eq("organization_id", access.user.organization.id);
      if (error) return { success: false, message: error.message };
    } else {
      const { error } = await admin.from("departments").insert({ organization_id: access.user.organization.id, is_default: false, ...payload });
      if (error) return { success: false, message: error.message };
    }
  }

  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: id ? "department_updated" : "department_created",
    entityType: "departments",
    metadata: { name: parsed.data.name },
  });
  revalidatePath("/settings/departments");
  revalidatePath("/employees");
  return { success: true, message: id ? "Department updated." : "Department created." };
}

export async function toggleDepartmentStatusAction(id: string, enable: boolean): Promise<ActionResult> {
  const access = await requireOrgPermission("organization.department.manage");
  if (access.error || !access.user) return access.error!;
  const status = enable ? "ACTIVE" : "DISABLED";
  if (demoEnabled()) {
    const row = getDemoStore().departments.find((item) => item.id === id);
    if (!row) return { success: false, message: "Department not found." };
    row.status = status;
    row.updated_at = stamp();
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    const { error } = await admin.from("departments").update({ status }).eq("id", id).eq("organization_id", access.user.organization.id);
    if (error) return { success: false, message: error.message };
  }
  revalidatePath("/settings/departments");
  return { success: true, message: enable ? "Department activated." : "Department deactivated." };
}

export async function saveDesignationAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireOrgPermission("organization.designation.manage");
  if (access.error || !access.user) return access.error!;
  const parsed = designationSchema.safeParse({
    name: formData.get("name"),
    code: optional(formData.get("code")),
    departmentId: optional(formData.get("departmentId")),
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) {
    return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  }
  const id = optional(formData.get("id"));
  const payload = {
    name: parsed.data.name,
    code: parsed.data.code || null,
    department_id: parsed.data.departmentId || null,
    status: parsed.data.status,
    updated_at: stamp(),
  };

  if (demoEnabled()) {
    const store = getDemoStore();
    if (id) {
      const row = store.designations.find((item) => item.id === id);
      if (!row) return { success: false, message: "Designation not found." };
      Object.assign(row, payload);
    } else {
      if (store.designations.some((item) => item.name.toLowerCase() === parsed.data.name.toLowerCase())) {
        return { success: false, errors: { name: ["A designation with this name already exists."] } };
      }
      store.designations.push({
        id: crypto.randomUUID(),
        organization_id: access.user.organization.id,
        is_default: store.designations.length === 0,
        created_at: stamp(),
        ...payload,
      } as Designation);
    }
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    if (id) {
      const { error } = await admin.from("designations").update(payload).eq("id", id).eq("organization_id", access.user.organization.id);
      if (error) return { success: false, message: error.message };
    } else {
      const { error } = await admin.from("designations").insert({ organization_id: access.user.organization.id, is_default: false, ...payload });
      if (error) return { success: false, message: error.message };
    }
  }

  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: id ? "designation_updated" : "designation_created",
    entityType: "designations",
    metadata: { name: parsed.data.name },
  });
  revalidatePath("/settings/designations");
  revalidatePath("/employees");
  return { success: true, message: id ? "Designation updated." : "Designation created." };
}

export async function toggleDesignationStatusAction(id: string, enable: boolean): Promise<ActionResult> {
  const access = await requireOrgPermission("organization.designation.manage");
  if (access.error || !access.user) return access.error!;
  const status = enable ? "ACTIVE" : "DISABLED";
  if (demoEnabled()) {
    const row = getDemoStore().designations.find((item) => item.id === id);
    if (!row) return { success: false, message: "Designation not found." };
    row.status = status;
    row.updated_at = stamp();
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    const { error } = await admin.from("designations").update({ status }).eq("id", id).eq("organization_id", access.user.organization.id);
    if (error) return { success: false, message: error.message };
  }
  revalidatePath("/settings/designations");
  return { success: true, message: enable ? "Designation activated." : "Designation deactivated." };
}

export async function saveLocationAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireOrgPermission("settings.manage");
  if (access.error || !access.user) return access.error!;
  const parsed = locationSchema.safeParse({
    name: formData.get("name"),
    address: optional(formData.get("address")),
    branchId: optional(formData.get("branchId")),
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) {
    return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  }
  const id = optional(formData.get("id"));
  const payload = {
    name: parsed.data.name,
    address: parsed.data.address || null,
    branch_id: parsed.data.branchId || null,
    status: parsed.data.status,
    updated_at: stamp(),
  };

  if (demoEnabled()) {
    const store = getDemoStore();
    if (id) {
      const row = store.locations.find((item) => item.id === id);
      if (!row) return { success: false, message: "Location not found." };
      Object.assign(row, payload);
    } else {
      if (store.locations.some((item) => item.name.toLowerCase() === parsed.data.name.toLowerCase())) {
        return { success: false, errors: { name: ["A location with this name already exists."] } };
      }
      store.locations.push({
        id: crypto.randomUUID(),
        organization_id: access.user.organization.id,
        created_at: stamp(),
        ...payload,
      } as Location);
    }
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    if (id) {
      const { error } = await admin.from("locations").update(payload).eq("id", id).eq("organization_id", access.user.organization.id);
      if (error) return { success: false, message: error.message };
    } else {
      const { error } = await admin.from("locations").insert({ organization_id: access.user.organization.id, ...payload });
      if (error) return { success: false, message: error.message };
    }
  }

  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: id ? "location_updated" : "location_created",
    entityType: "locations",
    metadata: { name: parsed.data.name },
  });
  revalidatePath("/settings/locations");
  return { success: true, message: id ? "Location updated." : "Location created." };
}

export async function toggleLocationStatusAction(id: string, enable: boolean): Promise<ActionResult> {
  const access = await requireOrgPermission("settings.manage");
  if (access.error || !access.user) return access.error!;
  const status = enable ? "ACTIVE" : "DISABLED";
  if (demoEnabled()) {
    const row = getDemoStore().locations.find((item) => item.id === id);
    if (!row) return { success: false, message: "Location not found." };
    row.status = status;
    row.updated_at = stamp();
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    const { error } = await admin.from("locations").update({ status }).eq("id", id).eq("organization_id", access.user.organization.id);
    if (error) return { success: false, message: error.message };
  }
  revalidatePath("/settings/locations");
  return { success: true, message: enable ? "Location activated." : "Location deactivated." };
}

export async function saveEmploymentTypeAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const access = await requireOrgPermission("settings.manage");
  if (access.error || !access.user) return access.error!;
  const parsed = employmentTypeSchema.safeParse({
    name: formData.get("name"),
    code: optional(formData.get("code")),
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) {
    return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  }
  const id = optional(formData.get("id"));
  const payload = {
    name: parsed.data.name,
    code: parsed.data.code || null,
    status: parsed.data.status,
    updated_at: stamp(),
  };

  if (demoEnabled()) {
    const store = getDemoStore();
    if (id) {
      const row = store.employmentTypes.find((item) => item.id === id);
      if (!row) return { success: false, message: "Employment type not found." };
      Object.assign(row, payload);
    } else {
      if (store.employmentTypes.some((item) => item.name.toLowerCase() === parsed.data.name.toLowerCase())) {
        return { success: false, errors: { name: ["This employment type already exists."] } };
      }
      store.employmentTypes.push({
        id: crypto.randomUUID(),
        organization_id: access.user.organization.id,
        is_system: false,
        created_at: stamp(),
        ...payload,
      } as EmploymentType);
    }
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    if (id) {
      const { error } = await admin.from("employment_types").update(payload).eq("id", id).eq("organization_id", access.user.organization.id);
      if (error) return { success: false, message: error.message };
    } else {
      const { error } = await admin.from("employment_types").insert({
        organization_id: access.user.organization.id,
        is_system: false,
        ...payload,
      });
      if (error) return { success: false, message: error.message };
    }
  }

  await writeAudit({
    organizationId: access.user.organization.id,
    actorUserId: access.user.id,
    action: id ? "employment_type_updated" : "employment_type_created",
    entityType: "employment_types",
    metadata: { name: parsed.data.name },
  });
  revalidatePath("/settings/employment-types");
  revalidatePath("/employees");
  return { success: true, message: id ? "Employment type updated." : "Employment type created." };
}

export async function toggleEmploymentTypeStatusAction(id: string, enable: boolean): Promise<ActionResult> {
  const access = await requireOrgPermission("settings.manage");
  if (access.error || !access.user) return access.error!;
  const status = enable ? "ACTIVE" : "DISABLED";
  if (demoEnabled()) {
    const row = getDemoStore().employmentTypes.find((item) => item.id === id);
    if (!row) return { success: false, message: "Employment type not found." };
    row.status = status;
    row.updated_at = stamp();
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    const { error } = await admin.from("employment_types").update({ status }).eq("id", id).eq("organization_id", access.user.organization.id);
    if (error) return { success: false, message: error.message };
  }
  revalidatePath("/settings/employment-types");
  return { success: true, message: enable ? "Employment type activated." : "Employment type deactivated." };
}
