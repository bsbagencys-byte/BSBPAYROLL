import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { CatalogManager } from "@/components/settings/catalog-manager";
import { saveLocationAction, toggleLocationStatusAction } from "@/actions/org";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadOrgCatalog } from "@/lib/org-data";
import { lookupName } from "@/lib/utils";

export const metadata = { title: "Locations" };

export default async function LocationsPage() {
  const user = await requirePermissionOrRedirect("organization.view");
  const catalog = await loadOrgCatalog(user.organization.id);
  const canManage = hasPermission(user, "settings.manage");

  return (
    <div>
      <PageHeader title="Work locations" description="Physical sites that can be linked to a branch." />
      <SettingsSubnav pathname="/settings/locations" />
      <CatalogManager
        title="Locations"
        itemLabel="Location"
        description="Location"
        rows={catalog.locations.map((location) => ({
          id: location.id,
          name: location.name,
          status: location.status,
          subtitle: [lookupName(catalog.branches, location.branch_id), location.address].filter(Boolean).join(" · ") || undefined,
          values: {
            name: location.name,
            address: location.address ?? "",
            branchId: location.branch_id ?? "",
          },
        }))}
        fields={[
          { name: "name", label: "Location name", required: true },
          { name: "address", label: "Address", type: "textarea" },
          {
            name: "branchId",
            label: "Branch",
            type: "select",
            placeholder: "No branch",
            options: catalog.branches.map((branch) => ({ value: branch.id, label: branch.name })),
          },
        ]}
        canManage={canManage}
        saveAction={saveLocationAction}
        toggleAction={toggleLocationStatusAction}
        emptyTitle="No locations yet"
        emptyDescription="Add a work location if employees sit at a specific site."
      />
    </div>
  );
}
