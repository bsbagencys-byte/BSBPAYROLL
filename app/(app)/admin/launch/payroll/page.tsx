import { PageHeader } from "@/components/layout/app-shell";
import { LaunchSubnav } from "@/components/launch/subnav";
import { ParallelRunBadge } from "@/components/launch/status-badge";
import { ParallelCompareForm } from "@/components/launch/forms";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { loadLaunchControl } from "@/lib/launch/service";

export const metadata = { title: "Parallel payroll" };

export default async function LaunchPayrollPage() {
  const user = await requirePlatformAdmin();
  const data = await loadLaunchControl(user.id);
  const pilots = new Map(data.pilots.map((pilot) => [pilot.id, pilot.name]));

  return (
    <div>
      <PageHeader
        title="Payroll parallel run"
        description="Compare BSB calculations against independently verified records. Do not automatically finalize or pay a pilot payroll. Statutory formulas still require qualified review."
      />
      <LaunchSubnav />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Pilot</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Expected</th>
              <th className="px-4 py-3">Calculated</th>
              <th className="px-4 py-3">Compare</th>
            </tr>
          </thead>
          <tbody>
            {data.parallelRuns.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3">{pilots.get(row.pilot_id) ?? row.pilot_id.slice(0, 8)}</td>
                <td className="px-4 py-3">{row.period_label}</td>
                <td className="px-4 py-3"><ParallelRunBadge status={row.status} /></td>
                <td className="px-4 py-3">{row.expected_net ?? "—"}</td>
                <td className="px-4 py-3">{row.calculated_net ?? "—"}</td>
                <td className="px-4 py-3"><ParallelCompareForm runId={row.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
