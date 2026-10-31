import { PageHeader } from "@/components/layout/app-shell";
import { LaunchSubnav } from "@/components/launch/subnav";
import { UatBadge } from "@/components/launch/status-badge";
import { UatResultForm } from "@/components/launch/forms";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { UAT_ROLE_LABELS } from "@/lib/constants";
import { loadLaunchControl } from "@/lib/launch/service";

export const metadata = { title: "Pilot UAT" };

export default async function LaunchUatPage() {
  const user = await requirePlatformAdmin();
  const data = await loadLaunchControl(user.id);
  const pilots = new Map(data.pilots.map((pilot) => [pilot.id, pilot.name]));

  return (
    <div>
      <PageHeader
        title="Customer acceptance testing"
        description="Record PASS/FAIL with tester and evidence. Shift/attendance journeys stay BLOCKED until Phase 4. Screenshots are stored as notes, not secrets."
      />
      <LaunchSubnav />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Pilot</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Journey</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Result</th>
            </tr>
          </thead>
          <tbody>
            {data.uat.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3">{pilots.get(row.pilot_id) ?? row.pilot_id.slice(0, 8)}</td>
                <td className="px-4 py-3">{UAT_ROLE_LABELS[row.role_code]}</td>
                <td className="px-4 py-3">{row.journey}</td>
                <td className="px-4 py-3"><UatBadge status={row.status} /></td>
                <td className="px-4 py-3"><UatResultForm itemId={row.id} blocked={row.status === "BLOCKED"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
