import Link from "next/link";
import { ContractorStatusBadge } from "@/components/contractors/status-badge";
import { CONTRACTOR_BUSINESS_TYPE_LABELS } from "@/lib/constants";
import type { ContractorListItem } from "@/types";

export function ContractorTable({ items }: { items: ContractorListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Code</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Engagements</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.contractor.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-4 py-2">
                <Link href={`/contractors/${item.contractor.id}`} className="font-medium text-brand-700 hover:underline">
                  {item.contractor.contractor_code}
                </Link>
              </td>
              <td className="px-4 py-2">
                <p>{item.contractor.display_name}</p>
                <p className="text-xs text-slate-500">{item.contractor.legal_name}</p>
              </td>
              <td className="px-4 py-2">{CONTRACTOR_BUSINESS_TYPE_LABELS[item.contractor.business_type]}</td>
              <td className="px-4 py-2">{item.activeEngagements}</td>
              <td className="px-4 py-2">
                <ContractorStatusBadge status={item.contractor.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
