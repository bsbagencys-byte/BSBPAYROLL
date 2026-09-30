import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { toCsv } from "@/lib/salary/engine";
import { loadEmployeeSnapshots, loadSalaryOverview } from "@/lib/salary/query";
import {
  listAssignments,
  listReimbursements,
  listRevisions,
  listSalaryComponents,
  listSalaryStructures,
  listVariableEarnings,
} from "@/lib/salary/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { SALARY_CHANGE_TYPE_LABELS, SALARY_REVISION_STATUS_LABELS } from "@/lib/constants";
import { lookupName } from "@/lib/utils";

export async function salaryCsvResponse(
  kind: "structures" | "compensation" | "revisions" | "ctc" | "without" | "variable"
) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "salary.view")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const orgId = user.organization.id;
  const timezone = user.organization.timezone;
  let csv = "";
  let filename = "salary.csv";

  if (kind === "structures") {
    const [structures, components] = await Promise.all([listSalaryStructures(orgId), listSalaryComponents(orgId)]);
    csv = toCsv(
      ["Name", "Code", "CTC", "Status", "Effective From", "Effective To", "Components"],
      structures.map((item) => [
        item.name,
        item.code,
        item.ctc_amount,
        item.status,
        item.effective_from,
        item.effective_to,
        components.length,
      ])
    );
    filename = "salary-structures.csv";
  } else if (kind === "compensation") {
    const rows = await loadEmployeeSnapshots(orgId, timezone);
    csv = toCsv(
      ["Employee", "Code", "Structure", "Effective From", "CTC", "Gross", "Fixed", "Variable", "Deductions"],
      rows.map((item) => [
        item.employeeName,
        item.employeeCode,
        item.snapshot?.structureName ?? "",
        item.snapshot?.effectiveFrom ?? "",
        item.snapshot?.ctc ?? "",
        item.snapshot?.gross ?? "",
        item.snapshot?.fixedEarnings ?? "",
        item.snapshot?.variableEarnings ?? "",
        item.snapshot?.deductions ?? "",
      ])
    );
    filename = "employee-compensation.csv";
  } else if (kind === "revisions") {
    const [revisions, catalog, structures] = await Promise.all([
      listRevisions(orgId),
      loadOrgCatalog(orgId),
      listSalaryStructures(orgId),
    ]);
    csv = toCsv(
      ["Employee", "Code", "Previous CTC", "New CTC", "New Structure", "Effective From", "Reason", "Status"],
      revisions.map((item) => {
        const employee = catalog.employees.find((row) => row.id === item.employee_id);
        return [
          employee?.display_name ?? "",
          employee?.employee_code ?? "",
          item.previous_ctc,
          item.new_ctc,
          lookupName(structures, item.new_structure_id),
          item.effective_from,
          SALARY_CHANGE_TYPE_LABELS[item.reason] ?? item.reason,
          SALARY_REVISION_STATUS_LABELS[item.status],
        ];
      })
    );
    filename = "salary-revisions.csv";
  } else if (kind === "ctc") {
    const [assignments, catalog, structures] = await Promise.all([
      listAssignments(orgId),
      loadOrgCatalog(orgId),
      listSalaryStructures(orgId),
    ]);
    csv = toCsv(
      ["Employee", "Code", "Structure", "CTC", "Gross", "Effective From", "Effective To", "Status"],
      assignments.map((item) => {
        const employee = catalog.employees.find((row) => row.id === item.employee_id);
        return [
          employee?.display_name ?? "",
          employee?.employee_code ?? "",
          lookupName(structures, item.structure_id),
          item.ctc_amount,
          item.gross_amount,
          item.effective_from,
          item.effective_to,
          item.status,
        ];
      })
    );
    filename = "ctc-report.csv";
  } else if (kind === "without") {
    const overview = await loadSalaryOverview(orgId, timezone);
    csv = toCsv(
      ["Employee", "Code", "Status"],
      overview.withoutSalary.map((item) => [item.display_name, item.employee_code, item.status])
    );
    filename = "employees-without-salary.csv";
  } else {
    const [rows, catalog, components] = await Promise.all([
      listVariableEarnings(orgId),
      loadOrgCatalog(orgId),
      listSalaryComponents(orgId),
    ]);
    const reimbursements = await listReimbursements(orgId);
    csv = toCsv(
      ["Kind", "Employee", "Code", "Component", "Amount", "Period / Date", "Status", "Reference"],
      [
        ...rows.map((item) => {
          const employee = catalog.employees.find((row) => row.id === item.employee_id);
          return [
            "Variable",
            employee?.display_name ?? "",
            employee?.employee_code ?? "",
            lookupName(components, item.component_id),
            item.amount,
            `${item.period_from} – ${item.period_to}`,
            item.status,
            item.reference,
          ];
        }),
        ...reimbursements.map((item) => {
          const employee = catalog.employees.find((row) => row.id === item.employee_id);
          return [
            "Reimbursement",
            employee?.display_name ?? "",
            employee?.employee_code ?? "",
            lookupName(components, item.component_id),
            item.amount,
            item.entry_date,
            item.status,
            item.reference,
          ];
        }),
      ]
    );
    filename = "variable-earnings.csv";
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
