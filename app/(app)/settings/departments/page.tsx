import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { CatalogManager } from "@/components/settings/catalog-manager";
import { saveDepartmentAction, toggleDepartmentStatusAction } from "@/actions/org";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadOrgCatalog } from "@/lib/org-data";
import { lookupName } from "@/lib/utils";

export const metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const user = await requirePermissionOrRedirect("organization.view");
  const catalog = await loadOrgCatalog(user.organization.id);
  const canManage = hasPermission(user, "organization.department.manage") || hasPermission(user, "settings.manage");

  return (
    <div>
      <PageHeader title="Departments" description="Teams and functions used on employee records." />
      <SettingsSubnav pathname="/settings/departments" />
      <CatalogManager
        title="Departments"
        itemLabel="Department"
        description="Department"
        rows={catalog.departments.map((department) => ({
          id: department.id,
          name: department.name,
          status: department.status,
          isDefault: department.is_default,
          subtitle: lookupName(catalog.employees, department.manager_employee_id) ?? undefined,
          values: {
            name: department.name,
            code: department.code ?? "",
            managerEmployeeId: department.manager_employee_id ?? "",
          },
        }))}
        fields={[
          { name: "name", label: "Department name", required: true },
          { name: "code", label: "Code" },
          {
            name: "managerEmployeeId",
            label: "Department manager",
            type: "select",
            placeholder: "No manager",
            options: catalog.employees.map((employee) => ({ value: employee.id, label: employee.display_name })),
          },
        ]}
        canManage={canManage}
        saveAction={saveDepartmentAction}
        toggleAction={toggleDepartmentStatusAction}
        emptyTitle="No departments yet"
        emptyDescription="Add a department to organise employees."
      />
    </div>
  );
}
