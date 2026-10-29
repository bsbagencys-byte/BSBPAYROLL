import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { DataExportSubnav } from "@/components/onboarding/subnav";
import { OffboardingBadge } from "@/components/onboarding/status-badge";
import { ConfirmOffboardingForm, OffboardingForm } from "@/components/onboarding/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listOffboardingRequests } from "@/lib/onboarding/service";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Offboarding" };

export default async function OffboardingPage() {
  const user = await requirePermissionOrRedirect("data.export");
  const canOffboard = hasPermission(user, "data.offboard") && user.roleCode === "SUPER_ADMIN";
  const rows = await listOffboardingRequests(user.organization.id);

  return (
    <div>
      <PageHeader
        title="Organization offboarding"
        description="Confirm records offboarding and preserves history. Nothing is auto-deleted when an export expires."
      />
      <SettingsSubnav pathname="/settings/data-export" />
      <DataExportSubnav />
      {canOffboard ? <OffboardingForm /> : (
        <p className="mb-6 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          Offboarding confirm is platform-only. Organization users can still request a full export from the Exports tab.
        </p>
      )}
      <div className="mt-6 space-y-4">
        {rows.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-slate-500">No offboarding requests.</CardContent>
          </Card>
        ) : rows.map((row) => (
          <Card key={row.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{row.reason}</span>
                <OffboardingBadge status={row.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>Requested {formatDateTime(row.created_at)}</p>
              {canOffboard && row.status !== "COMPLETED" && row.status !== "CANCELLED" ? (
                <ConfirmOffboardingForm requestId={row.id} />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
