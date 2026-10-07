import Link from "next/link";
import { PayslipBadge, PayrollRunBadge } from "@/components/payroll/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { periodLabel } from "@/lib/payroll/engine";
import { formatCurrency } from "@/lib/utils";
import type { PayrollItem, PayrollRun, Payslip } from "@/types";

export function EmployeePayrollPanel({
  rows,
}: {
  rows: Array<{ payslip: Payslip; run: PayrollRun; item: PayrollItem }>;
}) {
  const latest = rows[0];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Payslips</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Latest net</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{latest ? formatCurrency(latest.item.net_pay) : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Latest period</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{latest ? periodLabel(latest.run.period) : "—"}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Payroll history</CardTitle>
          <Link href="/payroll/payslips">
            <Button size="sm" variant="outline">
              All payslips
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">No processed payroll yet.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <Link
                  key={row.payslip.id}
                  href={`/payroll/payslips/${row.payslip.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium">{periodLabel(row.run.period)}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(row.item.net_pay)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PayrollRunBadge status={row.run.status} />
                    <PayslipBadge status={row.payslip.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
