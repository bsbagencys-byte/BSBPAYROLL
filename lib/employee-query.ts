import { PAGE_SIZE } from "@/lib/constants";
import { getDemoStore } from "@/lib/demo-store";
import { lookupName } from "@/lib/utils";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmployeeStatus } from "@/lib/constants";
import type { EmployeeListItem, EmployeeRecord } from "@/types";

export type EmployeeFilters = {
  q?: string;
  branchId?: string;
  departmentId?: string;
  designationId?: string;
  employmentTypeId?: string;
  status?: string;
  managerId?: string;
  joiningFrom?: string;
  joiningTo?: string;
  sort?: string;
  page?: number;
};

export function emptyFilters(): EmployeeFilters {
  return { page: 1, sort: "name" };
}

function matchesSearch(item: EmployeeListItem, q?: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [item.employeeCode, item.displayName, item.mobile, item.officialEmail]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(needle));
}

function toListItemFromDemo(employeeId: string): EmployeeListItem | null {
  const store = getDemoStore();
  const employee = store.employees.find((item) => item.id === employeeId);
  if (!employee) return null;
  const employment = store.employeeEmployment.find((item) => item.employee_id === employeeId);
  return {
    id: employee.id,
    employeeCode: employee.employee_code,
    displayName: employee.display_name,
    mobile: employee.mobile,
    officialEmail: employment?.official_email ?? null,
    departmentName: lookupName(store.departments, employment?.department_id),
    designationName: lookupName(store.designations, employment?.designation_id),
    branchName: lookupName(store.branches, employment?.branch_id),
    joiningDate: employment?.joining_date ?? null,
    employmentTypeName: lookupName(store.employmentTypes, employment?.employment_type_id),
    managerName: lookupName(store.employees, employment?.reporting_manager_id),
    status: employee.status,
  };
}

function sortItems(items: EmployeeListItem[], sort?: string) {
  const copy = [...items];
  copy.sort((a, b) => {
    switch (sort) {
      case "code":
        return a.employeeCode.localeCompare(b.employeeCode);
      case "joining":
        return (a.joiningDate ?? "").localeCompare(b.joiningDate ?? "");
      case "status":
        return a.status.localeCompare(b.status);
      default:
        return a.displayName.localeCompare(b.displayName);
    }
  });
  return copy;
}

