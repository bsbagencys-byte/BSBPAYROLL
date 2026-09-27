import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { BiometricSubnav } from "@/components/biometric/subnav";
import { PunchDirectionBadge } from "@/components/biometric/status-badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadPunchList } from "@/lib/biometric/query";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Punches" };

export default async function PunchesPage() {
  const user = await requirePermissionOrRedirect("biometric.view");
  const punches = await loadPunchList(user.organization.id, 200);

  return (
    <div>
      <PageHeader title="Punches" description="Normalized device punches mapped to employees. Attendance rules are not applied here." />
      <BiometricSubnav />
      {punches.length === 0 ? (
        <EmptyState title="No punches yet" description="Register a device, map identities, then push or simulate an event." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Verify</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {punches.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    {item.employeeName}
                    <div className="text-xs text-slate-500">{item.employeeCode}</div>
                  </td>
                  <td className="px-4 py-3">{item.deviceName}</td>
                  <td className="px-4 py-3">{formatDateTime(item.punchedAt, item.timezone)}</td>
                  <td className="px-4 py-3">
                    <PunchDirectionBadge direction={item.direction} />
                  </td>
                  <td className="px-4 py-3">{item.verificationMode}</td>
                  <td className="px-4 py-3">{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
