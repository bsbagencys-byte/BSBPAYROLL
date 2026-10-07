import { PayslipBadge } from "@/components/payroll/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYROLL_LINE_KIND_LABELS } from "@/lib/constants";
import { periodLabel } from "@/lib/payroll/engine";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import { maskAccountNumber } from "@/lib/mask";
import type { PayslipView } from "@/types";

export function PayslipDocument({ view }: { view: PayslipView }) {
  const earnings = view.lines.filter((item) => item.kind === "EARNING");
  const reimbursements = view.lines.filter((item) => item.kind === "REIMBURSEMENT" || item.kind === "CLAIM");
  const deductions = view.lines.filter((item) => item.kind === "DEDUCTION" || item.kind === "LOAN" || item.kind === "ADJUSTMENT");
  const reserved = [
    { id: "pf", name: "Provident Fund", amount: 0 },
    { id: "esi", name: "ESI", amount: 0 },
    { id: "pt", name: "Professional Tax", amount: 0 },
    { id: "tds", name: "TDS", amount: 0 },
    { id: "lwf", name: "Labour Welfare Fund", amount: 0 },
  ];
  return (
    <div className="space-y-4 print:space-y-3">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{view.organizationName}</CardTitle>
            <p className="text-sm text-slate-500">
              Payslip {view.payslip.payslip_number ?? "pending"} · {periodLabel(view.run.period)}
            </p>
          </div>
          <PayslipBadge status={view.payslip.status} />
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Row label="Employee" value={`${view.employeeName} (${view.employeeCode})`} />
          <Row label="Department" value={view.departmentName} />
          <Row label="Designation" value={view.designationName} />
          <Row label="Branch" value={view.branchName} />
          <Row label="Pay date" value={formatDateOnly(view.run.pay_date)} />
          <Row label="Paid days" value={`${view.item.paid_days} / ${view.item.working_days}`} />
          <Row label="PAN" value={view.pan} />
          <Row label="UAN" value={view.uan} />
          <Row label="Bank" value={view.bankName} />
          <Row label="Account" value={maskAccountNumber(view.accountNumber)} />
          <Row label="IFSC" value={view.ifsc} />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <LineCard title="Earnings" rows={earnings} />
        <LineCard title="Reimbursements" rows={reimbursements} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <LineCard title="Deductions" rows={deductions} />
        <Card>
          <CardHeader>
            <CardTitle>Statutory (reserved)</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="min-w-full text-left text-sm">
              <tbody>
                {reserved.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">{item.name}</td>
                    <td className="py-2 text-right text-slate-500">Reserved</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-500">PF, ESI, PT, TDS and LWF are reserved for Phase 11 and are not deducted here.</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="grid gap-3 p-6 text-sm sm:grid-cols-3">
          <Metric label="Gross / earnings" value={formatCurrency(view.item.earnings + view.item.variable_earnings)} />
          <Metric label="Reimbursements" value={formatCurrency(view.item.reimbursements + view.item.claims)} />
          <Metric label="Net before statutory" value={formatCurrency(view.item.earnings + view.item.variable_earnings + view.item.reimbursements + view.item.claims - view.item.deductions)} />
        </CardContent>
      </Card>
    </div>
  );
}

function LineCard({
  title,
  rows,
}: {
  title: string;
  rows: PayslipView["lines"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">None.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">Head</th>
                <th className="py-2 pr-3">Kind</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">{item.name}</td>
                  <td className="py-2 pr-3 text-slate-500">{PAYROLL_LINE_KIND_LABELS[item.kind]}</td>
                  <td className="py-2 text-right">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
