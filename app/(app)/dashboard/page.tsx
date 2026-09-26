import Link from "next/link";
import { Building2, Shield, UserRound, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSetupComplete } from "@/lib/auth/guards";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { formatDate, formatTime } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireSetupComplete();

  const timezone = user.organization.timezone || "Asia/Kolkata";
  const now = new Date();
  const demo = !hasSupabaseConfig() || isDemoMode();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Company, users and employee records. Payroll, attendance and leave modules are not enabled yet."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Company</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{user.organization.display_name || user.organization.name}</p>
            <p className="text-xs text-slate-500">{user.organization.legal_name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Logged-in user</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{user.displayName}</p>
            <p className="text-xs text-slate-500">@{user.username}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Role</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>{user.roleName}</Badge>
            <p className="mt-2 text-xs text-slate-500">{user.permissions.length} permissions granted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Current date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{formatDate(now, timezone)}</p>
            <p className="text-xs text-slate-500">{formatTime(now, timezone)} · {timezone}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Setup completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Company profile</span>
              <Badge variant="success">Complete</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Default structure</span>
              <Badge variant="success">Complete</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Business defaults</span>
              <Badge variant="success">Complete</Badge>
            </div>
            <p className="pt-2 text-xs text-slate-500">
              Setup wizard finished. You can still update values in Company Settings.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Account status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>User</span>
              <Badge variant={user.status === "ACTIVE" ? "success" : "danger"}>{user.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Membership</span>
              <Badge variant={user.membershipStatus === "ACTIVE" ? "success" : "danger"}>
                {user.membershipStatus}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Organization</span>
              <Badge variant={user.organization.status === "ACTIVE" ? "success" : "warning"}>
                {user.organization.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Branch</span>
              <span className="text-slate-700">{user.branch?.name ?? "Unassigned"}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>System status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Auth mode</span>
              <Badge variant={demo ? "warning" : "success"}>{demo ? "Demo store" : "Supabase"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Tenant isolation</span>
              <Badge variant="success">RLS ready</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Currency</span>
              <span>₹ {user.organization.currency}</span>
            </div>
            {user.organization.is_demo ? (
              <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                Demo organization. Remove with the seed cleanup script before production.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/settings/company" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-500">
            <Building2 className="h-5 w-5 text-brand-700" />
            <p className="mt-2 font-medium">Company Settings</p>
            <p className="text-xs text-slate-500">Profile, timezone and currency</p>
          </Link>
          <Link href="/settings/users" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-500">
            <Users className="h-5 w-5 text-brand-700" />
            <p className="mt-2 font-medium">User Management</p>
            <p className="text-xs text-slate-500">Invite, roles and access</p>
          </Link>
          <Link href="/employees" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-500">
            <Users className="h-5 w-5 text-brand-700" />
            <p className="mt-2 font-medium">Employees</p>
            <p className="text-xs text-slate-500">Directory, profiles and organisation structure</p>
          </Link>
          <Link href="/profile" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-500">
            <UserRound className="h-5 w-5 text-brand-700" />
            <p className="mt-2 font-medium">Profile</p>
            <p className="text-xs text-slate-500">Name, password and session</p>
          </Link>
        </div>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <Shield className="h-3.5 w-3.5" />
        No payroll or attendance figures are shown. Those modules ship in later phases.
      </p>
    </div>
  );
}
