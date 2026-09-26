import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { CatalogManager } from "@/components/settings/catalog-manager";
import { saveBranchAction, toggleBranchStatusAction } from "@/actions/org";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadOrgCatalog } from "@/lib/org-data";

export const metadata = { title: "Branches" };

export default async function BranchesPage() {
  const user = await requirePermissionOrRedirect("organization.view");
  const catalog = await loadOrgCatalog(user.organization.id);
  const canManage = hasPermission(user, "organization.branch.manage") || hasPermission(user, "settings.manage");

  return (
    <div>
      <PageHeader title="Branches" description="Office locations used when assigning employees." />
      <SettingsSubnav pathname="/settings/branches" />
      <CatalogManager
        title="Branches"
        itemLabel="Branch"
        description="Branch"
        rows={catalog.branches.map((branch) => ({
          id: branch.id,
          name: branch.name,
          status: branch.status,
          isDefault: branch.is_default,
          subtitle: [branch.city, branch.state, branch.phone].filter(Boolean).join(" · ") || branch.address || undefined,
          values: {
            name: branch.name,
            code: branch.code ?? "",
            address: branch.address ?? "",
            city: branch.city ?? "",
            state: branch.state ?? "",
            pin: branch.pin ?? "",
            phone: branch.phone ?? "",
            email: branch.email ?? "",
          },
        }))}
        fields={[
          { name: "name", label: "Branch name", required: true },
          { name: "code", label: "Code" },
          { name: "address", label: "Address", type: "textarea" },
          { name: "city", label: "City" },
          { name: "state", label: "State" },
          { name: "pin", label: "PIN" },
          { name: "phone", label: "Phone" },
          { name: "email", label: "Email" },
        ]}
        canManage={canManage}
        saveAction={saveBranchAction}
        toggleAction={toggleBranchStatusAction}
        emptyTitle="No branches yet"
        emptyDescription="Add a branch before assigning employees."
      />
    </div>
  );
}
