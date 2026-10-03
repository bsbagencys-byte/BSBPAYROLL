import Link from "next/link";
import { LoanApplicationStatusBadge } from "@/components/loans/status-badge";
import { LOAN_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import type { LoanListItem } from "@/types";

export function LoanApplicationTable({ items }: { items: LoanListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Reference</th>
            <th className="px-4 py-2">Employee</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Amount</th>
            <th className="px-4 py-2">EMI</th>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.application.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-4 py-2">
                <Link href={`/loans/applications/${item.application.id}`} className="font-medium text-brand-700 hover:underline">
                  {item.application.reference_number ?? "Draft"}
                </Link>
              </td>
              <td className="px-4 py-2">
                <p>{item.employeeName}</p>
                <p className="text-xs text-slate-500">{item.employeeCode}</p>
              </td>
              <td className="px-4 py-2">
                <p>{item.loanTypeName}</p>
                <p className="text-xs text-slate-500">{LOAN_CATEGORY_LABELS[item.category]}</p>
              </td>
              <td className="px-4 py-2">{formatCurrency(item.application.requested_amount)}</td>
              <td className="px-4 py-2">{formatCurrency(item.application.emi_amount)}</td>
              <td className="px-4 py-2">{formatDateOnly(item.application.requested_date)}</td>
              <td className="px-4 py-2">
                <LoanApplicationStatusBadge status={item.application.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
