import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { toCsv } from "@/lib/loans/engine";
import { loadAccountListItems, loadLoanListItems, loadLoansCatalog, loadLoansOverview } from "@/lib/loans/query";
import {
  LOAN_ACCOUNT_STATUS_LABELS,
  LOAN_APPLICATION_STATUS_LABELS,
  LOAN_CATEGORY_LABELS,
  LOAN_INSTALLMENT_STATUS_LABELS,
  LOAN_PAYMENT_METHOD_LABELS,
} from "@/lib/constants";

export async function loansCsvResponse(
  kind: "register" | "active" | "outstanding" | "schedule" | "repayments" | "advances" | "overdue" | "statement"
) {
  const user = await getSessionUser();
  if (!user || !(hasPermission(user, "loans.view") || hasPermission(user, "loans.export"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const orgId = user.organization.id;
  const timezone = user.organization.timezone;
  let csv = "";
  let filename = "loans.csv";

  if (kind === "register") {
    const items = await loadLoanListItems(orgId);
    csv = toCsv(
      ["Reference", "Employee", "Code", "Type", "Category", "Requested", "Tenure", "EMI", "Status", "Date"],
      items.map((item) => [
        item.application.reference_number,
        item.employeeName,
        item.employeeCode,
        item.loanTypeName,
        LOAN_CATEGORY_LABELS[item.category],
        item.application.requested_amount,
        item.application.tenure_months,
        item.application.emi_amount,
        LOAN_APPLICATION_STATUS_LABELS[item.application.status],
        item.application.requested_date,
      ])
    );
    filename = "loan-register.csv";
  } else if (kind === "active" || kind === "outstanding" || kind === "advances") {
    const items = await loadAccountListItems(orgId, timezone);
    const filtered =
      kind === "advances"
        ? items.filter((item) => item.category === "SALARY_ADVANCE" || item.category === "FESTIVAL_ADVANCE")
        : kind === "outstanding"
          ? items.filter((item) => item.account.outstanding_principal + item.account.outstanding_interest > 0)
          : items.filter((item) => item.account.status === "ACTIVE" || item.account.status === "PAUSED");
    csv = toCsv(
      ["Employee", "Code", "Type", "Category", "Disbursed", "Outstanding Principal", "Outstanding Interest", "EMI", "Remaining", "Status", "Start"],
      filtered.map((item) => [
        item.employeeName,
        item.employeeCode,
        item.loanTypeName,
        LOAN_CATEGORY_LABELS[item.category],
        item.account.disbursed_amount,
        item.account.outstanding_principal,
        item.account.outstanding_interest,
        item.account.emi_amount,
        item.account.remaining_installments,
        LOAN_ACCOUNT_STATUS_LABELS[item.account.status],
        item.account.start_date,
      ])
    );
    filename = kind === "advances" ? "salary-advances.csv" : kind === "outstanding" ? "outstanding-loans.csv" : "active-loans.csv";
  } else if (kind === "schedule" || kind === "overdue") {
    const catalog = await loadLoansCatalog(orgId);
    const accounts = catalog.accounts;
    const types = catalog.types;
    const employees = catalog.employees;
    const rows = catalog.schedule.filter((item) => (kind === "overdue" ? item.status === "OVERDUE" : true));
    csv = toCsv(
      ["Employee", "Loan Type", "Installment", "Due Date", "Principal", "Interest", "EMI", "Paid", "Outstanding", "Status"],
      rows.map((item) => {
        const account = accounts.find((row) => row.id === item.account_id);
        const type = types.find((row) => row.id === account?.loan_type_id);
        const employee = employees.find((row) => row.id === account?.employee_id);
        return [
          employee?.display_name ?? "",
          type?.name ?? "",
          item.installment_number,
          item.due_date,
          item.principal_amount,
          item.interest_amount,
          item.emi_amount,
          item.paid_amount,
          item.outstanding_amount,
          LOAN_INSTALLMENT_STATUS_LABELS[item.status],
        ];
      })
    );
    filename = kind === "overdue" ? "overdue-loans.csv" : "loan-schedule.csv";
  } else if (kind === "repayments") {
    const catalog = await loadLoansCatalog(orgId);
    csv = toCsv(
      ["Employee", "Loan Type", "Payment Date", "Amount", "Principal", "Interest", "Method", "Reference", "Source"],
      catalog.repayments.map((item) => {
        const account = catalog.accounts.find((row) => row.id === item.account_id);
        const type = catalog.types.find((row) => row.id === account?.loan_type_id);
        const employee = catalog.employees.find((row) => row.id === account?.employee_id);
        return [
          employee?.display_name ?? "",
          type?.name ?? "",
          item.payment_date,
          item.amount,
          item.principal_amount,
          item.interest_amount,
          LOAN_PAYMENT_METHOD_LABELS[item.payment_method],
          item.reference,
          item.source,
        ];
      })
    );
    filename = "loan-repayments.csv";
  } else {
    const overview = await loadLoansOverview(orgId, timezone);
    csv = toCsv(
      ["Employee", "Code", "Type", "Disbursed", "Outstanding", "EMI", "Paid Installments", "Remaining", "Status"],
      overview.accounts.map((item) => [
        item.employeeName,
        item.employeeCode,
        item.loanTypeName,
        item.account.disbursed_amount,
        item.account.outstanding_principal + item.account.outstanding_interest,
        item.account.emi_amount,
        item.account.paid_installments,
        item.account.remaining_installments,
        LOAN_ACCOUNT_STATUS_LABELS[item.account.status],
      ])
    );
    filename = "employee-loan-statement.csv";
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
