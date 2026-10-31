import { PageHeader } from "@/components/layout/app-shell";
import { LaunchSubnav } from "@/components/launch/subnav";
import { LaunchDecisionBadge, ModuleStatusBadge } from "@/components/launch/status-badge";
import { RecordLaunchDecisionButton } from "@/components/launch/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { RELEASE_GATE_LABELS } from "@/lib/constants";
import { loadLaunchControl } from "@/lib/launch/service";

export const metadata = { title: "Launch control" };

export default async function LaunchPage() {
  const user = await requirePlatformAdmin();
  const data = await loadLaunchControl(user.id);

  return (
    <div>
      <PageHeader
        title="Pilot launch control"
        description="SUPER_ADMIN only. Decision is computed from stored evidence. This environment has not physically verified hardware or independently verified statutory rates."
        actions={<RecordLaunchDecisionButton />}
      />
      <LaunchSubnav />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Launch decision</CardTitle></CardHeader>
          <CardContent>
            <LaunchDecisionBadge decision={data.verdict.decision} />
            <p className="mt-2 text-sm text-slate-600">{data.verdict.summary}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Environment</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{data.demoMode ? "Demo / unconfigured" : "Live config present"}</p>
            <p className="text-xs text-slate-500">{data.stagingOk ? "Staging URL is distinct from production URL or unset." : "Staging URL matches production URL."}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Failed gates</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{data.verdict.failedGates.length}</p></CardContent>
        </Card>
      </div>
      <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Gate</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {data.gates.map((gate) => (
              <tr key={gate.gate_key} className="border-b last:border-0">
                <td className="px-4 py-3">{RELEASE_GATE_LABELS[gate.gate_key]}</td>
                <td className="px-4 py-3">{gate.passing ? "Pass" : "Fail"}</td>
                <td className="px-4 py-3 text-slate-600">{gate.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {data.modules.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{row.label}</td>
                <td className="px-4 py-3"><ModuleStatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-slate-600">
                  {row.evidence}
                  {row.notes ? <p className="text-xs text-amber-700">{row.notes}</p> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
