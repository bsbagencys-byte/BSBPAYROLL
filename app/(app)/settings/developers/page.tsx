import Link from "next/link";
import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { DeveloperSubnav } from "@/components/developers/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { listWebhookEndpoints, listWebhookAttempts } from "@/lib/webhooks/service";
import { listApiKeys, listApiRequestLogs } from "@/lib/api/keys";

export const metadata = { title: "Developers" };

export default async function DevelopersPage() {
  const user = await requirePermissionOrRedirect("developers.view");
  const [hooks, attempts, keys, logs] = await Promise.all([
    listWebhookEndpoints(user.organization.id),
    listWebhookAttempts(user.organization.id, 5),
    listApiKeys(user.organization.id),
    listApiRequestLogs(user.organization.id, 5),
  ]);

  return (
    <div>
      <PageHeader
        title="Developers"
        description="Org-scoped API keys and signed webhooks. Secrets are hashed. Employees cannot see this screen. Keys cannot bypass RLS, approvals or finalized payroll."
      />
      <SettingsSubnav pathname="/settings/developers" />
      <DeveloperSubnav />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="Webhooks" value={hooks.length} href="/settings/developers/webhooks" />
        <Stat title="API keys" value={keys.filter((item) => item.status === "ACTIVE").length} href="/settings/developers/api-keys" />
        <Stat title="Webhook attempts" value={attempts.length} href="/settings/developers/webhook-logs" />
        <Stat title="API logs" value={logs.length} href="/settings/developers/api-logs" />
      </div>
      <p className="mt-6 text-sm text-slate-600">
        Production webhooks require HTTPS. Localhost, private and metadata IPs are blocked. HMAC signatures use timestamp plus event id. Failed deliveries retry with backoff and are never marked successful.
      </p>
    </div>
  );
}

function Stat({ title, value, href }: { title: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
