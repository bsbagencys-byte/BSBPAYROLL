import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { PAYROLL_APPROVAL_ACTION_LABELS, PAYROLL_LINE_KIND_LABELS, PAYROLL_RUN_STATUS_LABELS, STATUTORY_HEAD_LABELS } from "@/lib/constants";
import { toCsv } from "@/lib/payroll/engine";
import { loadPayrollOverview, loadPayrollRunDetail, toPayrollItemList, netBeforeStatutory } from "@/lib/payroll/query";
import { listComplianceFilings, listPayrollApprovalHistory, listPayrollItems, listPayrollLines, listPayrollRuns, listPayslips } from "@/lib/payroll/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { listEmployment } from "@/lib/leave/repository";

export async function payrollCsvResponse(
  kind:
    | "register"
    | "sheet"
    | "bank"
    | "payslips"
    | "employee"
    | "earnings"
    | "deductions"
    | "approval"
    | "pf"
    | "esi"
    | "pt"
    | "tds"
) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const needsPayroll =
    kind === "register" ||
    kind === "sheet" ||
    kind === "bank" ||
    kind === "payslips" ||
    kind === "employee" ||
    kind === "earnings" ||
    kind === "deductions" ||
    kind === "approval";
  if (needsPayroll && !(hasPermission(user, "payroll.view") || hasPermission(user, "payroll.export"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!needsPayroll && !(hasPermission(user, "compliance.view") || hasPermission(user, "compliance.export") || hasPermission(user, "payroll.export"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const orgId = user.organization.id;
  const timezone = user.organization.timezone;
  let csv = "";
  let filename = "payroll.csv";

  if (kind === "register") {
    const runs = await listPayrollRuns(orgId);
    csv = toCsv(
      ["Period", "From", "To", "Status", "Employees", "Included", "Held", "Errors", "Warnings", "Gross", "Net", "Statutory", "Employer"],
      runs.map((item) => [
        item.period,
        item.period_from,
        item.period_to,
        PAYROLL_RUN_STATUS_LABELS[item.status],
        item.employee_count,
        item.included_count,
        item.hold_count,
        item.error_count,
        item.warning_count,
        item.total_gross,
        item.total_net,
        item.total_statutory,
        item.employer_contributions,
      ])
    );
    filename = "payroll-register.csv";
  } else if (kind === "sheet" || kind === "bank") {
    const overview = await loadPayrollOverview(orgId, timezone);
    const run = overview.latest;
    if (!run) {
      csv = toCsv(["Message"], [["No payroll run yet"]]);
    } else {
      const [catalog, employment, items] = await Promise.all([
        loadOrgCatalog(orgId),
        listEmployment(orgId),
        listPayrollItems(orgId, run.id),
      ]);
      const rows = toPayrollItemList({
        items: items.filter((item) => item.status === "INCLUDED"),
        employees: catalog.employees,
        departments: catalog.departments,
        branches: catalog.branches,
        employment,
      });
      if (kind === "bank") {
        csv = toCsv(
          ["Employee", "Code", "Net pay", "Period"],
          rows.map((item) => [item.employeeName, item.employeeCode, item.item.net_pay, run.period])
        );
        filename = "payroll-bank.csv";
      } else {
        csv = toCsv(
          ["Employee", "Code", "Department", "Paid days", "LOP", "Earnings", "Variable", "Claims", "Loans", "Deductions", "Net before statutory"],
          rows.map((item) => [
            item.employeeName,
            item.employeeCode,
            item.departmentName,
            item.item.paid_days,
            item.item.lop_days,
            item.item.earnings,
            item.item.variable_earnings,
            item.item.claims,
            item.item.loan_deductions,
            item.item.deductions,
            netBeforeStatutory(item.item),
          ])
        );
        filename = "payroll-sheet.csv";
      }
    }
  } else if (kind === "payslips") {
    const slips = await listPayslips(orgId);
    const catalog = await loadOrgCatalog(orgId);
    csv = toCsv(
      ["Number", "Employee", "Code", "Period", "Status", "Issued"],
      slips.map((item) => {
        const employee = catalog.employees.find((row) => row.id === item.employee_id);
        return [item.payslip_number, employee?.display_name, employee?.employee_code, item.period, item.status, item.issued_at];
      })
    );
    filename = "payslips.csv";
  } else if (kind === "employee" || kind === "earnings" || kind === "deductions" || kind === "approval") {
    const overview = await loadPayrollOverview(orgId, timezone);
    const run = overview.latest;
    if (!run) {
      csv = toCsv(["Message"], [["No payroll run yet"]]);
    } else {
      const detail = await loadPayrollRunDetail(orgId, run.id);
      if (kind === "employee") {
        csv = toCsv(
          ["Employee", "Code", "Department", "Branch", "Status", "Paid days", "LOP", "Gross", "Net before statutory"],
          detail.items.map((item) => [
            item.employeeName,
            item.employeeCode,
            item.departmentName,
            item.branchName,
            item.item.status,
            item.item.paid_days,
            item.item.lop_days,
            item.item.earnings + item.item.variable_earnings,
            netBeforeStatutory(item.item),
          ])
        );
        filename = "payroll-employee.csv";
      } else if (kind === "earnings" || kind === "deductions") {
        const lines = await listPayrollLines(orgId, run.id);
        const wanted = kind === "earnings" ? ["EARNING", "REIMBURSEMENT", "CLAIM"] : ["DEDUCTION", "LOAN", "ADJUSTMENT"];
        const mapped = lines
          .filter((line) => wanted.includes(line.kind))
          .map((line) => {
            const row = detail.items.find((item) => item.item.id === line.item_id);
            return [
              row?.employeeName,
              row?.employeeCode,
              PAYROLL_LINE_KIND_LABELS[line.kind],
              line.name,
              line.amount,
            ];
          });
        csv = toCsv(["Employee", "Code", "Kind", "Head", "Amount"], mapped);
        filename = kind === "earnings" ? "payroll-earnings.csv" : "payroll-deductions.csv";
      } else {
        const history = await listPayrollApprovalHistory(orgId, run.id);
        csv = toCsv(
          ["Action", "From", "To", "Role", "Reason", "At"],
          history.map((item) => [
            PAYROLL_APPROVAL_ACTION_LABELS[item.action],
            item.previous_status,
            item.new_status,
            item.actor_role,
            item.reason,
            item.created_at,
          ])
        );
        filename = "payroll-approval.csv";
      }
    }
  } else {
    const filings = await listComplianceFilings(orgId);
    const head = kind.toUpperCase() as "PF" | "ESI" | "PT" | "TDS";
    const filtered = filings.filter((item) => item.head === head);
    csv = toCsv(
      ["Head", "Period", "Employees", "Employee amount", "Employer amount", "Total", "Status"],
      filtered.map((item) => [
        STATUTORY_HEAD_LABELS[item.head],
        item.period,
        item.employee_count,
        item.employee_amount,
        item.employer_amount,
        item.total_amount,
        item.status,
      ])
    );
    filename = `${kind}-compliance.csv`;
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
