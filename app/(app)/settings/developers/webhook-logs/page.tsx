import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { DeveloperSubnav } from "@/components/developers/subnav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listWebhookAttempts } from "@/lib/webhooks/service";
import { replayWebhookAction } from "@/actions/developers";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Webhook logs" };

export default async function WebhookLogsPage() {
  const user = await requirePermissionOrRedirect("developers.logs.view");
  const attempts = await listWebhookAttempts(user.organization.id, 50);
  const canReplay = hasPermission(user, "developers.webhooks.replay");

  return (
    <div>
      <PageHeader title="Webhook logs" description="Failed deliveries are not marked successful. Replay re-queues the attempt." />
      <SettingsSubnav pathname="/settings/developers" />
      <DeveloperSubnav />
      <Card>
        <CardHeader>
          <CardTitle>Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-sm text-slate-500">No deliveries yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {attempts.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{item.status}{item.http_status ? ` · HTTP ${item.http_status}` : ""}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(item.created_at, user.organization.timezone)}
                      {item.error_message ? ` · ${item.error_message}` : ""}
                    </p>
                  </div>
                  {canReplay && item.status !== "DELIVERED" ? (
                    <form action={replayWebhookAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Replay
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
