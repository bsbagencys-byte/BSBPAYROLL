import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { toCsv } from "@/lib/exits/engine";
import { loadContractorsOverview, loadExitsOverview, loadSettlementsOverview } from "@/lib/exits/query";
import {
  CONTRACTOR_INVOICE_STATUS_LABELS,
  CONTRACTOR_STATUS_LABELS,
  ENGAGEMENT_STATUS_LABELS,
  EXIT_STATUS_LABELS,
  EXIT_TYPE_LABELS,
  SETTLEMENT_STATUS_LABELS,
} from "@/lib/constants";
import type { PermissionCode } from "@/lib/constants";

async function csvUser(permission: PermissionCode) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, permission)) return null;
  return user;
}

export async function exitsCsvResponse(kind: "register" | "notice" | "clearance") {
  const user = await csvUser("exits.export");
  if (!user) return new Response("Unauthorized", { status: 401 });
  const overview = await loadExitsOverview(user.organization.id, user.organization.timezone);
  const rows =
    kind === "notice" ? overview.inNotice : kind === "clearance" ? overview.clearance : overview.exits;
  const csv = toCsv(
    ["Reference", "Employee", "Code", "Department", "Type", "Notice date", "Last working date", "Status", "Pending clearance"],
    rows.map((item) => [
      item.exit.reference_number,
      item.employeeName,
      item.employeeCode,
      item.departmentName,
      EXIT_TYPE_LABELS[item.exit.exit_type],
      item.exit.notice_date,
      item.exit.last_working_date,
      EXIT_STATUS_LABELS[item.exit.status],
      item.pendingRequired,
    ])
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="exits-${kind}.csv"`,
    },
  });
}

export async function settlementsCsvResponse(kind: "register" | "pending" | "paid") {
  const user = await csvUser("settlements.export");
  if (!user) return new Response("Unauthorized", { status: 401 });
  const overview = await loadSettlementsOverview(user.organization.id, user.organization.timezone);
  const rows =
    kind === "pending"
      ? overview.settlements.filter((item) =>
          ["DRAFT", "CALCULATED", "HAS_EXCEPTIONS", "UNDER_REVIEW", "APPROVED", "FINALIZED", "PARTIALLY_PAID"].includes(
            item.settlement.status
          )
        )
      : kind === "paid"
        ? overview.settlements.filter((item) => item.settlement.status === "PAID")
        : overview.settlements;
  const csv = toCsv(
    ["Reference", "Employee", "Code", "Exit type", "Last working date", "Gross", "Net", "Paid", "Status"],
    rows.map((item) => [
      item.settlement.reference_number,
      item.employeeName,
      item.employeeCode,
      item.exitType,
      item.lastWorkingDate,
      item.settlement.gross_payable,
      item.settlement.net_payable,
      item.settlement.paid_amount,
      SETTLEMENT_STATUS_LABELS[item.settlement.status],
    ])
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="settlements-${kind}.csv"`,
    },
  });
}

export async function contractorsCsvResponse(kind: "register" | "engagements" | "invoices" | "withholding") {
  const user = await csvUser("contractors.export");
  if (!user) return new Response("Unauthorized", { status: 401 });
  const overview = await loadContractorsOverview(user.organization.id, user.organization.timezone);
  if (kind === "engagements") {
    const csv = toCsv(
      ["Reference", "Contractor", "Code", "Scope", "Start", "End", "Fee", "Status"],
      overview.engagements.map((item) => [
        item.engagement.reference_number,
        item.contractorName,
        item.contractorCode,
        item.engagement.scope,
        item.engagement.start_date,
        item.engagement.end_date,
        item.engagement.fee_amount,
        ENGAGEMENT_STATUS_LABELS[item.engagement.status],
      ])
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="contractor-engagements.csv"',
      },
    });
  }
  if (kind === "invoices" || kind === "withholding") {
    const csv = toCsv(
      ["Invoice", "Contractor", "Code", "Date", "Gross", "Adjustment", "Withholding", "Net", "Section", "Rule", "Status"],
      overview.invoices.map((item) => [
        item.invoice.invoice_number,
        item.contractorName,
        item.contractorCode,
        item.invoice.invoice_date,
        item.invoice.gross_amount,
        item.invoice.adjustment_amount,
        item.invoice.withholding_amount,
        item.invoice.net_payable,
        item.invoice.withholding_section,
        item.invoice.rule_version_code,
        CONTRACTOR_INVOICE_STATUS_LABELS[item.invoice.status],
      ])
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="contractor-${kind}.csv"`,
      },
    });
  }
  const csv = toCsv(
    ["Code", "Legal name", "Display name", "Type", "PAN", "GSTIN", "Status", "Active engagements"],
    overview.contractors.map((item) => [
      item.contractor.contractor_code,
      item.contractor.legal_name,
      item.contractor.display_name,
      item.contractor.business_type,
      item.contractor.pan,
      item.contractor.gstin,
      CONTRACTOR_STATUS_LABELS[item.contractor.status],
      item.activeEngagements,
    ])
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="contractors-register.csv"',
    },
  });
}

