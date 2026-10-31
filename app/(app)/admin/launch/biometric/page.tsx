import { PageHeader } from "@/components/layout/app-shell";
import { LaunchSubnav } from "@/components/launch/subnav";
import { ModuleStatusBadge } from "@/components/launch/status-badge";
import { BiometricRecordForm } from "@/components/launch/forms";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { BIOMETRIC_TEST_METHOD_LABELS } from "@/lib/constants";
import { loadLaunchControl } from "@/lib/launch/service";

export const metadata = { title: "Biometric verification" };

export default async function LaunchBiometricPage() {
  const user = await requirePlatformAdmin();
  const data = await loadLaunchControl(user.id);

  return (
    <div>
      <PageHeader
        title="Biometric hardware verification matrix"
        description="SIMULATED, SDK TESTED, API TESTED and PHYSICAL DEVICE VERIFIED are distinct. Untested models are not claimed as compatible."
      />
      <LaunchSubnav />
      <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Advertised</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.biometric.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3">{row.vendor}</td>
                <td className="px-4 py-3">{row.model}</td>
                <td className="px-4 py-3">{BIOMETRIC_TEST_METHOD_LABELS[row.method]}</td>
                <td className="px-4 py-3">{row.advertised ? "Yes" : "No"}</td>
                <td className="px-4 py-3"><ModuleStatusBadge status={row.result} /></td>
                <td className="px-4 py-3 text-slate-600">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <BiometricRecordForm />
    </div>
  );
}
