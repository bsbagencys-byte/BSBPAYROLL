import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ClaimsSubnav } from "@/components/claims/subnav";
import { ClaimStatusBadge } from "@/components/claims/status-badge";
import { ClaimDecisionForm } from "@/components/claims/decision-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadClaimListItems } from "@/lib/claims/query";
import { CLAIM_APPROVAL_STEP_LABELS, type ClaimApprovalStep } from "@/lib/constants";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Claim approvals" };

export default async function ClaimApprovalsPage() {
  const user = await requirePermissionOrRedirect("claims.view");
  const items = await loadClaimListItems(user.organization.id);
  const pending = items.filter((item) => item.claim.status === "SUBMITTED" || item.claim.status === "PENDING_APPROVAL");
  const canApprove = hasPermission(user, "claims.approve");

  return (
    <div>
      <PageHeader title="Approvals" description="Decide claims at their current step. Two-step claims move from manager to finance." />
      <ClaimsSubnav />
      {pending.length === 0 ? (
        <EmptyState title="Nothing to approve" description="Submitted claims will appear here." />
      ) : (
        <div className="space-y-4">
          {pending.map((item) => (
            <Card key={item.claim.id}>
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{item.claim.purpose ?? item.claimTypeName}</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.employeeName} ({item.employeeCode}) · {item.claimTypeName} · {formatDateOnly(item.claim.claim_date)} ·{" "}
                    {formatCurrency(item.claim.submitted_amount)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <ClaimStatusBadge status={item.claim.status} />
                  {item.claim.current_step ? (
                    <Badge variant="default">{CLAIM_APPROVAL_STEP_LABELS[item.claim.current_step as ClaimApprovalStep]}</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-slate-600">
                    Policy: {item.policyName ?? "No matching policy"} · Limit: {item.policyLimit != null ? formatCurrency(item.policyLimit) : "—"} · Receipts: {item.receiptCount}
                  </p>
                  <Link href={`/claims/${item.claim.id}`}>
                    <Button size="sm" variant="outline">
                      View details
                    </Button>
                  </Link>
                </div>
                <ClaimDecisionForm claimId={item.claim.id} amount={item.claim.submitted_amount} canApprove={canApprove} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
