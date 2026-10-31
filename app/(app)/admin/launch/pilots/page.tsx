import { PageHeader } from "@/components/layout/app-shell";
import { LaunchSubnav } from "@/components/launch/subnav";
import { PilotStatusBadge } from "@/components/launch/status-badge";
import { ChecklistToggleForm, SignOffPilotForm } from "@/components/launch/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { PILOT_ORG_KIND_LABELS } from "@/lib/constants";
import { listPilotChecklist, loadLaunchControl } from "@/lib/launch/service";

export const metadata = { title: "Pilot organizations" };

export default async function LaunchPilotsPage() {
  const user = await requirePlatformAdmin();
  const data = await loadLaunchControl(user.id);
  const checklists = await Promise.all(data.pilots.map(async (pilot) => ({
    pilot,
    items: await listPilotChecklist(pilot.id),
  })));

  return (
    <div>
      <PageHeader
        title="Isolated pilot organizations"
        description="Templates are organization-specific. Do not mix employees, punches or payroll between pilots. Shifts stay optional until Phase 4."
      />
      <LaunchSubnav />
      <div className="grid gap-6">
        {checklists.map(({ pilot, items }) => (
          <Card key={pilot.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span>{pilot.name} · {pilot.code}</span>
                <PilotStatusBadge status={pilot.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">{PILOT_ORG_KIND_LABELS[pilot.kind]}. {pilot.notes}</p>
              <p className="text-xs text-slate-500">Linked organization: {pilot.organization_id ?? "not linked (template only)"}</p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Step</th>
                      <th className="px-3 py-2">Required</th>
                      <th className="px-3 py-2">Complete</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-3 py-2">{item.label}</td>
                        <td className="px-3 py-2">{item.required ? "Yes" : "Optional"}</td>
                        <td className="px-3 py-2">{item.complete ? "Yes" : "No"}</td>
                        <td className="px-3 py-2"><ChecklistToggleForm itemId={item.id} complete={item.complete} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <SignOffPilotForm pilotId={pilot.id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
