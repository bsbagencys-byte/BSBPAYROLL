import { EngagementStatusBadge } from "@/components/contractors/status-badge";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import type { EngagementListItem } from "@/types";

export function EngagementTable({ items }: { items: EngagementListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Reference</th>
            <th className="px-4 py-2">Contractor</th>
            <th className="px-4 py-2">Scope</th>
            <th className="px-4 py-2">Period</th>
            <th className="px-4 py-2">Fee</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.engagement.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-4 py-2">{item.engagement.reference_number}</td>
              <td className="px-4 py-2">
                <p>{item.contractorName}</p>
                <p className="text-xs text-slate-500">{item.contractorCode}</p>
              </td>
              <td className="px-4 py-2">{item.engagement.scope}</td>
              <td className="px-4 py-2">
                {formatDateOnly(item.engagement.start_date)}
                {item.engagement.end_date ? ` – ${formatDateOnly(item.engagement.end_date)}` : ""}
              </td>
              <td className="px-4 py-2">{formatCurrency(item.engagement.fee_amount)}</td>
              <td className="px-4 py-2">
                <EngagementStatusBadge status={item.engagement.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
