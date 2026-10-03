import Link from "next/link";
import { LoanAccountStatusBadge } from "@/components/loans/status-badge";
import { LOAN_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import type { LoanAccountListItem } from "@/types";

export function LoanAccountTable({ items }: { items: LoanAccountListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Employee</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Disbursed</th>
            <th className="px-4 py-2">Outstanding</th>
            <th className="px-4 py-2">EMI</th>
            <th className="px-4 py-2">Remaining</th>
            <th className="px-4 py-2">Start</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.account.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-4 py-2">
                <Link href={`/loans/accounts/${item.account.id}`} className="font-medium text-brand-700 hover:underline">
                  {item.employeeName}
                </Link>
                <p className="text-xs text-slate-500">{item.employeeCode}</p>
              </td>
              <td className="px-4 py-2">
                <p>{item.loanTypeName}</p>
                <p className="text-xs text-slate-500">{LOAN_CATEGORY_LABELS[item.category]}</p>
              </td>
              <td className="px-4 py-2">{formatCurrency(item.account.disbursed_amount)}</td>
              <td className="px-4 py-2">{formatCurrency(item.account.outstanding_principal + item.account.outstanding_interest)}</td>
              <td className="px-4 py-2">{formatCurrency(item.account.emi_amount)}</td>
              <td className="px-4 py-2">
                {item.account.remaining_installments}
                {item.overdueCount > 0 ? <p className="text-xs text-red-600">{item.overdueCount} overdue</p> : null}
              </td>
              <td className="px-4 py-2">{formatDateOnly(item.account.start_date)}</td>
              <td className="px-4 py-2">
                <LoanAccountStatusBadge status={item.account.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
