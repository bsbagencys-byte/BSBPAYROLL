import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { NotificationSettingsSubnav } from "@/components/notifications/subnav";
import { TemplateForm } from "@/components/notifications/template-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadTemplates } from "@/lib/notifications/service";
import { seedTemplatesAction } from "@/actions/notifications";
import { AUTOMATION_EVENT_TYPE_LABELS, type AutomationEventType } from "@/lib/constants";

export const metadata = { title: "Notification templates" };

export default async function NotificationTemplatesPage() {
  const user = await requirePermissionOrRedirect("notifications.manage");
  const templates = await loadTemplates(user.organization.id);
  const canManage = hasPermission(user, "notifications.manage");

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Allowed variables only. Unknown tokens are rejected. Preview uses placeholders, not live payroll data."
        actions={
          canManage ? (
            <form action={seedTemplatesAction}>
              <Button type="submit" variant="outline">
                Add defaults
              </Button>
            </form>
          ) : null
        }
      />
      <SettingsSubnav pathname="/settings/notifications" />
      <NotificationSettingsSubnav />
      {canManage ? <TemplateForm /> : null}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Existing templates</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-slate-500">No templates yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {templates.map((item) => (
                <li key={item.id} className="py-3">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.key} · {AUTOMATION_EVENT_TYPE_LABELS[item.event_type as AutomationEventType] ?? item.event_type} · {item.channel}
                  </p>
                  <p className="mt-1 text-slate-600">{item.subject}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
