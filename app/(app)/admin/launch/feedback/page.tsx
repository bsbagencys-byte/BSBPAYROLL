import { PageHeader } from "@/components/layout/app-shell";
import { LaunchSubnav } from "@/components/launch/subnav";
import { BlockerSeverityBadge, FeedbackKindBadge, FeedbackStatusBadge } from "@/components/launch/status-badge";
import { CreateFeedbackForm } from "@/components/launch/forms";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { loadLaunchControl } from "@/lib/launch/service";

export const metadata = { title: "Pilot feedback" };

export default async function LaunchFeedbackPage() {
  const user = await requirePlatformAdmin();
  const data = await loadLaunchControl(user.id);

  return (
    <div>
      <PageHeader
        title="Pilot feedback"
        description="Defects are separated from feature requests. Critical payroll, biometric and security defects are promoted into the blocker register."
      />
      <LaunchSubnav />
      <div className="mb-6">
        <CreateFeedbackForm pilots={data.pilots.map((pilot) => ({ id: pilot.id, name: `${pilot.name} (${pilot.code})` }))} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Summary</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.feedback.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No feedback recorded.</td></tr>
            ) : data.feedback.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{row.summary}</p>
                  <p className="text-xs text-slate-500">{row.reproduction}</p>
                </td>
                <td className="px-4 py-3"><FeedbackKindBadge kind={row.kind} /></td>
                <td className="px-4 py-3">{row.module_key}</td>
                <td className="px-4 py-3"><BlockerSeverityBadge severity={row.severity} /></td>
                <td className="px-4 py-3"><FeedbackStatusBadge status={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
