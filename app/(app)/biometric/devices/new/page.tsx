import { PageHeader } from "@/components/layout/app-shell";
import { BiometricSubnav } from "@/components/biometric/subnav";
import { DeviceForm } from "@/components/biometric/device-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadOrgCatalog } from "@/lib/org-data";

export const metadata = { title: "Register device" };

export default async function NewDevicePage() {
  const user = await requirePermissionOrRedirect("biometric.manage");
  const catalog = await loadOrgCatalog(user.organization.id);
  return (
    <div>
      <PageHeader
        title="Register device"
        description="A new vendor is a new adapter. eSSL is included first; generic JSON is also available."
      />
      <BiometricSubnav />
      <DeviceForm
        branches={catalog.branches}
        locations={catalog.locations}
        defaultTimezone={user.organization.timezone}
      />
    </div>
  );
}
