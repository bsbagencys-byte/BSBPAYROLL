import Link from "next/link";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/actions/ess";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadSelfNotifications } from "@/lib/ess/query";
import { ESS_NOTIFICATION_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "My notifications" };

export default async function MyNotificationsPage() {
  const user = await requirePermissionOrRedirect("self.view");
  const notifications = await loadSelfNotifications(user.organization.id, user.id);
  const unread = notifications.filter((item) => !item.read_at);

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="In-app notifications for approvals, actions and alerts. Delivery is in-app only."
        actions={
          unread.length > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <Button type="submit" variant="outline">
                Mark all read
              </Button>
            </form>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {unread.length > 0 ? `${unread.length} unread` : "All caught up"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border p-3 ${item.read_at ? "border-slate-200" : "border-brand-200 bg-brand-50/40"}`}
                >
                  <div className="flex items-start gap-3">
                    <Bell className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        <Badge variant="muted">{ESS_NOTIFICATION_TYPE_LABELS[item.type]}</Badge>
                      </div>
                      {item.body ? <p className="mt-1 text-sm text-slate-600">{item.body}</p> : null}
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatDateTime(item.created_at, user.organization.timezone)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {item.href ? (
                          <Link href={item.href} className="text-sm text-brand-700 hover:underline">
                            Open
                          </Link>
                        ) : null}
                        {!item.read_at ? (
                          <form action={markNotificationReadAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <Button type="submit" size="sm" variant="ghost">
                              Mark read
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
