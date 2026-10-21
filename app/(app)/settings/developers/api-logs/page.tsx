import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { DeveloperSubnav } from "@/components/developers/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { listApiRequestLogs } from "@/lib/api/keys";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "API logs" };

export default async function ApiLogsPage() {
  const user = await requirePermissionOrRedirect("developers.logs.view");
  const logs = await listApiRequestLogs(user.organization.id, 50);

  return (
    <div>
      <PageHeader title="API logs" description="Request IDs are returned on every /api/v1 response." />
      <SettingsSubnav pathname="/settings/developers" />
      <DeveloperSubnav />
      <Card>
        <CardHeader>
          <CardTitle>Recent requests</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500">No API requests yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {logs.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">
                      {item.method} {item.path} · {item.status_code}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.request_id} · {formatDateTime(item.created_at, user.organization.timezone)}
                      {item.error_code ? ` · ${item.error_code}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
