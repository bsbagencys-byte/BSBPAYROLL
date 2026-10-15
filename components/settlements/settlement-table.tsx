import Link from "next/link";
import { SettlementStatusBadge } from "@/components/exits/status-badge";
import { EXIT_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import type { SettlementListItem } from "@/types";

export function SettlementTable({ items }: { items: SettlementListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Reference</th>
            <th className="px-4 py-2">Employee</th>
            <th className="px-4 py-2">Exit type</th>
            <th className="px-4 py-2">Last working date</th>
            <th className="px-4 py-2">Net</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.settlement.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-4 py-2">
                <Link href={`/settlements/${item.settlement.id}`} className="font-medium text-brand-700 hover:underline">
                  {item.settlement.reference_number ?? "Draft"}
                </Link>
              </td>
              <td className="px-4 py-2">
                <p>{item.employeeName}</p>
                <p className="text-xs text-slate-500">{item.employeeCode}</p>
              </td>
              <td className="px-4 py-2">{EXIT_TYPE_LABELS[item.exitType]}</td>
              <td className="px-4 py-2">{formatDateOnly(item.lastWorkingDate)}</td>
              <td className="px-4 py-2">{formatCurrency(item.settlement.net_payable)}</td>
              <td className="px-4 py-2">
                <SettlementStatusBadge status={item.settlement.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
