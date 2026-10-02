import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { ClaimsSubnav } from "@/components/claims/subnav";
import { ClaimStatusBadge, CheckBadge } from "@/components/claims/status-badge";
import { ClaimDecisionForm } from "@/components/claims/decision-form";
import { ClaimAttachmentForm } from "@/components/claims/attachment-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadClaimDetail } from "@/lib/claims/query";
import { listClaimChecks } from "@/lib/claims/repository";
import { cancelClaimAction, submitClaimAction } from "@/actions/claims";
import { CLAIM_APPROVAL_STEP_LABELS, CLAIM_CATEGORY_LABELS, type ClaimApprovalStep } from "@/lib/constants";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Claim" };

export default async function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionOrRedirect("claims.view");
  const { id } = await params;
  const [detail, checks] = await Promise.all([loadClaimDetail(user.organization.id, id), listClaimChecks(user.organization.id, id)]);
  if (!detail.row) notFound();
  const { row, policy, type, attachments, approvals, items } = detail;
  const claim = row.claim;
  const canApprove = hasPermission(user, "claims.approve");
  const canEdit = hasPermission(user, "claims.edit") || hasPermission(user, "claims.create");
  const actionable = claim.status === "SUBMITTED" || claim.status === "PENDING_APPROVAL";

  return (
    <div>
      <PageHeader
        title={claim.reference_number ?? "Claim"}
        description={`${row.claimTypeName} · ${row.employeeName} (${row.employeeCode})`}
        actions={
          <Link href="/claims/history">
            <Button variant="outline">Back to claims</Button>
          </Link>
        }
      />
      <ClaimsSubnav />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Details</CardTitle>
              <div className="flex items-center gap-2">
                <ClaimStatusBadge status={claim.status} />
                {claim.current_step ? (
                  <Badge variant="default">{CLAIM_APPROVAL_STEP_LABELS[claim.current_step as ClaimApprovalStep]}</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Claim date" value={formatDateOnly(claim.claim_date)} />
                <Detail label="Category" value={CLAIM_CATEGORY_LABELS[row.category] ?? row.category} />
                <Detail label="Purpose" value={claim.purpose ?? "—"} />
                <Detail label="Period" value={claim.period_from ? `${claim.period_from} – ${claim.period_to ?? claim.period_from}` : "—"} />
                <Detail label="Submitted" value={formatCurrency(claim.submitted_amount)} />
                <Detail label="Approved" value={claim.approved_amount != null ? formatCurrency(claim.approved_amount) : "—"} />
                <Detail label="Distance" value={claim.distance != null ? `${claim.distance} km @ ${claim.rate_per_km ?? 0}/km` : "—"} />
                <Detail label="Travel" value={claim.travel_type ? `${claim.travel_type}${claim.travel_days ? ` · ${claim.travel_days} days` : ""}` : "—"} />
                <Detail label="Include in payroll" value={claim.include_in_payroll ? "Yes" : "No"} />
                <Detail label="Reference" value={claim.reference_number ?? "—"} />
              </dl>
              {claim.notes ? <p className="mt-4 text-sm text-slate-600">{claim.notes}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Policy checks</CardTitle>
            </CardHeader>
            <CardContent>
              {checks.length === 0 ? (
                <p className="text-sm text-slate-500">No checks recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {checks.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
                      <div>
                        <p className="text-sm font-medium">{item.check_code}</p>
                        <p className="text-xs text-slate-500">{item.message}</p>
                      </div>
                      <CheckBadge result={item.result} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {items.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Line items</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {items.map((item) => (
                    <li key={item.id} className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
                      <span>{item.description}</span>
                      <span className="font-medium">{formatCurrency(item.amount)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {actionable ? (
            <Card>
              <CardHeader>
                <CardTitle>Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <ClaimDecisionForm claimId={claim.id} amount={claim.submitted_amount} canApprove={canApprove} />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>{policy?.name ?? "No matching policy"}</p>
              {type ? <p className="text-xs text-slate-500">Type: {type.name} · {type.workflow_mode === "TWO_STEP" ? "Manager then finance" : "Single approver"}</p> : null}
              {policy?.max_amount != null ? <p className="text-xs text-slate-500">Maximum {formatCurrency(policy.max_amount)}</p> : null}
              {policy?.da_per_day != null ? <p className="text-xs text-slate-500">DA/day {formatCurrency(policy.da_per_day)}</p> : null}
              {policy?.mileage_rate != null ? <p className="text-xs text-slate-500">Mileage {policy.mileage_rate}/km</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {approvals.length === 0 ? (
                <p className="text-sm text-slate-500">No decisions yet.</p>
              ) : (
                <div className="space-y-3">
                  {approvals.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-medium">
                        {CLAIM_APPROVAL_STEP_LABELS[item.step]} · {item.decision}
                      </p>
                      {item.amount != null ? <p className="text-xs text-slate-500">{formatCurrency(item.amount)}</p> : null}
                      {item.reason ? <p className="text-xs text-slate-500">{item.reason}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Receipts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {attachments.length === 0 ? (
                <p className="text-sm text-slate-500">No receipts attached.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {attachments.map((item) => (
                    <li key={item.id} className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
                      <span>{item.file_name}</span>
                      <span className="text-xs text-slate-500">{item.file_size != null ? `${Math.round(item.file_size / 1024)} KB` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
              {canEdit && (claim.status === "DRAFT" || claim.status === "SUBMITTED" || claim.status === "PENDING_APPROVAL") ? (
                <ClaimAttachmentForm claimId={claim.id} employeeId={claim.employee_id} />
              ) : null}
            </CardContent>
          </Card>

          {claim.status === "DRAFT" ? (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <form action={submitClaimAction}>
                  <input type="hidden" name="id" value={claim.id} />
                  <Button type="submit">Submit for approval</Button>
                </form>
                <form action={cancelClaimAction}>
                  <input type="hidden" name="id" value={claim.id} />
                  <Button type="submit" variant="outline">
                    Cancel
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}
