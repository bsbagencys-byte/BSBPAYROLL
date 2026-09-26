import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Branch, Department, Designation, Employee, EmploymentType, Location } from "@/types";

export async function loadOrgCatalog(organizationId: string) {
  if (!hasSupabaseConfig() || isDemoMode()) {
    const store = getDemoStore();
    return {
      branches: store.branches,
      departments: store.departments,
      designations: store.designations,
      locations: store.locations,
      employmentTypes: store.employmentTypes,
      employees: store.employees,
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      branches: [] as Branch[],
      departments: [] as Department[],
      designations: [] as Designation[],
      locations: [] as Location[],
      employmentTypes: [] as EmploymentType[],
      employees: [] as Employee[],
    };
  }

  const [branches, departments, designations, locations, employmentTypes, employees] = await Promise.all([
    admin.from("branches").select("*").eq("organization_id", organizationId).order("name"),
    admin.from("departments").select("*").eq("organization_id", organizationId).order("name"),
    admin.from("designations").select("*").eq("organization_id", organizationId).order("name"),
    admin.from("locations").select("*").eq("organization_id", organizationId).order("name"),
    admin.from("employment_types").select("*").eq("organization_id", organizationId).order("name"),
    admin.from("employees").select("*").eq("organization_id", organizationId).order("display_name"),
  ]);

  return {
    branches: (branches.data ?? []) as Branch[],
    departments: (departments.data ?? []) as Department[],
    designations: (designations.data ?? []) as Designation[],
    locations: (locations.data ?? []) as Location[],
    employmentTypes: (employmentTypes.data ?? []) as EmploymentType[],
    employees: (employees.data ?? []) as Employee[],
  };
}
