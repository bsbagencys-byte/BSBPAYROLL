import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { ChangeRequestList } from "@/components/ess/change-request-list";
import { EssStatusBadge } from "@/components/ess/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import { loadConsolidatedRequests, loadReviewChangeRequests, loadSelfChangeRequests } from "@/lib/ess/query";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "My requests" };

const KIND_LABELS: Record<string, string> = {
  LEAVE: "Leave",
  CLAIM: "Claim",
  LOAN: "Loan",
  CHANGE_REQUEST: "Profile",
};

export default async function MyRequestsPage() {
  const user = await requirePermissionOrRedirect("self.view");
  const identity = await resolveSelfEmployee(user);
  if (!identity) return null;
  const timezone = user.organization.timezone;

  const [requests, reviewable, selfChangeRequests] = await Promise.all([
    loadConsolidatedRequests(user.organization.id, user.id, identity.employee.id, timezone),
    hasPermission(user, "self.change_request.review")
      ? loadReviewChangeRequests(user.organization.id)
      : Promise.resolve({ pending: [], decided: [] }),
    loadSelfChangeRequests(user.organization.id, user.id, identity.employee.id),
  ]);

  return (
    <div>
      <PageHeader
        title="My requests"
        description="All your leave, claim, loan and profile-change requests in one place. Approvals reuse the existing module workflows."
      />

      <Card>
        <CardHeader>
          <CardTitle>My activity</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-500">No requests raised yet.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((item) => (
                <Link
                  key={`${item.kind}-${item.id}`}
                  href={item.href}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {item.title} <span className="text-xs font-normal text-slate-400">· {KIND_LABELS[item.kind]}</span>
                    </p>
                    <p className="truncate text-xs text-slate-500">{item.detail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.createdAt ? (
                      <span className="text-xs text-slate-400">{formatDateTime(item.createdAt, timezone)}</span>
                    ) : null}
                    <EssStatusBadge status={item.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4">
        {selfChangeRequests.length > 0 ? (
          <ChangeRequestList rows={selfChangeRequests} mode="self" timezone={timezone} />
        ) : null}
        {hasPermission(user, "self.change_request.review") ? (
          <>
            <ChangeRequestList rows={reviewable.pending} mode="review" timezone={timezone} />
            {reviewable.decided.length > 0 ? (
              <ChangeRequestList rows={reviewable.decided} mode="review" timezone={timezone} />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
