import { PageHeader } from "@/components/layout/app-shell";
import { LaunchSubnav } from "@/components/launch/subnav";
import { BlockerSeverityBadge, BlockerStatusBadge } from "@/components/launch/status-badge";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { loadLaunchControl } from "@/lib/launch/service";

export const metadata = { title: "Release blockers" };

export default async function LaunchBlockersPage() {
  const user = await requirePlatformAdmin();
  const data = await loadLaunchControl(user.id);

  return (
    <div>
      <PageHeader title="Release blocker register" description="Critical payroll, biometric and security issues stay ahead of cosmetic work." />
      <LaunchSubnav />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Blocker</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Required fix</th>
            </tr>
          </thead>
          <tbody>
            {data.blockers.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{row.title}</p>
                  <p className="text-xs text-slate-500">{row.evidence}</p>
                </td>
                <td className="px-4 py-3">{row.module_key}</td>
                <td className="px-4 py-3"><BlockerSeverityBadge severity={row.severity} /></td>
                <td className="px-4 py-3"><BlockerStatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-slate-600">{row.required_fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
