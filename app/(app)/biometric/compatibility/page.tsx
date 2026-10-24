import { PageHeader } from "@/components/layout/app-shell";
import { BiometricSubnav } from "@/components/biometric/subnav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { listCompatibilityRegistry } from "@/lib/analytics/repository";
import { BIOMETRIC_VENDOR_LABELS, BIOMETRIC_VERIFICATION_STATUS_LABELS, type BiometricVendor, type BiometricVerificationStatus } from "@/lib/constants";

export const metadata = { title: "Biometric compatibility" };

const statusVariant: Record<BiometricVerificationStatus, "success" | "warning" | "muted" | "danger"> = {
  VERIFIED_IN_DEMO: "success",
  PROTOCOL_FOUNDATION: "warning",
  UNVERIFIED_HARDWARE: "muted",
  UNSUPPORTED: "danger",
};

export default async function BiometricCompatibilityPage() {
  const user = await requirePermissionOrRedirect("biometric.view");
  const rows = await listCompatibilityRegistry(user.organization.id);

  return (
    <div>
      <PageHeader
        title="Vendor compatibility"
        description="Adapters exist only where a documented protocol is implemented. Physical hardware is not marked complete unless verified in demo."
      />
      <BiometricSubnav />
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((row) => {
          const vendor = row.vendor as BiometricVendor;
          const status = row.verification_status;
          const capabilities = (() => {
            try {
              return JSON.parse(row.capabilities_json) as string[];
            } catch {
              return [];
            }
          })();
          return (
            <Card key={row.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span>{BIOMETRIC_VENDOR_LABELS[vendor] ?? row.vendor}</span>
                  <Badge variant={statusVariant[status]}>{BIOMETRIC_VERIFICATION_STATUS_LABELS[status]}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                <p>{row.model}</p>
                <p>Method: {row.integration_method} · Adapter: {row.adapter_key}</p>
                {capabilities.length ? <p>Capabilities: {capabilities.join(", ")}</p> : null}
                {row.known_limitations ? <p className="text-xs text-slate-500">{row.known_limitations}</p> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
