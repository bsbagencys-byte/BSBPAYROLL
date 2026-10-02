import Link from "next/link";
import { ClaimStatusBadge } from "@/components/claims/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import type { ClaimListItem } from "@/types";

export function EmployeeClaimsPanel({ items }: { items: ClaimListItem[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Claims</CardTitle>
        <Link href="/claims/history">
          <Button size="sm" variant="outline">
            View all
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No claims for this employee.</p>
        ) : (
          <div className="space-y-3">
            {items.slice(0, 8).map((item) => (
              <Link key={item.claim.id} href={`/claims/${item.claim.id}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <div>
                  <p className="font-medium">{item.claim.purpose ?? item.claimTypeName}</p>
                  <p className="text-xs text-slate-500">{formatDateOnly(item.claim.claim_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(item.claim.submitted_amount)}</p>
                  <ClaimStatusBadge status={item.claim.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
