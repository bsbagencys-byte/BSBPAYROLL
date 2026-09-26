import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { CatalogManager } from "@/components/settings/catalog-manager";
import { saveDesignationAction, toggleDesignationStatusAction } from "@/actions/org";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadOrgCatalog } from "@/lib/org-data";
import { lookupName } from "@/lib/utils";

export const metadata = { title: "Designations" };

export default async function DesignationsPage() {
  const user = await requirePermissionOrRedirect("organization.view");
  const catalog = await loadOrgCatalog(user.organization.id);
  const canManage = hasPermission(user, "organization.designation.manage") || hasPermission(user, "settings.manage");

  return (
    <div>
      <PageHeader title="Designations" description="Job titles that can be linked to a department." />
      <SettingsSubnav pathname="/settings/designations" />
      <CatalogManager
        title="Designations"
        itemLabel="Designation"
        description="Designation"
        rows={catalog.designations.map((designation) => ({
          id: designation.id,
          name: designation.name,
          status: designation.status,
          isDefault: designation.is_default,
          subtitle: lookupName(catalog.departments, designation.department_id) ?? undefined,
          values: {
            name: designation.name,
            code: designation.code ?? "",
            departmentId: designation.department_id ?? "",
          },
        }))}
        fields={[
          { name: "name", label: "Designation name", required: true },
          { name: "code", label: "Code" },
          {
            name: "departmentId",
            label: "Department",
            type: "select",
            placeholder: "Any department",
            options: catalog.departments.map((department) => ({ value: department.id, label: department.name })),
          },
        ]}
        canManage={canManage}
        saveAction={saveDesignationAction}
        toggleAction={toggleDesignationStatusAction}
        emptyTitle="No designations yet"
        emptyDescription="Add a designation before assigning job titles."
      />
    </div>
  );
}
