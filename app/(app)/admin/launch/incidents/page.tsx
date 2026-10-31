import { PageHeader } from "@/components/layout/app-shell";
import { LaunchSubnav } from "@/components/launch/subnav";
import { BlockerSeverityBadge, IncidentBadge } from "@/components/launch/status-badge";
import { CreateIncidentForm, ResolveIncidentForm } from "@/components/launch/forms";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { loadLaunchControl } from "@/lib/launch/service";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Incidents" };

export default async function LaunchIncidentsPage() {
  const user = await requirePlatformAdmin();
  const data = await loadLaunchControl(user.id);

  return (
    <div>
      <PageHeader
        title="Incident log"
        description="Severity, affected organization id, start/end, resolution and impact. Passwords, secrets and complete bank details are redacted."
      />
      <LaunchSubnav />
      <div className="mb-6">
        <CreateIncidentForm />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Incident</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Resolution</th>
            </tr>
          </thead>
          <tbody>
            {data.incidents.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No incidents recorded.</td></tr>
            ) : data.incidents.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{row.incident_number}</p>
                  <p className="text-xs text-slate-500">{row.title}</p>
                  <p className="text-xs text-slate-500">{row.impact}</p>
                </td>
                <td className="px-4 py-3"><BlockerSeverityBadge severity={row.severity} /></td>
                <td className="px-4 py-3"><IncidentBadge status={row.status} /></td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(row.started_at)}</td>
                <td className="px-4 py-3">{row.status === "OPEN" || row.status === "MITIGATING" ? <ResolveIncidentForm incidentId={row.id} /> : row.resolution}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
