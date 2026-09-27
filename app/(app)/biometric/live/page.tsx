import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { BiometricSubnav } from "@/components/biometric/subnav";
import { LiveRefresh } from "@/components/biometric/live-refresh";
import { PunchDirectionBadge } from "@/components/biometric/status-badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadPunchList } from "@/lib/biometric/query";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Live punches" };

export default async function LivePunchesPage() {
  const user = await requirePermissionOrRedirect("biometric.view");
  const punches = await loadPunchList(user.organization.id, 20);

  return (
    <div>
      <LiveRefresh />
      <PageHeader title="Live punches" description="Latest mapped punches. This screen polls every 5 seconds." />
      <BiometricSubnav />
      {punches.length === 0 ? (
        <EmptyState title="Waiting for punches" description="Use the simulator or a live device push." />
      ) : (
        <div className="space-y-3">
          {punches.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="font-medium">{item.employeeName}</p>
                <p className="text-xs text-slate-500">
                  {item.deviceName} · {formatDateTime(item.punchedAt, item.timezone)}
                </p>
              </div>
              <PunchDirectionBadge direction={item.direction} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
