import { PageHeader } from "@/components/layout/app-shell";
import { ComplianceSubnav } from "@/components/compliance/subnav";
import { OrgStatutorySettingsForm } from "@/components/compliance/settings-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { defaultOrgStatutorySettings } from "@/lib/statutory/engine";
import { getOrgStatutorySettings } from "@/lib/statutory/repository";

export const metadata = { title: "Compliance settings" };

export default async function ComplianceSettingsPage() {
  const user = await requirePermissionOrRedirect("compliance.view");
  const settings = (await getOrgStatutorySettings(user.organization.id)) ?? defaultOrgStatutorySettings(user.organization.id, new Date().toISOString());
  const canManage = hasPermission(user, "compliance.manage");

  return (
    <div>
      <PageHeader title="Settings" description="Enable PF, ESI, PT, LWF and TDS for this organization. LWF and TDS default off." />
      <ComplianceSubnav />
      {canManage ? (
        <OrgStatutorySettingsForm settings={settings} />
      ) : (
        <p className="text-sm text-slate-500">You have view-only access to compliance settings.</p>
      )}
    </div>
  );
}
