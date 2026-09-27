import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { BiometricSubnav } from "@/components/biometric/subnav";
import { EventStatusBadge } from "@/components/biometric/status-badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadLogList } from "@/lib/biometric/query";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Ingest logs" };

export default async function BiometricLogsPage() {
  const user = await requirePermissionOrRedirect("biometric.view");
  const logs = await loadLogList(user.organization.id);

  return (
    <div>
      <PageHeader title="Ingest logs" description="Raw payloads received by the cloud gateway. Payloads are stored for replay, not shown in full here." />
      <BiometricSubnav />
      {logs.length === 0 ? (
        <EmptyState title="No ingest logs" description="Push, webhook or simulator traffic will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{formatDateTime(item.receivedAt, user.organization.timezone)}</td>
                  <td className="px-4 py-3">{item.deviceName ?? "—"}</td>
                  <td className="px-4 py-3">{item.vendor ?? "—"}</td>
                  <td className="px-4 py-3">{item.source}</td>
                  <td className="px-4 py-3">
                    <EventStatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.errorMessage ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
