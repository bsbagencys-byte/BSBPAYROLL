import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { EssStatusBadge } from "@/components/ess/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import { loadSelfClaims } from "@/lib/ess/query";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "My claims" };

export default async function MyClaimsPage() {
  const user = await requirePermissionOrRedirect("self.view");
  const identity = await resolveSelfEmployee(user);
  if (!identity) return null;

  const claims = await loadSelfClaims(user.organization.id, identity.employee.id);
  const canCreate = hasPermission(user, "claims.create");

  return (
    <div>
      <PageHeader
        title="My claims"
        description="Reimbursement and TA/DA claims you raised. Creating a claim reuses the standard claim workflow and policy checks."
        actions={
          canCreate ? (
            <Link href="/claims/new">
              <Button>New claim</Button>
            </Link>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Claim history</CardTitle>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <p className="text-sm text-slate-500">No claims raised yet.</p>
          ) : (
            <div className="space-y-3">
              {claims.map((row) => (
                <div key={row.claim.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-medium">{row.claimTypeName}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateOnly(row.claim.claim_date)}
                      {row.claim.reference_number ? ` · ${row.claim.reference_number}` : ""}
                      {row.claim.purpose ? ` · ${row.claim.purpose}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatCurrency(row.claim.approved_amount ?? row.claim.submitted_amount)}</span>
                    <EssStatusBadge status={row.claim.status} />
                    <Link href={`/claims/history`} className="text-sm text-brand-700 hover:underline">
                      View
                    </Link>
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
