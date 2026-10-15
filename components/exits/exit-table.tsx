import Link from "next/link";
import { ExitStatusBadge } from "@/components/exits/status-badge";
import { EXIT_TYPE_LABELS } from "@/lib/constants";
import { formatDateOnly } from "@/lib/utils";
import type { ExitListItem } from "@/types";

export function ExitTable({ items }: { items: ExitListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Reference</th>
            <th className="px-4 py-2">Employee</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Last working date</th>
            <th className="px-4 py-2">Clearance</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.exit.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-4 py-2">
                <Link href={`/employees/exits/${item.exit.id}`} className="font-medium text-brand-700 hover:underline">
                  {item.exit.reference_number ?? "Draft"}
                </Link>
              </td>
              <td className="px-4 py-2">
                <p>{item.employeeName}</p>
                <p className="text-xs text-slate-500">{item.employeeCode}</p>
              </td>
              <td className="px-4 py-2">{EXIT_TYPE_LABELS[item.exit.exit_type]}</td>
              <td className="px-4 py-2">{formatDateOnly(item.exit.last_working_date)}</td>
              <td className="px-4 py-2">
                {item.pendingRequired} pending{item.blockedRequired ? ` · ${item.blockedRequired} blocked` : ""}
              </td>
              <td className="px-4 py-2">
                <ExitStatusBadge status={item.exit.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
