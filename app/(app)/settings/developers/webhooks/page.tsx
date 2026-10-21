import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { DeveloperSubnav } from "@/components/developers/subnav";
import { WebhookForm } from "@/components/developers/webhook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listWebhookEndpoints } from "@/lib/webhooks/service";
import { toggleWebhookAction } from "@/actions/developers";

export const metadata = { title: "Webhooks" };

export default async function WebhooksPage() {
  const user = await requirePermissionOrRedirect("developers.view");
  const endpoints = await listWebhookEndpoints(user.organization.id);
  const canManage = hasPermission(user, "developers.webhooks.manage");

  return (
    <div>
      <PageHeader title="Webhooks" description="Signed HTTPS callbacks. Secret is shown only at create or rotate. Localhost and private destinations are blocked." />
      <SettingsSubnav pathname="/settings/developers" />
      <DeveloperSubnav />
      {canManage ? <WebhookForm /> : null}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          {endpoints.length === 0 ? (
            <p className="text-sm text-slate-500">No webhooks yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {endpoints.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.url} · hint {item.secret_hint}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="muted">{item.status}</Badge>
                    {canManage ? (
                      <form action={toggleWebhookAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="status" value={item.status === "ACTIVE" ? "DISABLED" : "ACTIVE"} />
                        <Button type="submit" size="sm" variant="outline">
                          {item.status === "ACTIVE" ? "Disable" : "Enable"}
                        </Button>
                      </form>
                    ) : null}
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
