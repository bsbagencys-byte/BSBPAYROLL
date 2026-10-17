import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { EssStatusBadge } from "@/components/ess/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSetupComplete } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import { loadTeamApprovals } from "@/lib/ess/query";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "My team" };

const KIND_LABELS: Record<string, string> = {
  LEAVE: "Leave",
  CLAIM: "Claim",
  LOAN: "Loan",
};

export default async function MyTeamPage() {
  const user = await requireSetupComplete();
  const canView =
    hasPermission(user, "leave.approve") || hasPermission(user, "claims.approve") || hasPermission(user, "loans.approve");
  if (!canView) redirect("/unauthorized");

  const identity = await resolveSelfEmployee(user);
  if (!identity) {
    return (
      <div>
        <PageHeader title="My team" description="Pending approvals for employees who report to you." />
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">
            Your account is not linked to an employee record, so reporting scope cannot be resolved.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { rows, reportCount } = await loadTeamApprovals(
    user.organization.id,
    identity.employee.id,
    user.organization.timezone
  );

  return (
    <div>
      <PageHeader
        title="My team"
        description="Pending leave, claim and loan requests for your direct reports only. Decisions are made in the existing module approval screens."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <Users className="h-4 w-4 text-slate-400" />
        {reportCount} direct report(s) in your reporting scope
        <Badge variant="muted">Scoped by reporting manager</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">No pending requests from your direct reports.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <Link
                  key={`${row.kind}-${row.id}`}
                  href={row.href}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {row.employeeName} <span className="font-normal text-slate-500">({row.employeeCode})</span>
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {row.title} · {KIND_LABELS[row.kind]}
                      {row.detail ? ` · ${row.detail}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {row.createdAt ? (
                      <span className="text-xs text-slate-400">{formatDateTime(row.createdAt, user.organization.timezone)}</span>
                    ) : null}
                    <EssStatusBadge status={row.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
