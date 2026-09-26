"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { getDemoStore } from "@/lib/demo-store";
import { flattenErrors, optional } from "@/lib/form-errors";
import { employeeFullName } from "@/lib/mask";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { employeeSchema, employeeStatusSchema } from "@/lib/validations/employee";
import { DOCUMENT_TYPES, type DocumentType, type EmployeeStatus, type Gender } from "@/lib/constants";
import type {
  ActionResult,
  EmployeeAddress,
  EmployeeBankAccount,
  EmployeeEmployment,
  EmployeeHistory,
  EmployeeStatutory,
} from "@/types";
import type { EmployeeFormValues } from "@/lib/validations/employee";

function demoEnabled() {
  return !hasSupabaseConfig() || isDemoMode();
}

function stamp() {
  return new Date().toISOString();
}

function boolFromForm(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function parseEmployeeForm(formData: FormData) {
  return employeeSchema.safeParse({
    firstName: formData.get("firstName"),
    middleName: optional(formData.get("middleName")),
    lastName: formData.get("lastName"),
    displayName: optional(formData.get("displayName")),
    gender: optional(formData.get("gender")),
    dateOfBirth: optional(formData.get("dateOfBirth")),
    mobile: formData.get("mobile"),
    alternateMobile: optional(formData.get("alternateMobile")),
    personalEmail: optional(formData.get("personalEmail")),
    addressLine1: optional(formData.get("addressLine1")),
    addressLine2: optional(formData.get("addressLine2")),
    city: optional(formData.get("city")),
    state: optional(formData.get("state")),
    pin: optional(formData.get("pin")),
    emergencyContactName: optional(formData.get("emergencyContactName")),
    emergencyContactNumber: optional(formData.get("emergencyContactNumber")),
    emergencyRelationship: optional(formData.get("emergencyRelationship")),
    employeeCode: formData.get("employeeCode"),
    joiningDate: formData.get("joiningDate"),
    employmentTypeId: formData.get("employmentTypeId"),
    branchId: formData.get("branchId"),
    departmentId: optional(formData.get("departmentId")),
    designationId: optional(formData.get("designationId")),
    reportingManagerId: optional(formData.get("reportingManagerId")),
    locationId: optional(formData.get("locationId")),
    status: formData.get("status") || "ACTIVE",
    officialEmail: optional(formData.get("officialEmail")),
    workPhone: optional(formData.get("workPhone")),
    pan: optional(formData.get("pan")),
    aadhaarLast4: optional(formData.get("aadhaarLast4")),
    uan: optional(formData.get("uan")),
    esicNumber: optional(formData.get("esicNumber")),
    pfApplicable: boolFromForm(formData.get("pfApplicable")),
    esiApplicable: boolFromForm(formData.get("esiApplicable")),
    ptApplicable: boolFromForm(formData.get("ptApplicable")),
    accountHolderName: optional(formData.get("accountHolderName")),
    bankName: optional(formData.get("bankName")),
    accountNumber: optional(formData.get("accountNumber")),
    ifsc: optional(formData.get("ifsc")),
    bankBranchName: optional(formData.get("bankBranchName")),
  });
}

function displayNameFrom(values: EmployeeFormValues) {
  return (
    values.displayName?.trim() ||
    employeeFullName({
      first_name: values.firstName,
      middle_name: values.middleName,
      last_name: values.lastName,
    })
  );
}

function pushHistory(input: Omit<EmployeeHistory, "id" | "created_at">) {
  const store = getDemoStore();
  store.employeeHistory.unshift({
    ...input,
    id: crypto.randomUUID(),
    created_at: stamp(),
  });
}

async function insertHistory(
  organizationId: string,
  payload: Omit<EmployeeHistory, "id" | "created_at">
) {
  if (demoEnabled()) {
    pushHistory(payload);
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("employee_history").insert(payload);
}

function changed(oldValue: string | null | undefined, newValue: string | null | undefined) {
  return (oldValue ?? "") !== (newValue ?? "");
}

export async function saveEmployeeAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, message: "Sign in required." };
  const id = optional(formData.get("id"));
  const needed = id ? "employee.edit" : "employee.create";
  if (!hasPermission(user, needed)) {
    return { success: false, message: "You do not have permission to save this employee." };
  }

  const parsed = parseEmployeeForm(formData);
  if (!parsed.success) {
    return { success: false, errors: flattenErrors(parsed.error), message: "Please correct the highlighted fields." };
  }
  const values = parsed.data;
  if (id && values.reportingManagerId === id) {
    return { success: false, errors: { reportingManagerId: ["An employee cannot report to themselves."] } };
  }

  const orgId = user.organization.id;
  const name = displayNameFrom(values);
  const now = stamp();

  if (demoEnabled()) {
    const store = getDemoStore();
    const duplicate = store.employees.find(
      (item) =>
        item.organization_id === orgId &&
        item.employee_code.toLowerCase() === values.employeeCode.toLowerCase() &&
        item.id !== id
    );
    if (duplicate) {
      return { success: false, errors: { employeeCode: ["Employee ID already exists in this organization."] } };
    }

    if (id) {
      const employee = store.employees.find((item) => item.id === id && item.organization_id === orgId);
      if (!employee) return { success: false, message: "Employee not found." };
      const employment = store.employeeEmployment.find((item) => item.employee_id === id);
      const oldDept = employment?.department_id ?? null;
      const oldDesig = employment?.designation_id ?? null;
      const oldBranch = employment?.branch_id ?? null;
      const oldManager = employment?.reporting_manager_id ?? null;
      const oldType = employment?.employment_type_id ?? null;
      const oldStatus = employee.status;

      Object.assign(employee, {
        employee_code: values.employeeCode,
        first_name: values.firstName,
        middle_name: values.middleName || null,
        last_name: values.lastName,
        display_name: name,
        gender: (values.gender || null) as Gender | null,
        date_of_birth: values.dateOfBirth || null,
        mobile: values.mobile,
        alternate_mobile: values.alternateMobile || null,
        personal_email: values.personalEmail || null,
        emergency_contact_name: values.emergencyContactName || null,
        emergency_contact_number: values.emergencyContactNumber || null,
        emergency_relationship: values.emergencyRelationship || null,
        status: values.status,
        updated_by: user.id,
        updated_at: now,
      });

      const address = store.employeeAddresses.find((item) => item.employee_id === id);
      const addressPayload = {
        address_line1: values.addressLine1 || null,
        address_line2: values.addressLine2 || null,
        city: values.city || null,
        state: values.state || null,
        pin: values.pin || null,
        updated_at: now,
      };
      if (address) Object.assign(address, addressPayload);
      else {
        store.employeeAddresses.push({
          id: crypto.randomUUID(),
          organization_id: orgId,
          employee_id: id,
          created_at: now,
          ...addressPayload,
        } as EmployeeAddress);
      }

      const employmentPayload = {
        joining_date: values.joiningDate,
        employment_type_id: values.employmentTypeId,
        branch_id: values.branchId,
        department_id: values.departmentId || null,
        designation_id: values.designationId || null,
        reporting_manager_id: values.reportingManagerId || null,
        location_id: values.locationId || null,
        official_email: values.officialEmail || null,
        work_phone: values.workPhone || null,
        updated_at: now,
      };
      if (employment) Object.assign(employment, employmentPayload);
      else {
        store.employeeEmployment.push({
          id: crypto.randomUUID(),
          organization_id: orgId,
          employee_id: id,
          created_at: now,
          ...employmentPayload,
        } as EmployeeEmployment);
      }

      const statutory = store.employeeStatutory.find((item) => item.employee_id === id);
      const statutoryPayload = {
        pan: values.pan || null,
        aadhaar_last4: values.aadhaarLast4 || null,
        uan: values.uan || null,
        esic_number: values.esicNumber || null,
        pf_applicable: Boolean(values.pfApplicable),
        esi_applicable: Boolean(values.esiApplicable),
        pt_applicable: Boolean(values.ptApplicable),
        updated_at: now,
      };
      if (statutory) Object.assign(statutory, statutoryPayload);
      else {
        store.employeeStatutory.push({
          id: crypto.randomUUID(),
          organization_id: orgId,
          employee_id: id,
          created_at: now,
          ...statutoryPayload,
        } as EmployeeStatutory);
      }

      const bank = store.employeeBank.find((item) => item.employee_id === id);
      const bankPayload = {
        account_holder_name: values.accountHolderName || null,
        bank_name: values.bankName || null,
        account_number: values.accountNumber || null,
        ifsc: values.ifsc || null,
        branch_name: values.bankBranchName || null,
        updated_at: now,
      };
      if (bank) Object.assign(bank, bankPayload);
      else {
        store.employeeBank.push({
          id: crypto.randomUUID(),
          organization_id: orgId,
          employee_id: id,
          created_at: now,
          ...bankPayload,
        } as EmployeeBankAccount);
      }

      const reason = optional(formData.get("changeReason")) || "Updated from employee profile";
      if (changed(oldDept, values.departmentId || null)) {
        pushHistory({
          organization_id: orgId,
          employee_id: id,
          event_type: "DEPARTMENT_CHANGE",
          old_value: lookupLabel(store.departments, oldDept),
          new_value: lookupLabel(store.departments, values.departmentId),
          effective_date: values.joiningDate,
          reason,
          changed_by: user.id,
        });
      }
      if (changed(oldDesig, values.designationId || null)) {
        pushHistory({
          organization_id: orgId,
          employee_id: id,
          event_type: "DESIGNATION_CHANGE",
          old_value: lookupLabel(store.designations, oldDesig),
          new_value: lookupLabel(store.designations, values.designationId),
          effective_date: values.joiningDate,
          reason,
          changed_by: user.id,
        });
      }
      if (changed(oldBranch, values.branchId)) {
        pushHistory({
          organization_id: orgId,
          employee_id: id,
          event_type: "BRANCH_TRANSFER",
          old_value: lookupLabel(store.branches, oldBranch),
          new_value: lookupLabel(store.branches, values.branchId),
          effective_date: values.joiningDate,
          reason,
          changed_by: user.id,
        });
      }
      if (changed(oldManager, values.reportingManagerId || null)) {
        pushHistory({
          organization_id: orgId,
          employee_id: id,
          event_type: "MANAGER_CHANGE",
          old_value: lookupEmployeeName(oldManager),
          new_value: lookupEmployeeName(values.reportingManagerId),
          effective_date: values.joiningDate,
          reason,
          changed_by: user.id,
        });
      }
      if (changed(oldType, values.employmentTypeId)) {
        pushHistory({
          organization_id: orgId,
          employee_id: id,
          event_type: "EMPLOYMENT_TYPE_CHANGE",
          old_value: lookupLabel(store.employmentTypes, oldType),
          new_value: lookupLabel(store.employmentTypes, values.employmentTypeId),
          effective_date: values.joiningDate,
          reason,
          changed_by: user.id,
        });
      }
      if (oldStatus !== values.status) {
        pushHistory({
          organization_id: orgId,
          employee_id: id,
          event_type: "STATUS_CHANGE",
          old_value: oldStatus,
          new_value: values.status,
          effective_date: optional(formData.get("effectiveDate")) || now.slice(0, 10),
          reason,
          changed_by: user.id,
        });
      }

      await writeAudit({
        organizationId: orgId,
        actorUserId: user.id,
        action: "employee_edited",
        entityType: "employees",
        entityId: id,
        metadata: { employeeCode: values.employeeCode },
      });
      revalidatePath("/employees");
      revalidatePath(`/employees/${id}`);
      return { success: true, message: "Employee updated.", data: { id } };
    }

    const employeeId = crypto.randomUUID();
    store.employees.push({
      id: employeeId,
      organization_id: orgId,
      employee_code: values.employeeCode,
      first_name: values.firstName,
      middle_name: values.middleName || null,
      last_name: values.lastName,
      display_name: name,
      gender: (values.gender || null) as Gender | null,
      date_of_birth: values.dateOfBirth || null,
      mobile: values.mobile,
      alternate_mobile: values.alternateMobile || null,
      personal_email: values.personalEmail || null,
      photo_url: null,
      emergency_contact_name: values.emergencyContactName || null,
      emergency_contact_number: values.emergencyContactNumber || null,
      emergency_relationship: values.emergencyRelationship || null,
      status: values.status,
      user_id: null,
      is_demo: false,
      created_by: user.id,
      updated_by: user.id,
      created_at: now,
      updated_at: now,
    });
    store.employeeAddresses.push({
      id: crypto.randomUUID(),
      organization_id: orgId,
      employee_id: employeeId,
      address_line1: values.addressLine1 || null,
      address_line2: values.addressLine2 || null,
      city: values.city || null,
      state: values.state || null,
      pin: values.pin || null,
      created_at: now,
      updated_at: now,
    });
    store.employeeEmployment.push({
      id: crypto.randomUUID(),
      organization_id: orgId,
      employee_id: employeeId,
      joining_date: values.joiningDate,
      employment_type_id: values.employmentTypeId,
      branch_id: values.branchId,
      department_id: values.departmentId || null,
      designation_id: values.designationId || null,
      reporting_manager_id: values.reportingManagerId || null,
      location_id: values.locationId || null,
      official_email: values.officialEmail || null,
      work_phone: values.workPhone || null,
      created_at: now,
      updated_at: now,
    });
    store.employeeStatutory.push({
      id: crypto.randomUUID(),
      organization_id: orgId,
      employee_id: employeeId,
      pan: values.pan || null,
      aadhaar_last4: values.aadhaarLast4 || null,
      uan: values.uan || null,
      esic_number: values.esicNumber || null,
      pf_applicable: Boolean(values.pfApplicable),
      esi_applicable: Boolean(values.esiApplicable),
      pt_applicable: Boolean(values.ptApplicable),
      created_at: now,
      updated_at: now,
    });
    store.employeeBank.push({
      id: crypto.randomUUID(),
      organization_id: orgId,
      employee_id: employeeId,
      account_holder_name: values.accountHolderName || null,
      bank_name: values.bankName || null,
      account_number: values.accountNumber || null,
      ifsc: values.ifsc || null,
      branch_name: values.bankBranchName || null,
      created_at: now,
      updated_at: now,
    });
    pushHistory({
      organization_id: orgId,
      employee_id: employeeId,
      event_type: "JOINING",
      old_value: null,
      new_value: name,
      effective_date: values.joiningDate,
      reason: "Employee created",
      changed_by: user.id,
    });
    await writeAudit({
      organizationId: orgId,
      actorUserId: user.id,
      action: "employee_created",
      entityType: "employees",
      entityId: employeeId,
      metadata: { employeeCode: values.employeeCode },
    });
    revalidatePath("/employees");
    return { success: true, message: "Employee created.", data: { id: employeeId } };
  }

  const admin = createAdminClient();
  if (!admin) return { success: false, message: "Database is not configured." };

  const { data: existing } = await admin
    .from("employees")
    .select("id")
    .eq("organization_id", orgId)
    .ilike("employee_code", values.employeeCode)
    .maybeSingle();
  if (existing && existing.id !== id) {
    return { success: false, errors: { employeeCode: ["Employee ID already exists in this organization."] } };
  }

  const employeePayload = {
    organization_id: orgId,
    employee_code: values.employeeCode,
    first_name: values.firstName,
    middle_name: values.middleName || null,
    last_name: values.lastName,
    display_name: name,
    gender: values.gender || null,
    date_of_birth: values.dateOfBirth || null,
    mobile: values.mobile,
    alternate_mobile: values.alternateMobile || null,
    personal_email: values.personalEmail || null,
    emergency_contact_name: values.emergencyContactName || null,
    emergency_contact_number: values.emergencyContactNumber || null,
    emergency_relationship: values.emergencyRelationship || null,
    status: values.status,
    updated_by: user.id,
  };

  let employeeId = id;
  if (id) {
    const { data: before } = await admin
      .from("employees")
      .select("status")
      .eq("id", id)
      .eq("organization_id", orgId)
      .maybeSingle();
    const { data: beforeEmp } = await admin.from("employee_employment").select("*").eq("employee_id", id).maybeSingle();
    const { error } = await admin.from("employees").update(employeePayload).eq("id", id).eq("organization_id", orgId);
    if (error) return { success: false, message: error.message };
    await upsertRelated(admin, orgId, id, values, now);
    await recordRelatedHistory(orgId, id, user.id, values, beforeEmp, before?.status as EmployeeStatus | undefined);
    await writeAudit({
      organizationId: orgId,
      actorUserId: user.id,
      action: "employee_edited",
      entityType: "employees",
      entityId: id,
      metadata: { employeeCode: values.employeeCode },
    });
  } else {
    const { data, error } = await admin
      .from("employees")
      .insert({ ...employeePayload, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) return { success: false, message: error?.message ?? "Unable to create employee." };
    employeeId = data.id;
    await upsertRelated(admin, orgId, employeeId, values, now);
    await insertHistory(orgId, {
      organization_id: orgId,
      employee_id: employeeId,
      event_type: "JOINING",
      old_value: null,
      new_value: name,
      effective_date: values.joiningDate,
      reason: "Employee created",
      changed_by: user.id,
    });
    await writeAudit({
      organizationId: orgId,
      actorUserId: user.id,
      action: "employee_created",
      entityType: "employees",
      entityId: employeeId,
      metadata: { employeeCode: values.employeeCode },
    });
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  return { success: true, message: id ? "Employee updated." : "Employee created.", data: { id: employeeId } };
}

function lookupLabel(rows: { id: string; name: string }[], id?: string | null) {
  if (!id) return null;
  return rows.find((row) => row.id === id)?.name ?? null;
}

function lookupEmployeeName(id?: string | null) {
  if (!id) return null;
  return getDemoStore().employees.find((item) => item.id === id)?.display_name ?? null;
}

async function upsertRelated(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  orgId: string,
  employeeId: string,
  values: EmployeeFormValues,
  now: string
) {
  await admin.from("employee_addresses").upsert(
    {
      organization_id: orgId,
      employee_id: employeeId,
      address_line1: values.addressLine1 || null,
      address_line2: values.addressLine2 || null,
      city: values.city || null,
      state: values.state || null,
      pin: values.pin || null,
      updated_at: now,
    },
    { onConflict: "employee_id" }
  );
  await admin.from("employee_employment").upsert(
    {
      organization_id: orgId,
      employee_id: employeeId,
      joining_date: values.joiningDate,
      employment_type_id: values.employmentTypeId,
      branch_id: values.branchId,
      department_id: values.departmentId || null,
      designation_id: values.designationId || null,
      reporting_manager_id: values.reportingManagerId || null,
      location_id: values.locationId || null,
      official_email: values.officialEmail || null,
      work_phone: values.workPhone || null,
      updated_at: now,
    },
    { onConflict: "employee_id" }
  );
  await admin.from("employee_statutory").upsert(
    {
      organization_id: orgId,
      employee_id: employeeId,
      pan: values.pan || null,
      aadhaar_last4: values.aadhaarLast4 || null,
      uan: values.uan || null,
      esic_number: values.esicNumber || null,
      pf_applicable: Boolean(values.pfApplicable),
      esi_applicable: Boolean(values.esiApplicable),
      pt_applicable: Boolean(values.ptApplicable),
      updated_at: now,
    },
    { onConflict: "employee_id" }
  );
  await admin.from("employee_bank_accounts").upsert(
    {
      organization_id: orgId,
      employee_id: employeeId,
      account_holder_name: values.accountHolderName || null,
      bank_name: values.bankName || null,
      account_number: values.accountNumber || null,
      ifsc: values.ifsc || null,
      branch_name: values.bankBranchName || null,
      updated_at: now,
    },
    { onConflict: "employee_id" }
  );
}

async function recordRelatedHistory(
  orgId: string,
  employeeId: string,
  actorId: string,
  values: EmployeeFormValues,
  beforeEmp: Record<string, unknown> | null,
  oldStatus?: EmployeeStatus
) {
  const reason = "Updated from employee profile";
  if (changed(String(beforeEmp?.department_id ?? ""), values.departmentId || "")) {
    await insertHistory(orgId, {
      organization_id: orgId,
      employee_id: employeeId,
      event_type: "DEPARTMENT_CHANGE",
      old_value: String(beforeEmp?.department_id ?? ""),
      new_value: values.departmentId || null,
      effective_date: values.joiningDate,
      reason,
      changed_by: actorId,
    });
  }
  if (changed(String(beforeEmp?.designation_id ?? ""), values.designationId || "")) {
    await insertHistory(orgId, {
      organization_id: orgId,
      employee_id: employeeId,
      event_type: "DESIGNATION_CHANGE",
      old_value: String(beforeEmp?.designation_id ?? ""),
      new_value: values.designationId || null,
      effective_date: values.joiningDate,
      reason,
      changed_by: actorId,
    });
  }
  if (changed(String(beforeEmp?.branch_id ?? ""), values.branchId)) {
    await insertHistory(orgId, {
      organization_id: orgId,
      employee_id: employeeId,
      event_type: "BRANCH_TRANSFER",
      old_value: String(beforeEmp?.branch_id ?? ""),
      new_value: values.branchId,
      effective_date: values.joiningDate,
      reason,
      changed_by: actorId,
    });
  }
  if (changed(String(beforeEmp?.reporting_manager_id ?? ""), values.reportingManagerId || "")) {
    await insertHistory(orgId, {
      organization_id: orgId,
      employee_id: employeeId,
      event_type: "MANAGER_CHANGE",
      old_value: String(beforeEmp?.reporting_manager_id ?? ""),
      new_value: values.reportingManagerId || null,
      effective_date: values.joiningDate,
      reason,
      changed_by: actorId,
    });
  }
  if (changed(String(beforeEmp?.employment_type_id ?? ""), values.employmentTypeId)) {
    await insertHistory(orgId, {
      organization_id: orgId,
      employee_id: employeeId,
      event_type: "EMPLOYMENT_TYPE_CHANGE",
      old_value: String(beforeEmp?.employment_type_id ?? ""),
      new_value: values.employmentTypeId,
      effective_date: values.joiningDate,
      reason,
      changed_by: actorId,
    });
  }
  if (oldStatus && oldStatus !== values.status) {
    await insertHistory(orgId, {
      organization_id: orgId,
      employee_id: employeeId,
      event_type: "STATUS_CHANGE",
      old_value: oldStatus,
      new_value: values.status,
      effective_date: values.joiningDate,
      reason,
      changed_by: actorId,
    });
  }
}

export async function changeEmployeeStatusAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "employee.disable")) {
    return { success: false, message: "You do not have permission to change employee status." };
  }
  const parsed = employeeStatusSchema.safeParse({
    status: formData.get("status"),
    reason: optional(formData.get("reason")),
    effectiveDate: optional(formData.get("effectiveDate")),
  });
  if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) };
  const employeeId = optional(formData.get("employeeId"));
  if (!employeeId) return { success: false, message: "Employee is required." };

  const orgId = user.organization.id;
  const now = stamp();

  if (demoEnabled()) {
    const employee = getDemoStore().employees.find((item) => item.id === employeeId && item.organization_id === orgId);
    if (!employee) return { success: false, message: "Employee not found." };
    const oldStatus = employee.status;
    employee.status = parsed.data.status;
    employee.updated_by = user.id;
    employee.updated_at = now;
    pushHistory({
      organization_id: orgId,
      employee_id: employeeId,
      event_type: "STATUS_CHANGE",
      old_value: oldStatus,
      new_value: parsed.data.status,
      effective_date: parsed.data.effectiveDate || now.slice(0, 10),
      reason: parsed.data.reason || null,
      changed_by: user.id,
    });
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Database is not configured." };
    const { data: before } = await admin
      .from("employees")
      .select("status")
      .eq("id", employeeId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (!before) return { success: false, message: "Employee not found." };
    const { error } = await admin
      .from("employees")
      .update({ status: parsed.data.status, updated_by: user.id })
      .eq("id", employeeId)
      .eq("organization_id", orgId);
    if (error) return { success: false, message: error.message };
    await insertHistory(orgId, {
      organization_id: orgId,
      employee_id: employeeId,
      event_type: "STATUS_CHANGE",
      old_value: before.status,
      new_value: parsed.data.status,
      effective_date: parsed.data.effectiveDate || now.slice(0, 10),
      reason: parsed.data.reason || null,
      changed_by: user.id,
    });
  }

  await writeAudit({
    organizationId: orgId,
    actorUserId: user.id,
    action: "employee_status_changed",
    entityType: "employees",
    entityId: employeeId,
    metadata: { status: parsed.data.status },
  });
  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  return { success: true, message: "Employee status updated." };
}

export async function uploadEmployeeDocumentAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "employee.documents")) {
    return { success: false, message: "You do not have permission to manage documents." };
  }
  const employeeId = optional(formData.get("employeeId"));
  const documentType = optional(formData.get("documentType")) as DocumentType;
  const file = formData.get("file");
  if (!employeeId) return { success: false, message: "Employee is required." };
  if (!DOCUMENT_TYPES.includes(documentType)) return { success: false, message: "Select a document type." };
  if (!(file instanceof File) || file.size === 0) return { success: false, message: "Choose a file to upload." };
  if (file.size > 8 * 1024 * 1024) return { success: false, message: "File must be 8 MB or smaller." };

  const orgId = user.organization.id;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${orgId}/${employeeId}/${crypto.randomUUID()}-${safeName}`;

  if (demoEnabled()) {
    const store = getDemoStore();
    const employee = store.employees.find((item) => item.id === employeeId && item.organization_id === orgId);
    if (!employee) return { success: false, message: "Employee not found." };
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
    store.documentBlobs[path] = { dataUrl, mimeType: file.type, fileName: file.name };
    store.employeeDocuments.unshift({
      id: crypto.randomUUID(),
      organization_id: orgId,
      employee_id: employeeId,
      document_type: documentType,
      file_name: file.name,
      file_path: path,
      mime_type: file.type || null,
      file_size: file.size,
      status: "ACTIVE",
      uploaded_by: user.id,
      uploaded_at: stamp(),
      created_at: stamp(),
    });
  } else {
    const admin = createAdminClient();
    if (!admin) return { success: false, message: "Storage is not configured." };
    const { error: uploadError } = await admin.storage.from("employee-documents").upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (uploadError) return { success: false, message: uploadError.message };
    const { error } = await admin.from("employee_documents").insert({
      organization_id: orgId,
      employee_id: employeeId,
      document_type: documentType,
      file_name: file.name,
      file_path: path,
      mime_type: file.type || null,
      file_size: file.size,
      status: "ACTIVE",
      uploaded_by: user.id,
    });
    if (error) return { success: false, message: error.message };
  }

  await writeAudit({
    organizationId: orgId,
    actorUserId: user.id,
    action: "document_uploaded",
    entityType: "employee_documents",
    entityId: employeeId,
    metadata: { documentType, fileName: file.name },
  });
  revalidatePath(`/employees/${employeeId}`);
  return { success: true, message: "Document uploaded." };
}

export async function archiveEmployeeDocumentAction(documentId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "employee.documents")) {
    return { success: false, message: "You do not have permission to manage documents." };
  }
  if (demoEnabled()) {
    const doc = getDemoStore().employeeDocuments.find(
      (item) => item.id === documentId && item.organization_id === user.organization.id
    );
    if (!doc) return { success: false, message: "Document not found." };
    doc.status = "ARCHIVED";
    await writeAudit({
      organizationId: user.organization.id,
      actorUserId: user.id,
      action: "document_archived",
      entityType: "employee_documents",
      entityId: doc.employee_id,
      metadata: { documentId },
    });
    revalidatePath(`/employees/${doc.employee_id}`);
    return { success: true, message: "Document archived." };
  }
  const admin = createAdminClient();
  if (!admin) return { success: false, message: "Database is not configured." };
  const { data: doc } = await admin
    .from("employee_documents")
    .select("id, employee_id")
    .eq("id", documentId)
    .eq("organization_id", user.organization.id)
    .maybeSingle();
  if (!doc) return { success: false, message: "Document not found." };
  const { error } = await admin.from("employee_documents").update({ status: "ARCHIVED" }).eq("id", documentId);
  if (error) return { success: false, message: error.message };
  await writeAudit({
    organizationId: user.organization.id,
    actorUserId: user.id,
    action: "document_archived",
    entityType: "employee_documents",
    entityId: doc.employee_id,
  });
  revalidatePath(`/employees/${doc.employee_id}`);
  return { success: true, message: "Document archived." };
}

export async function getEmployeeDocumentUrlAction(documentId: string): Promise<ActionResult<{ url: string; fileName: string }>> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "employee.documents")) {
    return { success: false, message: "You do not have permission to view documents." };
  }
  if (demoEnabled()) {
    const store = getDemoStore();
    const doc = store.employeeDocuments.find(
      (item) => item.id === documentId && item.organization_id === user.organization.id
    );
    if (!doc) return { success: false, message: "Document not found." };
    const blob = store.documentBlobs[doc.file_path];
    if (!blob) return { success: false, message: "File is no longer available in this demo session." };
    return { success: true, data: { url: blob.dataUrl, fileName: doc.file_name } };
  }
  const admin = createAdminClient();
  if (!admin) return { success: false, message: "Storage is not configured." };
  const { data: doc } = await admin
    .from("employee_documents")
    .select("file_path, file_name, organization_id")
    .eq("id", documentId)
    .eq("organization_id", user.organization.id)
    .maybeSingle();
  if (!doc) return { success: false, message: "Document not found." };
  const { data, error } = await admin.storage.from("employee-documents").createSignedUrl(doc.file_path, 60);
  if (error || !data?.signedUrl) return { success: false, message: error?.message ?? "Unable to create a download link." };
  return { success: true, data: { url: data.signedUrl, fileName: doc.file_name } };
}

export type ImportRowResult = {
  row: number;
  employeeCode: string;
  name: string;
  status: "ready" | "error" | "imported";
  errors: string[];
};

function splitCsv(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells: string[] = [];
      let current = "";
      let quoted = false;
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === '"') {
          if (quoted && line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else quoted = !quoted;
        } else if (char === "," && !quoted) {
          cells.push(current.trim());
          current = "";
        } else current += char;
      }
      cells.push(current.trim());
      return cells;
    });
}

function headerIndex(headers: string[], name: string) {
  return headers.findIndex((header) => header.toLowerCase().replace(/\s+/g, "_") === name);
}

export async function previewEmployeeImportAction(formData: FormData): Promise<
  ActionResult<{ rows: ImportRowResult[] }>
> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "employee.import")) {
    return { success: false, message: "You do not have permission to import employees." };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false, message: "Upload a CSV file." };
  const text = await file.text();
  const table = splitCsv(text);
  if (table.length < 2) return { success: false, message: "The file has no data rows." };
  const headers = table[0].map((h) => h.toLowerCase());
  const required = ["employee_id", "first_name", "last_name", "mobile", "joining_date", "branch", "employment_type"];
  const missing = required.filter((col) => headerIndex(headers, col) === -1);
  if (missing.length) {
    return { success: false, message: `Missing columns: ${missing.join(", ")}.` };
  }

  const store = demoEnabled() ? getDemoStore() : null;
  const rows: ImportRowResult[] = table.slice(1).map((cells, index) => {
    const get = (name: string) => cells[headerIndex(headers, name)] ?? "";
    const employeeCode = get("employee_id");
    const firstName = get("first_name");
    const lastName = get("last_name");
    const mobile = get("mobile");
    const joiningDate = get("joining_date");
    const branchName = get("branch");
    const typeName = get("employment_type");
    const errors: string[] = [];
    if (!employeeCode) errors.push("Employee ID is required.");
    if (!firstName) errors.push("First name is required.");
    if (!lastName) errors.push("Last name is required.");
    if (!/^[6-9]\d{9}$/.test(mobile)) errors.push("Mobile is invalid.");
    if (!joiningDate) errors.push("Joining date is required.");
    if (store) {
      if (store.employees.some((item) => item.employee_code.toLowerCase() === employeeCode.toLowerCase())) {
        errors.push("Employee ID already exists.");
      }
      if (branchName && !store.branches.some((item) => item.name.toLowerCase() === branchName.toLowerCase())) {
        errors.push("Branch not found.");
      }
      if (typeName && !store.employmentTypes.some((item) => item.name.toLowerCase() === typeName.toLowerCase())) {
        errors.push("Employment type not found.");
      }
    }
    return {
      row: index + 2,
      employeeCode,
      name: [firstName, lastName].filter(Boolean).join(" "),
      status: errors.length ? "error" : "ready",
      errors,
    };
  });

  return { success: true, data: { rows } };
}

export async function confirmEmployeeImportAction(formData: FormData): Promise<
  ActionResult<{ imported: number; failed: number; rows: ImportRowResult[] }>
> {
  const preview = await previewEmployeeImportAction(formData);
  if (!preview.success || !preview.data) {
    return { success: false, message: preview.message, errors: preview.errors };
  }
  const user = await getSessionUser();
  if (!user) return { success: false, message: "Sign in required." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, message: "Upload a CSV file." };
  const table = splitCsv(await file.text());
  const headers = table[0].map((h) => h.toLowerCase());
  const getCell = (cells: string[], name: string) => cells[headerIndex(headers, name)] ?? "";

  let imported = 0;
  const rows = [...preview.data.rows];

  if (demoEnabled()) {
    const store = getDemoStore();
    table.slice(1).forEach((cells, index) => {
      const result = rows[index];
      if (!result || result.status === "error") return;
      const employeeCode = getCell(cells, "employee_id");
      const firstName = getCell(cells, "first_name");
      const lastName = getCell(cells, "last_name");
      const mobile = getCell(cells, "mobile");
      const joiningDate = getCell(cells, "joining_date");
      const branchName = getCell(cells, "branch");
      const typeName = getCell(cells, "employment_type");
      const departmentName = getCell(cells, "department");
      const designationName = getCell(cells, "designation");
      const branch = store.branches.find((item) => item.name.toLowerCase() === branchName.toLowerCase());
      const type = store.employmentTypes.find((item) => item.name.toLowerCase() === typeName.toLowerCase());
      const department = store.departments.find((item) => item.name.toLowerCase() === departmentName.toLowerCase());
      const designation = store.designations.find((item) => item.name.toLowerCase() === designationName.toLowerCase());
      const now = stamp();
      const employeeId = crypto.randomUUID();
      const displayName = `${firstName} ${lastName}`.trim();
      store.employees.push({
        id: employeeId,
        organization_id: user.organization.id,
        employee_code: employeeCode,
        first_name: firstName,
        middle_name: null,
        last_name: lastName,
        display_name: displayName,
        gender: null,
        date_of_birth: null,
        mobile,
        alternate_mobile: null,
        personal_email: null,
        photo_url: null,
        emergency_contact_name: null,
        emergency_contact_number: null,
        emergency_relationship: null,
        status: "ACTIVE",
        user_id: null,
        is_demo: false,
        created_by: user.id,
        updated_by: user.id,
        created_at: now,
        updated_at: now,
      });
      store.employeeEmployment.push({
        id: crypto.randomUUID(),
        organization_id: user.organization.id,
        employee_id: employeeId,
        joining_date: joiningDate,
        employment_type_id: type?.id ?? null,
        branch_id: branch?.id ?? null,
        department_id: department?.id ?? null,
        designation_id: designation?.id ?? null,
        reporting_manager_id: null,
        location_id: null,
        official_email: null,
        work_phone: null,
        created_at: now,
        updated_at: now,
      });
      pushHistory({
        organization_id: user.organization.id,
        employee_id: employeeId,
        event_type: "JOINING",
        old_value: null,
        new_value: displayName,
        effective_date: joiningDate,
        reason: "Bulk import",
        changed_by: user.id,
      });
      result.status = "imported";
      imported += 1;
    });
  }

  await writeAudit({
    organizationId: user.organization.id,
    actorUserId: user.id,
    action: "employee_bulk_import",
    entityType: "employees",
    metadata: { imported, failed: rows.filter((row) => row.status === "error").length },
  });
  revalidatePath("/employees");
  return {
    success: true,
    message: `Imported ${imported} employee(s).`,
    data: { imported, failed: rows.filter((row) => row.status === "error").length, rows },
  };
}
