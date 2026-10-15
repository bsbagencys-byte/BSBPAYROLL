import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { loadSettlementDetail } from "@/lib/exits/query";
import { buildSettlementPdf } from "@/lib/exits/pdf";
import { EXIT_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "settlements.view")) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const detail = await loadSettlementDetail(user.organization.id, id, user.organization.timezone);
  if (!detail.row) return new Response("Not found", { status: 404 });
  const settlement = detail.row.settlement;
  if (!["FINALIZED", "PARTIALLY_PAID", "PAID"].includes(settlement.status)) {
    return new Response("PDF is available after finalization.", { status: 409 });
  }
  const money = (amount: number) => formatCurrency(amount, user.organization.currency);
  const rows = (kind: (typeof detail.lines)[number]["kind"] | (typeof detail.lines)[number]["kind"][]) => {
    const kinds = Array.isArray(kind) ? kind : [kind];
    return detail.lines
      .filter((item) => kinds.includes(item.kind))
      .map((item) => ({ name: item.name, amount: money(item.amount) }));
  };
  const pdf = buildSettlementPdf({
    organizationName: user.organization.display_name || user.organization.name,
    organizationAddress: [user.organization.address_line1, user.organization.city, user.organization.state, user.organization.pin]
      .filter(Boolean)
      .join(", "),
    reference: settlement.reference_number ?? settlement.id,
    employeeName: detail.row.employeeName,
    employeeCode: detail.row.employeeCode,
    exitType: EXIT_TYPE_LABELS[detail.row.exitType],
    lastWorkingDate: formatDateOnly(settlement.last_working_date),
    periodLabel: `${formatDateOnly(settlement.period_from)} – ${formatDateOnly(settlement.period_to)}`,
    workingDays: String(settlement.working_days),
    paidDays: String(settlement.paid_days),
    earnings: rows(["UNPAID_SALARY", "VARIABLE_EARNING", "BONUS", "ARREAR", "NOTICE_PAY"]),
    reimbursements: rows("REIMBURSEMENT"),
    encashment: rows("LEAVE_ENCASHMENT"),
    deductions: rows(["NOTICE_RECOVERY", "LOAN_RECOVERY"]),
    statutory: rows("STATUTORY"),
    employer: rows("EMPLOYER_STATUTORY"),
    adjustments: rows("ADJUSTMENT"),
    gross: money(settlement.gross_payable),
    netPay: money(settlement.net_payable),
    paid: money(settlement.paid_amount),
    generatedAt: new Date().toISOString(),
    exceptions: settlement.exceptions_json ? (JSON.parse(settlement.exceptions_json) as string[]) : [],
  });
  const filename = `${settlement.reference_number || "settlement"}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
