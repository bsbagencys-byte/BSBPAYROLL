import Link from "next/link";
import { Bell, CalendarDays, Palmtree, Receipt, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { EssStatusBadge } from "@/components/ess/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import { loadEssDashboard } from "@/lib/ess/query";
import { formatCurrency, formatDateOnly, formatDateTime } from "@/lib/utils";

export const metadata = { title: "My Space" };

export default async function MyHomePage() {
  const user = await requirePermissionOrRedirect("self.view");
  const identity = await resolveSelfEmployee(user);
  if (!identity) return null;
  const timezone = user.organization.timezone;
  const data = await loadEssDashboard(user.organization.id, user.id, identity.employee.id, timezone);

  return (
    <div>
      <PageHeader
        title="My Space"
        description="Your payslips, leave, claims, documents and requests. Only your own records are shown."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Leave balance"
          value={data.balances.reduce((sum, item) => sum + item.available, 0)}
          hint={`${data.pendingLeave.length} pending request(s)`}
          href="/my/leave"
        />
        <StatCard
          title="Latest payslip"
          value={data.latestPayslip ? formatCurrency(data.latestPayslip.item.net_pay) : "—"}
          hint={data.latestPayslip ? data.latestPayslip.run.period : "No payslip issued"}
          href="/my/payslips"
        />
        <StatCard
          title="Pending claims"
          value={data.pendingClaims.length}
          hint={`${data.claimCount} total`}
          href="/my/claims"
        />
        <StatCard
          title="Active loans"
          value={data.activeLoanAccounts.length}
          hint="Auto-deduct payroll"
          href="/my/loans"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Leave balances</CardTitle>
            <Link href="/my/leave" className="text-sm text-brand-700 hover:underline">
              Apply
            </Link>
          </CardHeader>
          <CardContent>
            {data.balances.length === 0 ? (
              <p className="text-sm text-slate-500">No leave balances allocated.</p>
            ) : (
              <div className="space-y-3">
                {data.balances.map((item) => (
                  <div key={`${item.leaveTypeId}-${item.year}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="font-medium">{item.leaveTypeName}</p>
                      <p className="text-xs text-slate-500">
                        {item.year} · used {item.used}
                      </p>
                    </div>
                    <Badge variant={item.available <= 1 ? "warning" : "success"}>{item.available} available</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Upcoming holidays</CardTitle>
            <CalendarDays className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            {data.upcomingHolidays.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming holidays.</p>
            ) : (
              <div className="space-y-2">
                {data.upcomingHolidays.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span>{item.name}</span>
                    <span className="text-slate-500">{formatDateOnly(item.holiday_date)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Notifications</CardTitle>
            <Link href="/my/notifications" className="text-sm text-brand-700 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.notifications.length === 0 ? (
              <p className="text-sm text-slate-500">No notifications yet.</p>
            ) : (
              <div className="space-y-3">
                {data.notifications.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                    <Bell className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.body ? <p className="text-xs text-slate-500">{item.body}</p> : null}
                      <p className="text-[11px] text-slate-400">{formatDateTime(item.created_at, timezone)}</p>
                    </div>
                    {!item.read_at ? <span className="mt-1 h-2 w-2 rounded-full bg-red-500" /> : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>My activity</CardTitle>
            <Link href="/my/requests" className="text-sm text-brand-700 hover:underline">
              Requests
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row icon={<Palmtree className="h-4 w-4 text-slate-400" />} label="Pending leave" value={data.pendingLeave.length} />
            <Row icon={<Receipt className="h-4 w-4 text-slate-400" />} label="Pending claims" value={data.pendingClaims.length} />
            <Row icon={<Wallet className="h-4 w-4 text-slate-400" />} label="Active loans" value={data.activeLoanAccounts.length} />
            <Row icon={<Bell className="h-4 w-4 text-slate-400" />} label="Unread notifications" value={data.unreadNotifications.length} />
          </CardContent>
        </Card>
      </div>

      {hasPermission(user, "leave.approve") || hasPermission(user, "claims.approve") || hasPermission(user, "loans.approve") ? (
        <Card className="mt-4">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>My team</CardTitle>
            <Link href="/my/team" className="text-sm text-brand-700 hover:underline">
              Open
            </Link>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Pending approvals for employees who report to you. Limited to your reporting scope; decisions use the
              existing module approval screens.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {data.pendingChangeRequests.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Profile change requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pendingChangeRequests.map((item) => (
              <div key={item.request.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium">{item.request.field_key}</p>
                  <p className="text-xs text-slate-500">Awaiting authorised review</p>
                </div>
                <EssStatusBadge status={item.request.status} />
              </div>
            ))}
            <Link href="/my/profile">
              <Button variant="outline" size="sm" className="mt-2">
                Manage profile changes
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StatCard({ title, value, hint, href }: { title: string; value: string | number; hint: string; href: string }) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:border-brand-300">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-slate-500">{hint}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-600">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
