import Link from "next/link";
import { PayrollHoldForm } from "@/components/payroll/hold-form";
import { PayrollItemBadge } from "@/components/payroll/status-badge";
import { Button } from "@/components/ui/button";
import { includePayrollItemAction } from "@/actions/payroll";
import { formatCurrency } from "@/lib/utils";
import type { PayrollItemListItem } from "@/types";

export function PayrollItemTable({
  items,
  canProcess,
  locked,
}: {
  items: PayrollItemListItem[];
  canProcess: boolean;
  locked: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No employees in this run.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Paid / LOP</th>
            <th className="px-4 py-3">Earnings</th>
            <th className="px-4 py-3">Claims</th>
            <th className="px-4 py-3">Loans</th>
            <th className="px-4 py-3">Statutory</th>
            <th className="px-4 py-3">Net</th>
            <th className="px-4 py-3">Status</th>
            {canProcess && !locked ? <th className="px-4 py-3" /> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.item.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/payroll/review/${row.item.run_id}/${row.item.employee_id}`} className="font-medium text-brand-700 hover:underline">
                    {row.employeeName}
                  </Link>
                  <p className="text-xs text-slate-500">{row.employeeCode}</p>
                </td>
              <td className="px-4 py-3">{row.departmentName ?? "—"}</td>
              <td className="px-4 py-3">
                {row.item.paid_days} / {row.item.lop_days}
              </td>
              <td className="px-4 py-3">{formatCurrency(row.item.earnings + row.item.variable_earnings)}</td>
              <td className="px-4 py-3">{formatCurrency(row.item.claims)}</td>
              <td className="px-4 py-3">{formatCurrency(row.item.loan_deductions)}</td>
              <td className="px-4 py-3">{formatCurrency(row.item.statutory_total)}</td>
              <td className="px-4 py-3 font-medium">{formatCurrency(row.item.net_pay)}</td>
              <td className="px-4 py-3">
                <PayrollItemBadge status={row.item.status} />
                {row.item.error_message ? <p className="mt-1 text-xs text-red-600">{row.item.error_message}</p> : null}
                {row.item.hold_reason ? <p className="mt-1 text-xs text-amber-700">{row.item.hold_reason}</p> : null}
              </td>
              {canProcess && !locked ? (
                <td className="px-4 py-3">
                  {row.item.status === "INCLUDED" ? (
                    <PayrollHoldForm itemId={row.item.id} />
                  ) : row.item.status === "ON_HOLD" ? (
                    <form action={includePayrollItemAction}>
                      <input type="hidden" name="itemId" value={row.item.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Include
                      </Button>
                    </form>
                  ) : (
                    <Link href={`/employees/${row.item.employee_id}`} className="text-xs text-brand-700 hover:underline">
                      Open employee
                    </Link>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