export async function queryEmployees(organizationId: string, filters: EmployeeFilters) {
  const page = Math.max(1, filters.page ?? 1);

  if (!hasSupabaseConfig() || isDemoMode()) {
    const store = getDemoStore();
    let items = store.employees
      .map((employee) => toListItemFromDemo(employee.id))
      .filter((item): item is EmployeeListItem => Boolean(item));

    items = items.filter((item) => matchesSearch(item, filters.q));
    if (filters.status) items = items.filter((item) => item.status === filters.status);
    if (filters.branchId) {
      items = items.filter((item) => {
        const employment = store.employeeEmployment.find((row) => row.employee_id === item.id);
        return employment?.branch_id === filters.branchId;
      });
    }
    if (filters.departmentId) {
      items = items.filter((item) => {
        const employment = store.employeeEmployment.find((row) => row.employee_id === item.id);
        return employment?.department_id === filters.departmentId;
      });
    }
    if (filters.designationId) {
      items = items.filter((item) => {
        const employment = store.employeeEmployment.find((row) => row.employee_id === item.id);
        return employment?.designation_id === filters.designationId;
      });
    }
    if (filters.employmentTypeId) {
      items = items.filter((item) => {
        const employment = store.employeeEmployment.find((row) => row.employee_id === item.id);
        return employment?.employment_type_id === filters.employmentTypeId;
      });
    }
    if (filters.managerId) {
      items = items.filter((item) => {
        const employment = store.employeeEmployment.find((row) => row.employee_id === item.id);
        return employment?.reporting_manager_id === filters.managerId;
      });
    }
    if (filters.joiningFrom) {
      items = items.filter((item) => (item.joiningDate ?? "") >= filters.joiningFrom!);
    }
    if (filters.joiningTo) {
      items = items.filter((item) => (item.joiningDate ?? "") <= filters.joiningTo!);
    }

    const sorted = sortItems(items, filters.sort);
    const total = sorted.length;
    const start = (page - 1) * PAGE_SIZE;
    return {
      items: sorted.slice(start, start + PAGE_SIZE),
      total,
      page,
      pageSize: PAGE_SIZE,
      pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { items: [] as EmployeeListItem[], total: 0, page, pageSize: PAGE_SIZE, pageCount: 1 };
  }

  const { data: employees } = await admin
    .from("employees")
    .select("*, employee_employment(*)")
    .eq("organization_id", organizationId);

  const catalog = await Promise.all([
    admin.from("branches").select("id, name").eq("organization_id", organizationId),
    admin.from("departments").select("id, name").eq("organization_id", organizationId),
    admin.from("designations").select("id, name").eq("organization_id", organizationId),
    admin.from("employment_types").select("id, name").eq("organization_id", organizationId),
    admin.from("employees").select("id, display_name").eq("organization_id", organizationId),
  ]);
  const [branches, departments, designations, types, people] = catalog;

  let items: EmployeeListItem[] = (employees ?? []).map((row) => {
    const nested = row as {
      id: string;
      employee_code: string;
      display_name: string;
      mobile: string | null;
      status: EmployeeStatus;
      employee_employment: unknown;
    };
    const employmentRaw = Array.isArray(nested.employee_employment)
      ? nested.employee_employment[0]
      : nested.employee_employment;
    const employment = employmentRaw as {
      official_email?: string | null;
      department_id?: string | null;
      designation_id?: string | null;
      branch_id?: string | null;
      joining_date?: string | null;
      employment_type_id?: string | null;
      reporting_manager_id?: string | null;
    } | null;
    return {
      id: nested.id,
      employeeCode: nested.employee_code,
      displayName: nested.display_name,
      mobile: nested.mobile,
      officialEmail: employment?.official_email ?? null,
      departmentName: lookupName((departments.data ?? []) as { id: string; name: string }[], employment?.department_id),
      designationName: lookupName((designations.data ?? []) as { id: string; name: string }[], employment?.designation_id),
      branchName: lookupName((branches.data ?? []) as { id: string; name: string }[], employment?.branch_id),
      joiningDate: employment?.joining_date ?? null,
      employmentTypeName: lookupName((types.data ?? []) as { id: string; name: string }[], employment?.employment_type_id),
      managerName: lookupName((people.data ?? []) as { id: string; display_name: string }[], employment?.reporting_manager_id),
      status: nested.status,
    };
  });

  items = items.filter((item) => matchesSearch(item, filters.q));
  if (filters.status) items = items.filter((item) => item.status === filters.status);
  if (filters.branchId) {
    items = items.filter((item) => {
      const row = (employees ?? []).find((entry) => entry.id === item.id) as { employee_employment?: unknown } | undefined;
      const employmentRaw = Array.isArray(row?.employee_employment) ? row?.employee_employment[0] : row?.employee_employment;
      return (employmentRaw as { branch_id?: string | null } | null)?.branch_id === filters.branchId;
    });
  }
  if (filters.departmentId) {
    items = items.filter((item) => {
      const row = (employees ?? []).find((entry) => entry.id === item.id) as { employee_employment?: unknown } | undefined;
      const employmentRaw = Array.isArray(row?.employee_employment) ? row?.employee_employment[0] : row?.employee_employment;
      return (employmentRaw as { department_id?: string | null } | null)?.department_id === filters.departmentId;
    });
  }
  if (filters.designationId) {
    items = items.filter((item) => {
      const row = (employees ?? []).find((entry) => entry.id === item.id) as { employee_employment?: unknown } | undefined;
      const employmentRaw = Array.isArray(row?.employee_employment) ? row?.employee_employment[0] : row?.employee_employment;
      return (employmentRaw as { designation_id?: string | null } | null)?.designation_id === filters.designationId;
    });
  }
  if (filters.employmentTypeId) {
    items = items.filter((item) => {
      const row = (employees ?? []).find((entry) => entry.id === item.id) as { employee_employment?: unknown } | undefined;
      const employmentRaw = Array.isArray(row?.employee_employment) ? row?.employee_employment[0] : row?.employee_employment;
      return (employmentRaw as { employment_type_id?: string | null } | null)?.employment_type_id === filters.employmentTypeId;
    });
  }
  if (filters.managerId) {
    items = items.filter((item) => {
      const row = (employees ?? []).find((entry) => entry.id === item.id) as { employee_employment?: unknown } | undefined;
      const employmentRaw = Array.isArray(row?.employee_employment) ? row?.employee_employment[0] : row?.employee_employment;
      return (employmentRaw as { reporting_manager_id?: string | null } | null)?.reporting_manager_id === filters.managerId;
    });
  }
  if (filters.joiningFrom) items = items.filter((item) => (item.joiningDate ?? "") >= filters.joiningFrom!);
  if (filters.joiningTo) items = items.filter((item) => (item.joiningDate ?? "") <= filters.joiningTo!);
  const sorted = sortItems(items, filters.sort);
  const total = sorted.length;
  const start = (page - 1) * PAGE_SIZE;
  return {
    items: sorted.slice(start, start + PAGE_SIZE),
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getEmployeeRecord(organizationId: string, employeeId: string): Promise<EmployeeRecord | null> {
  if (!hasSupabaseConfig() || isDemoMode()) {
    const store = getDemoStore();
    const employee = store.employees.find((item) => item.id === employeeId && item.organization_id === organizationId);
    if (!employee) return null;
    return {
      employee,
      address: store.employeeAddresses.find((item) => item.employee_id === employeeId) ?? null,
      employment: store.employeeEmployment.find((item) => item.employee_id === employeeId) ?? null,
      statutory: store.employeeStatutory.find((item) => item.employee_id === employeeId) ?? null,
      bank: store.employeeBank.find((item) => item.employee_id === employeeId) ?? null,
      documents: store.employeeDocuments.filter((item) => item.employee_id === employeeId),
      history: store.employeeHistory
        .filter((item) => item.employee_id === employeeId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  }

  const admin = createAdminClient();
  if (!admin) return null;
  const { data: employee } = await admin
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!employee) return null;

  const [address, employment, statutory, bank, documents, history] = await Promise.all([
    admin.from("employee_addresses").select("*").eq("employee_id", employeeId).maybeSingle(),
    admin.from("employee_employment").select("*").eq("employee_id", employeeId).maybeSingle(),
    admin.from("employee_statutory").select("*").eq("employee_id", employeeId).maybeSingle(),
    admin.from("employee_bank_accounts").select("*").eq("employee_id", employeeId).maybeSingle(),
    admin.from("employee_documents").select("*").eq("employee_id", employeeId).order("uploaded_at", { ascending: false }),
    admin.from("employee_history").select("*").eq("employee_id", employeeId).order("created_at", { ascending: false }),
  ]);

  return {
    employee: employee as EmployeeRecord["employee"],
    address: (address.data as EmployeeRecord["address"]) ?? null,
    employment: (employment.data as EmployeeRecord["employment"]) ?? null,
    statutory: (statutory.data as EmployeeRecord["statutory"]) ?? null,
    bank: (bank.data as EmployeeRecord["bank"]) ?? null,
    documents: (documents.data ?? []) as EmployeeRecord["documents"],
    history: (history.data ?? []) as EmployeeRecord["history"],
  };
}
