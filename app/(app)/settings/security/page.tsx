import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSetupComplete } from "@/lib/auth/guards";
import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Security" };

export default async function SecurityPage() {
  const user = await requireSetupComplete();

  let logs: { id: string; action: string; created_at: string; metadata: Record<string, unknown> }[] = [];
  if (!hasSupabaseConfig() || isDemoMode()) {
    logs = getDemoStore().audit.slice(0, 20).map((l) => ({
      id: l.id,
      action: l.action,
      created_at: l.created_at,
      metadata: l.metadata,
    }));
  } else {
    const admin = createAdminClient();
    if (admin) {
      const { data } = await admin
        .from("audit_logs")
        .select("id, action, created_at, metadata")
        .eq("organization_id", user.organization.id)
        .order("created_at", { ascending: false })
        .limit(20);
      logs = data ?? [];
    }
  }

  return (
    <div>
      <PageHeader title="Security" description="Password policy and recent security events." />
      <SettingsSubnav pathname="/settings/security" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Password policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>Minimum 8 characters</p>
            <p>At least one letter, one number and one special character</p>
            <p>Passwords are hashed by Supabase Auth. This app never stores plaintext passwords.</p>
            <p className="text-xs text-slate-500">MFA and SSO placeholders will be added in the production expansion phase.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>Persistent cookies keep you signed in across refresh.</p>
            <p>Remember session extends cookie lifetime to 30 days; otherwise 8 hours.</p>
            <p>Login attempts are rate-limited to 8 per 15 minutes per username and IP.</p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recent audit events</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500">No audit events yet. Sign-in, user changes and settings updates are recorded here.</p>
          ) : (
            <ul className="divide-y text-sm">
              {logs.map((log) => (
                <li key={log.id} className="flex items-center justify-between py-2">
                  <span className="font-medium">{log.action.replaceAll("_", " ")}</span>
                  <span className="text-xs text-slate-500">{formatDateTime(log.created_at, user.organization.timezone)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
