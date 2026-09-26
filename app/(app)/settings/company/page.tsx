import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { CompanySettingsForm } from "@/components/settings/company-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";

export const metadata = { title: "Company settings" };

export default async function CompanySettingsPage() {
  const user = await requirePermissionOrRedirect("organization.view");

  return (
    <div>
      <PageHeader title="Company settings" description="Organization profile and business defaults." />
      <SettingsSubnav pathname="/settings/company" />
      <CompanySettingsForm organization={user.organization} canEdit={hasPermission(user, "organization.edit")} />
    </div>
  );
}
