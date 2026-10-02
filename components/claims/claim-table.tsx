import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClaimStatusBadge } from "@/components/claims/status-badge";
import { CLAIM_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import type { ClaimListItem } from "@/types";

export function ClaimTable({ items }: { items: ClaimListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.claim.id} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium">{item.claim.reference_number ?? item.claim.id.slice(0, 8)}</td>
              <td className="px-4 py-3">
                <p>{item.employeeName}</p>
                <p className="text-xs text-slate-500">{item.employeeCode}</p>
              </td>
              <td className="px-4 py-3">
                <p>{item.claimTypeName}</p>
                <p className="text-xs text-slate-500">{CLAIM_CATEGORY_LABELS[item.category] ?? item.category}</p>
              </td>
              <td className="px-4 py-3">{formatDateOnly(item.claim.claim_date)}</td>
              <td className="px-4 py-3">
                <p className="font-medium">{formatCurrency(item.claim.approved_amount ?? item.claim.submitted_amount)}</p>
                {item.claim.approved_amount != null && item.claim.approved_amount !== item.claim.submitted_amount ? (
                  <p className="text-xs text-slate-500">claimed {formatCurrency(item.claim.submitted_amount)}</p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <ClaimStatusBadge status={item.claim.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/claims/${item.claim.id}`}>
                  <Button size="sm" variant="outline">
                    Open
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
