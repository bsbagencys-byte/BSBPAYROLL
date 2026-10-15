import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { SettlementsSubnav } from "@/components/settlements/subnav";
import { SettlementStatusBadge } from "@/components/exits/status-badge";
import { SettlementAdjustmentForm } from "@/components/settlements/adjustment-form";
import { SettlementDecisionForm } from "@/components/settlements/decision-form";
import { SettlementPaymentForm } from "@/components/settlements/payment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadSettlementDetail } from "@/lib/exits/query";
import { calculateSettlementAction, cancelSettlementAction, finalizeSettlementAction, submitSettlementAction } from "@/actions/exits";
import { EXIT_TYPE_LABELS, SETTLEMENT_LINE_KIND_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Settlement" };

export default async function SettlementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionOrRedirect("settlements.view");
  const { id } = await params;
  const detail = await loadSettlementDetail(user.organization.id, id, user.organization.timezone);
  if (!detail.row) notFound();
  const settlement = detail.row.settlement;
  const exceptions: string[] = settlement.exceptions_json ? (JSON.parse(settlement.exceptions_json) as string[]) : [];
  const canCalculate = hasPermission(user, "settlements.calculate");
  const canReview = hasPermission(user, "settlements.review");
  const canApprove = hasPermission(user, "settlements.approve");
  const canFinalize = hasPermission(user, "settlements.finalize");
  const canPay = hasPermission(user, "settlements.pay");
  const canAdjust = hasPermission(user, "settlements.adjust");
  const outstanding = Math.max(0, Math.abs(settlement.net_payable) - settlement.paid_amount);
  const earnings = detail.lines.filter((item) => item.direction === "EARNING");
  const deductions = detail.lines.filter((item) => item.direction === "DEDUCTION");
  const employer = detail.lines.filter((item) => item.direction === "EMPLOYER");

  return (
    <div>
      <PageHeader
        title={settlement.reference_number ?? "Settlement"}
        description={`${detail.row.employeeName} (${detail.row.employeeCode})`}
        actions={
          <div className="flex gap-2">
            {["FINALIZED", "PARTIALLY_PAID", "PAID"].includes(settlement.status) ? (
              <a href={`/api/settlements/${settlement.id}/pdf`}>
                <Button variant="outline">Download PDF</Button>
              </a>
            ) : null}
            <Link href="/settlements">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        }
      />
      <SettlementsSubnav />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Summary</CardTitle>
              <SettlementStatusBadge status={settlement.status} />
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Exit type" value={EXIT_TYPE_LABELS[detail.row.exitType]} />
                <Detail label="Last working date" value={formatDateOnly(settlement.last_working_date)} />
                <Detail label="Period" value={`${formatDateOnly(settlement.period_from)} – ${formatDateOnly(settlement.period_to)}`} />
                <Detail label="Paid days" value={`${settlement.paid_days} / ${settlement.working_days}`} />
                <Detail label="Gross payable" value={formatCurrency(settlement.gross_payable)} />
                <Detail label="Net payable" value={formatCurrency(settlement.net_payable)} />
                <Detail label="Paid" value={formatCurrency(settlement.paid_amount)} />
                <Detail label="Outstanding" value={formatCurrency(outstanding)} />
              </dl>
            </CardContent>
          </Card>

          {exceptions.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Exceptions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
                  {exceptions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Line items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LineTable title="Earnings" rows={earnings} />
              <LineTable title="Deductions" rows={deductions} />
              {employer.length ? <LineTable title="Employer (not deducted)" rows={employer} /> : null}
            </CardContent>
          </Card>

          {canAdjust && !["FINALIZED", "PARTIALLY_PAID", "PAID", "CANCELLED"].includes(settlement.status) ? (
            <Card>
              <CardHeader>
                <CardTitle>Adjustment</CardTitle>
              </CardHeader>
              <CardContent>
                <SettlementAdjustmentForm settlementId={settlement.id} />
              </CardContent>
            </Card>
          ) : null}
        </div>
        <div className="space-y-4">
          {canCalculate && !["FINALIZED", "PARTIALLY_PAID", "PAID", "CANCELLED"].includes(settlement.status) ? (
            <Card>
              <CardHeader>
                <CardTitle>Recalculate</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={calculateSettlementAction}>
                  <input type="hidden" name="settlementId" value={settlement.id} />
                  <Button type="submit">Recalculate</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
          {canReview && (settlement.status === "CALCULATED" || settlement.status === "HAS_EXCEPTIONS") ? (
            <Card>
              <CardHeader>
                <CardTitle>Send for review</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={submitSettlementAction}>
                  <input type="hidden" name="settlementId" value={settlement.id} />
                  <Button type="submit">Submit review</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
          {["UNDER_REVIEW", "CALCULATED", "HAS_EXCEPTIONS"].includes(settlement.status) ? (
            <Card>
              <CardHeader>
                <CardTitle>Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <SettlementDecisionForm settlementId={settlement.id} canApprove={canApprove} />
              </CardContent>
            </Card>
          ) : null}
          {settlement.status === "APPROVED" && canFinalize ? (
            <Card>
              <CardHeader>
                <CardTitle>Finalize</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={finalizeSettlementAction}>
                  <input type="hidden" name="settlementId" value={settlement.id} />
                  <Button type="submit">Finalize statement</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
          {canPay && (settlement.status === "FINALIZED" || settlement.status === "PARTIALLY_PAID") ? (
            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <SettlementPaymentForm settlementId={settlement.id} outstanding={outstanding} />
              </CardContent>
            </Card>
          ) : null}
          {canApprove && settlement.status !== "PAID" && settlement.status !== "CANCELLED" ? (
            <Card>
              <CardHeader>
                <CardTitle>Cancel</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={cancelSettlementAction} className="space-y-2">
                  <input type="hidden" name="settlementId" value={settlement.id} />
                  <input name="reason" className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" placeholder="Reason" />
                  <Button type="submit" variant="destructive">
                    Cancel settlement
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

function LineTable({ title, rows }: { title: string; rows: Array<{ id: string; kind: keyof typeof SETTLEMENT_LINE_KIND_LABELS; name: string; amount: number; notes: string | null }> }) {
  if (!rows.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      <table className="min-w-full text-left text-sm">
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className="border-b last:border-0">
              <td className="py-2 pr-4">
                <p>{item.name}</p>
                <p className="text-xs text-slate-500">{SETTLEMENT_LINE_KIND_LABELS[item.kind]}{item.notes ? ` · ${item.notes}` : ""}</p>
              </td>
              <td className="py-2 text-right">{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
