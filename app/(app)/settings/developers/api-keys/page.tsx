import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { DeveloperSubnav } from "@/components/developers/subnav";
import { ApiKeyForm } from "@/components/developers/api-key-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listApiKeys } from "@/lib/api/keys";
import { revokeApiKeyAction } from "@/actions/developers";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "API keys" };

export default async function ApiKeysPage() {
  const user = await requirePermissionOrRedirect("developers.view");
  const keys = await listApiKeys(user.organization.id);
  const canManage = hasPermission(user, "developers.api_keys.manage");

  return (
    <div>
      <PageHeader title="API keys" description="Hashed org-scoped keys. The plaintext secret is shown only at create or rotate. Keys cannot write payroll or bypass approvals." />
      <SettingsSubnav pathname="/settings/developers" />
      <DeveloperSubnav />
      {canManage ? <ApiKeyForm /> : null}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-slate-500">No API keys yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {keys.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.key_prefix}… · {item.scopes_json} · last used{" "}
                      {item.last_used_at ? formatDateTime(item.last_used_at, user.organization.timezone) : "never"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="muted">{item.status}</Badge>
                    {canManage && item.status === "ACTIVE" ? (
                      <form action={revokeApiKeyAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Revoke
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
