import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { CatalogManager } from "@/components/settings/catalog-manager";
import { saveEmploymentTypeAction, toggleEmploymentTypeStatusAction } from "@/actions/org";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadOrgCatalog } from "@/lib/org-data";

export const metadata = { title: "Employment types" };

export default async function EmploymentTypesPage() {
  const user = await requirePermissionOrRedirect("organization.view");
  const catalog = await loadOrgCatalog(user.organization.id);
  const canManage = hasPermission(user, "settings.manage");

  return (
    <div>
      <PageHeader title="Employment types" description="Full time, contract and other engagement types." />
      <SettingsSubnav pathname="/settings/employment-types" />
      <CatalogManager
        title="Employment types"
        itemLabel="Employment type"
        description="Employment type"
        rows={catalog.employmentTypes.map((type) => ({
          id: type.id,
          name: type.name,
          status: type.status,
          isSystem: type.is_system,
          subtitle: type.code ?? undefined,
          values: {
            name: type.name,
            code: type.code ?? "",
          },
        }))}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "code", label: "Code" },
        ]}
        canManage={canManage}
        saveAction={saveEmploymentTypeAction}
        toggleAction={toggleEmploymentTypeStatusAction}
        emptyTitle="No employment types"
        emptyDescription="Add at least one employment type before creating employees."
      />
    </div>
  );
}
