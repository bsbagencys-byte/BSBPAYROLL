import { PageHeader } from "@/components/layout/app-shell";
import { BiometricSubnav } from "@/components/biometric/subnav";
import { SimulatorForm } from "@/components/biometric/simulator-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { listDevices } from "@/lib/biometric/repository";
import { DEMO_ESSL_DEVICE_TOKEN } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Simulator" };

export default async function SimulatorPage() {
  const user = await requirePermissionOrRedirect("biometric.manage");
  const devices = await listDevices(user.organization.id);

  return (
    <div className="space-y-4">
      <PageHeader title="Simulator" description="Uses the real Device to Punch pipeline. No attendance or payroll is calculated." />
      <BiometricSubnav />
      <SimulatorForm devices={devices} />
      <Card>
        <CardHeader>
          <CardTitle>Demo eSSL push</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            Demo device token: <span className="font-mono">{DEMO_ESSL_DEVICE_TOKEN}</span>
          </p>
          <p>
            POST <span className="font-mono">/api/biometric/push</span> with header <span className="font-mono">x-device-token</span>.
          </p>
          <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
{`{
  "PIN": "1001",
  "DateTime": "2026-09-27 09:15:00",
  "Status": "IN",
  "Verified": "FINGER",
  "SN": "ESSL-HO-001"
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
