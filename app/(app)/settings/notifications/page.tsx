import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { NotificationSettingsSubnav } from "@/components/notifications/subnav";
import { PreferenceForm } from "@/components/notifications/preference-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadPreferences, getEmailProviderStatus } from "@/lib/notifications/service";
import { AUTOMATION_EVENT_TYPES, AUTOMATION_EVENT_TYPE_LABELS } from "@/lib/constants";

export const metadata = { title: "Notification preferences" };

export default async function NotificationPreferencesPage() {
  const user = await requirePermissionOrRedirect("notifications.view");
  const [prefs, email] = await Promise.all([
    loadPreferences(user.organization.id, user.id),
    Promise.resolve(getEmailProviderStatus()),
  ]);

  return (
    <div>
      <PageHeader title="Notifications" description="Choose in-app and email delivery per event. Email is off unless you opt in and SMTP is configured." />
      <SettingsSubnav pathname="/settings/notifications" />
      <NotificationSettingsSubnav />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Email provider</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          {email.configured ? (
            <p>SMTP is configured ({email.host}). Messages still fail if the provider rejects them.</p>
          ) : (
            <p>Email is unconfigured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM. Unconfigured delivery is recorded as failure, not success. WhatsApp and SMS are not implemented.</p>
          )}
        </CardContent>
      </Card>
      <div className="space-y-3">
        {AUTOMATION_EVENT_TYPES.map((eventType) => {
          const pref = prefs.find((item) => item.event_type === eventType);
          return (
            <PreferenceForm
              key={eventType}
              eventType={eventType}
              label={AUTOMATION_EVENT_TYPE_LABELS[eventType]}
              inApp={pref ? pref.in_app : true}
              email={pref ? pref.email : false}
            />
          );
        })}
      </div>
    </div>
  );
}
