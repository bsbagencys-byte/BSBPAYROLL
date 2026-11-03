import { PageHeader } from "@/components/layout/app-shell";
import { SmartSettingsForm } from "@/components/smart-attendance/forms";
import { SmartAttendanceSubnav } from "@/components/smart-attendance/subnav";
import { Alert } from "@/components/ui/alert";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadSmartDashboard } from "@/lib/smart-attendance/service";

export const metadata = { title: "Smart attendance settings" };

export default async function SmartSettingsPage() {
  const user = await requirePermissionOrRedirect("attendance.smart.view");
  const data = await loadSmartDashboard(user.organization.id);
  const canManage = hasPermission(user, "attendance.smart.manage");

  return (
    <div>
      <PageHeader
        title="Smart attendance settings"
        description="Organization-controlled geofence, trusted devices, QR fallback and auto-accept. Face matching is not implemented."
      />
      <SmartAttendanceSubnav />
      {!canManage ? (
        <Alert variant="info">You can view settings. HR or Admin can change them.</Alert>
      ) : (
        <SmartSettingsForm settings={data.settings} />
      )}
    </div>
  );
}
