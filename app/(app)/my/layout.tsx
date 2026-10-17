import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EssSubnav } from "@/components/ess/subnav";
import { SelfHeader } from "@/components/ess/self-header";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import { loadSelfNotifications } from "@/lib/ess/query";

export const metadata = { title: "My Space" };

export default async function MyLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermissionOrRedirect("self.view");
  const identity = await resolveSelfEmployee(user);

  if (!identity) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Your employee profile is not linked yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="info">
              My Space shows your own payslips, leave, documents and requests. Your account is not yet linked to an
              employee record, so this information cannot be displayed. Ask your HR or payroll administrator to link your
              user to your employee profile.
            </Alert>
            <p className="text-sm text-slate-500">
              Signed in as {user.displayName} (@{user.username}). No other employee or organisation data is accessible
              from this page.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/profile">
                <Button variant="outline">Account settings</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline">Back to dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const notifications = await loadSelfNotifications(user.organization.id, user.id);
  const unread = notifications.filter((item) => !item.read_at).length;

  return (
    <div>
      <SelfHeader identity={identity} />
      <EssSubnav unreadCount={unread} />
      {children}
    </div>
  );
}
