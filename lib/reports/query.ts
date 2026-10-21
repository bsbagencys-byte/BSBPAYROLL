import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadOrgCatalog } from "@/lib/org-data";
import { listEmployment } from "@/lib/leave/repository";
import { listAttendanceDays } from "@/lib/leave/attendance";
import { ensureBalanceViews, loadRequestItems } from "@/lib/leave/query";
import { loadClaimListItems } from "@/lib/claims/query";
import { listReimbursements } from "@/lib/salary/repository";
import { listRevisions } from "@/lib/salary/repository";
import { loadAccountListItems } from "@/lib/loans/query";
import { listLoanRepayments } from "@/lib/loans/repository";
import {
  listComplianceFilings,
  listPayrollItems,
  listPayrollLines,
  listPayrollRuns,
} from "@/lib/payroll/repository";
import { toPayrollItemList } from "@/lib/payroll/query";
import {
  loadExitsCatalog,
  toExitListItem,
  toInvoiceListItem,
  toSettlementListItem,
} from "@/lib/exits/query";
import {
  loadDeviceList,
  loadLogList,
  loadPunchList,
  loadUnmappedList,
} from "@/lib/biometric/query";
import { listNormalizedEvents, listRawEvents } from "@/lib/biometric/repository";
import { lookupName } from "@/lib/utils";
import { EMPLOYEE_STATUS_LABELS, PAYROLL_LINE_KIND_LABELS, PAYROLL_RUN_STATUS_LABELS, STATUTORY_HEAD_LABELS } from "@/lib/constants";
import { reportByKey, type ReportKey } from "@/lib/reports/catalog";
import type { EmployeeEmployment, ReportExportJob } from "@/types";

export type ReportFilters = {
  period?: string;
  from?: string;
  to?: string;
  branchId?: string;
  departmentId?: string;
  employeeId?: string;
  status?: string;
};

export type ReportTable = {
  key: ReportKey;
  title: string;
  description: string;
  note?: string;
  headers: string[];
  rows: Array<Array<string | number | null>>;
};

function job(employeeId: string, employment: EmployeeEmployment[]) {
  return employment.find((row) => row.employee_id === employeeId) ?? null;
}

function inRange(value: string | null | undefined, from?: string, to?: string) {
  if (!value) return !from && !to;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}

async function insertExportJob(row: ReportExportJob) {
  if (!hasSupabaseConfig() || isDemoMode()) {
    getDemoStore().reportExportJobs.unshift(row);
    return;
  }
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("report_export_jobs").insert(row);
}

export async function recordReportExport(input: {
  organizationId: string;
  reportKey: string;
  filters: ReportFilters;
  rowCount: number;
  actorId: string | null;
}) {
  await insertExportJob({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    report_key: input.reportKey,
    format: "CSV",
    filters_json: JSON.stringify(input.filters),
    row_count: input.rowCount,
    status: "COMPLETED",
    created_by: input.actorId,
    created_at: new Date().toISOString(),
  });
}

function phase4Table(key: ReportKey, title: string, description: string): ReportTable {
  return {
    key,
    title,
    description,
    note: "Phase 4 attendance calculation is not started. Late, early exit, overtime and punch-based LOP/present/absent are not produced.",
    headers: ["Message"],
    rows: [["Not calculated until Phase 4 attendance."]],
  };
}

export async function runReport(
  organizationId: string,
  key: ReportKey,
  filters: ReportFilters,
  timezone: string
): Promise<ReportTable> {
  const def = reportByKey(key);
  if (!def) throw new Error("Unknown report.");
  const [catalog, employment] = await Promise.all([loadOrgCatalog(organizationId), listEmployment(organizationId)]);
  const matchEmployee = (employeeId: string) => {
    if (filters.employeeId && employeeId !== filters.employeeId) return false;
    const row = job(employeeId, employment);
    if (filters.branchId && row?.branch_id !== filters.branchId) return false;
    if (filters.departmentId && row?.department_id !== filters.departmentId) return false;
    return true;
  };

  if (def.phase4 && (key === "attendance.late" || key === "attendance.early" || key === "attendance.overtime" || key === "attendance.present-absent")) {
    return phase4Table(key, def.title, def.description);
  }

  if (key.startsWith("hr.")) {
    const employees = catalog.employees.filter((employee) => {
      if (filters.employeeId && employee.id !== filters.employeeId) return false;
      if (filters.status && employee.status !== filters.status) return false;
      return matchEmployee(employee.id);
    });
    if (key === "hr.register") {
      return {
        key,
        title: def.title,
        description: def.description,
        headers: ["Code", "Name", "Status", "Mobile", "Department", "Designation", "Branch", "Joining"],
        rows: employees.map((employee) => {
          const row = job(employee.id, employment);
          return [
            employee.employee_code,
            employee.display_name,
            EMPLOYEE_STATUS_LABELS[employee.status],
            employee.mobile,
            lookupName(catalog.departments, row?.department_id),
            lookupName(catalog.designations, row?.designation_id),
            lookupName(catalog.branches, row?.branch_id),
            row?.joining_date ?? null,
          ];
        }),
      };
    }
    if (key === "hr.joining-exit") {
      const exitsCatalog = await loadExitsCatalog(organizationId);
      const joiners = employees
        .map((employee) => {
          const row = job(employee.id, employment);
          return {
            code: employee.employee_code,
            name: employee.display_name,
            event: "JOINING",
            date: row?.joining_date ?? "",
            department: lookupName(catalog.departments, row?.department_id),
          };
        })
        .filter((row) => inRange(row.date, filters.from, filters.to) && row.date);
      const leavers = toExitListItem(exitsCatalog)
        .filter((row) => inRange(row.exit.last_working_date, filters.from, filters.to) && matchEmployee(row.exit.employee_id))
        .map((row) => ({
          code: row.employeeCode,
          name: row.employeeName,
          event: row.exit.exit_type,
          date: row.exit.last_working_date,
          department: row.departmentName,
        }));
      return {
        key,
        title: def.title,
        description: def.description,
        headers: ["Code", "Name", "Event", "Date", "Department"],
        rows: [...joiners, ...leavers]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((row) => [row.code, row.name, row.event, row.date, row.department]),
      };
    }
    if (key === "hr.headcount") {
      const groups = new Map<string, { branch: string; department: string; count: number }>();
      for (const employee of employees) {
        const row = job(employee.id, employment);
        const branch = lookupName(catalog.branches, row?.branch_id) ?? "Unassigned";
        const department = lookupName(catalog.departments, row?.department_id) ?? "Unassigned";
        const id = `${branch}|${department}`;
        const current = groups.get(id) ?? { branch, department, count: 0 };
        current.count += 1;
        groups.set(id, current);
      }
      return {
        key,
        title: def.title,
        description: def.description,
        headers: ["Branch", "Department", "Headcount"],
        rows: [...groups.values()].map((row) => [row.branch, row.department, row.count]),
      };
    }
    const byStatus = new Map<string, number>();
    for (const employee of employees) {
      byStatus.set(employee.status, (byStatus.get(employee.status) ?? 0) + 1);
    }
    return {
      key,
      title: def.title,
      description: def.description,
      headers: ["Status", "Count"],
      rows: [...byStatus.entries()].map(([status, count]) => [EMPLOYEE_STATUS_LABELS[status as keyof typeof EMPLOYEE_STATUS_LABELS] ?? status, count]),
    };
  }

  if (key.startsWith("attendance.") || key.startsWith("biometric.")) {
    if (key === "attendance.daily" || key === "attendance.monthly" || key === "attendance.lop") {
      const days = (await listAttendanceDays(organizationId, filters.from, filters.to)).filter((row) => matchEmployee(row.employee_id));
      if (key === "attendance.lop") {
        const lop = days.filter((row) => row.status === "UNPAID_LEAVE");
        return {
          key,
          title: def.title,
          description: def.description,
          note: "These are unpaid-leave marks written by leave approval. Punch-based LOP is Phase 4.",
          headers: ["Date", "Code", "Name", "Status", "Source"],
          rows: lop.map((row) => {
            const employee = catalog.employees.find((item) => item.id === row.employee_id);
            return [row.work_date, employee?.employee_code ?? "—", employee?.display_name ?? "Unknown", row.status, row.source];
          }),
        };
      }
      if (key === "attendance.monthly") {
        const groups = new Map<string, { code: string; name: string; month: string; marks: number }>();
        for (const row of days) {
          const employee = catalog.employees.find((item) => item.id === row.employee_id);
          const month = row.work_date.slice(0, 7);
          if (filters.period && month !== filters.period) continue;
          const id = `${row.employee_id}|${month}`;
          const current = groups.get(id) ?? {
            code: employee?.employee_code ?? "—",
            name: employee?.display_name ?? "Unknown",
            month,
            marks: 0,
          };
          current.marks += 1;
          groups.set(id, current);
        }
        return {
          key,
          title: def.title,
          description: def.description,
          note: "Counts leave-written attendance_days only.",
          headers: ["Month", "Code", "Name", "Marked days"],
          rows: [...groups.values()].map((row) => [row.month, row.code, row.name, row.marks]),
        };
      }
      const filtered = days.filter((row) => !filters.status || row.status === filters.status);
      return {
        key,
        title: def.title,
        description: def.description,
        note: "Unmarked working days are treated as paid in payroll until Phase 4.",
        headers: ["Date", "Code", "Name", "Status", "Session", "Source"],
        rows: filtered.map((row) => {
          const employee = catalog.employees.find((item) => item.id === row.employee_id);
          return [row.work_date, employee?.employee_code ?? "—", employee?.display_name ?? "Unknown", row.status, row.session, row.source];
        }),
      };
    }
    if (key === "attendance.missing-punches" || key === "biometric.unmapped") {
      const unmapped = await loadUnmappedList(organizationId);
      return {
        key,
        title: def.title,
        description: def.description,
        headers: ["Device", "Device user", "Punched at", "Direction", "Status"],
        rows: unmapped.map((row) => [row.deviceName, row.deviceUserId, row.punchedAt, row.direction, row.status]),
      };
    }
    if (key === "attendance.device-events") {
      const events = await listNormalizedEvents(organizationId, 400);
      const filtered = events.filter((row) => (!filters.status || row.status === filters.status) && inRange(row.punched_at.slice(0, 10), filters.from, filters.to));
      return {
        key,
        title: def.title,
        description: def.description,
        headers: ["Device user", "Punched at", "Direction", "Status", "Vendor"],
        rows: filtered.map((row) => [row.device_user_id, row.punched_at, row.direction, row.status, row.vendor]),
      };
    }
    if (key === "biometric.devices") {
      const devices = await loadDeviceList(organizationId);
      const filtered = devices.filter((row) => !filters.status || row.status === filters.status);
      return {
        key,
        title: def.title,
        description: def.description,
        headers: ["Name", "Vendor", "Serial", "Mode", "Status", "Last seen", "Last error"],
        rows: filtered.map((row) => [row.name, row.vendor, row.serialNumber, row.connectionMode, row.status, row.lastSeenAt, row.lastError]),
      };
    }
    if (key === "biometric.punches") {
      const punches = await loadPunchList(organizationId, 400);
      const filtered = punches.filter((row) => (!filters.employeeId || row.employeeId === filters.employeeId) && inRange(row.punchedAt.slice(0, 10), filters.from, filters.to));
      return {
        key,
        title: def.title,
        description: def.description,
        headers: ["Code", "Name", "Device", "Punched at", "Direction", "Source"],
        rows: filtered.map((row) => [row.employeeCode, row.employeeName, row.deviceName, row.punchedAt, row.direction, row.source]),
      };
    }
    if (key === "biometric.failed") {
      const events = await listRawEvents(organizationId, 300);
      const failed = events.filter((row) => (row.status === "REJECTED" || Boolean(row.error_message)) && inRange(row.received_at.slice(0, 10), filters.from, filters.to));
      return {
        key,
        title: def.title,
        description: def.description,
        headers: ["Received", "Vendor", "Source", "Status", "Error"],
        rows: failed.map((row) => [row.received_at, row.vendor, row.source, row.status, row.error_message]),
      };
    }
    const logs = await loadLogList(organizationId);
    const filtered = logs.filter((row) => (!filters.status || row.status === filters.status) && inRange(row.receivedAt.slice(0, 10), filters.from, filters.to));
    return {
      key,
      title: def.title,
      description: def.description,
      headers: ["Received", "Device", "Vendor", "Source", "Status", "Error"],
      rows: filtered.map((row) => [row.receivedAt, row.deviceName, row.vendor, row.source, row.status, row.errorMessage]),
    };
  }

  if (key.startsWith("leave.")) {
    if (key === "leave.balances") {
      const rows = (await ensureBalanceViews(organizationId, timezone)).filter((row) => matchEmployee(row.employeeId));
      return {
        key,
        title: def.title,
        description: def.description,
        headers: ["Code", "Name", "Type", "Year", "Allocated", "Used", "Pending", "Available"],
        rows: rows.map((row) => [row.employeeCode, row.employeeName, row.leaveTypeName, row.year, row.allocated, row.used, row.pending, row.available]),
      };
    }
    const requests = (await loadRequestItems(organizationId, timezone)).filter((row) => {
      const employee = catalog.employees.find((item) => item.employee_code === row.employeeCode);
      if (employee && !matchEmployee(employee.id)) return false;
      if (filters.status && row.status !== filters.status) return false;
      if (!inRange(row.fromDate, filters.from, filters.to) && !inRange(row.toDate, filters.from, filters.to)) return false;
      return true;
    });
    if (key === "leave.pending") {
      const pending = requests.filter((row) => row.status === "PENDING" || row.status === "DRAFT");
      return {
        key,
        title: def.title,
        description: def.description,
        headers: ["Code", "Name", "Type", "From", "To", "Days", "Status"],
        rows: pending.map((row) => [row.employeeCode, row.employeeName, row.leaveTypeName, row.fromDate, row.toDate, row.days, row.status]),
      };
    }
    if (key === "leave.department") {
      const groups = new Map<string, number>();
      for (const row of requests.filter((item) => item.status === "APPROVED")) {
        const employee = catalog.employees.find((item) => item.employee_code === row.employeeCode);
        const dept = lookupName(catalog.departments, job(employee?.id ?? "", employment)?.department_id) ?? "Unassigned";
        groups.set(dept, (groups.get(dept) ?? 0) + Number(row.days));
      }
      return {
        key,
        title: def.title,
        description: def.description,
        headers: ["Department", "Approved days"],
        rows: [...groups.entries()].map(([department, days]) => [department, days]),
      };
    }
    return {
      key,
      title: def.title,
      description: def.description,
      headers: ["Code", "Name", "Type", "From", "To", "Days", "Status", "Reason"],
      rows: requests.map((row) => [row.employeeCode, row.employeeName, row.leaveTypeName, row.fromDate, row.toDate, row.days, row.status, row.reason]),
    };
  }

  if (key.startsWith("payroll.") || key.startsWith("compliance.")) {
    const runs = await listPayrollRuns(organizationId);
    const selected =
      (filters.period ? runs.find((row) => row.period === filters.period) : runs[0]) ?? null;
    if (key === "payroll.register") {
      const filtered = runs.filter((row) => (!filters.period || row.period === filters.period) && (!filters.status || row.status === filters.status));
      return {
        key,
        title: def.title,
        description: def.description,
        headers: ["Period", "Status", "Employees", "Included", "Gross", "Net", "Statutory", "Employer"],
        rows: filtered.map((row) => [
          row.period,
          PAYROLL_RUN_STATUS_LABELS[row.status],
          row.employee_count,
          row.included_count,
          row.total_gross,
          row.total_net,
          row.total_statutory,
          row.employer_contributions,
        ]),
      };
    }
    if (key === "payroll.revisions") {
      const revisions = await listRevisions(organizationId);
      const filtered = revisions.filter((row) => {
        if (filters.employeeId && row.employee_id !== filters.employeeId) return false;
        if (filters.status && row.status !== filters.status) return false;
        return inRange(row.effective_from, filters.from, filters.to);
      });
      return {
        key,
        title: def.title,
        description: def.description,
        headers: ["Employee", "Effective from", "Status", "Previous CTC", "New CTC", "Reason"],
        rows: filtered.map((row) => {
          const employee = catalog.employees.find((item) => item.id === row.employee_id);
          return [employee?.display_name ?? "Unknown", row.effective_from, row.status, row.previous_ctc, row.new_ctc, row.notes];
        }),
      };
    }
    if (!selected) {
      return { key, title: def.title, description: def.description, headers: ["Message"], rows: [["No payroll run yet"]] };
    }
    const [items, lines] = await Promise.all([listPayrollItems(organizationId, selected.id), listPayrollLines(organizationId, selected.id)]);
    const listed = toPayrollItemList({ items, employees: catalog.employees, departments: catalog.departments, branches: catalog.branches, employment }).filter(
      (row) => matchEmployee(row.item.employee_id)
    );
    if (key === "payroll.gross-net" || key === "payroll.cost" || key === "payroll.lop") {
      return {
        key,
        title: def.title,
        description: def.description,
        note: `Using stored totals from payroll run ${selected.period} (${PAYROLL_RUN_STATUS_LABELS[selected.status]}).`,
        headers:
          key === "payroll.lop"
            ? ["Code", "Name", "Paid days", "LOP days", "Net"]
            : key === "payroll.cost"
              ? ["Code", "Name", "Department", "Net", "Employer cost"]
              : ["Code", "Name", "Department", "Earnings", "Deductions", "Statutory", "Net"],
        rows: listed.map((row) =>
          key === "payroll.lop"
            ? [row.employeeCode, row.employeeName, row.item.paid_days, row.item.lop_days, row.item.net_pay]
            : key === "payroll.cost"
              ? [row.employeeCode, row.employeeName, row.departmentName, row.item.net_pay, row.item.employer_cost]
              : [
                  row.employeeCode,
                  row.employeeName,
                  row.departmentName,
                  row.item.earnings + row.item.variable_earnings,
                  row.item.deductions,
                  row.item.statutory_total,
                  row.item.net_pay,
                ]
        ),
      };
    }
    if (key === "payroll.components" || key === "payroll.earnings" || key === "payroll.deductions" || key === "payroll.arrears") {
      const wanted =
        key === "payroll.earnings"
          ? ["EARNING", "REIMBURSEMENT", "CLAIM"]
          : key === "payroll.deductions"
            ? ["DEDUCTION", "LOAN", "STATUTORY", "ADJUSTMENT"]
            : key === "payroll.arrears"
              ? ["ADJUSTMENT"]
              : null;
      const mapped = lines
        .filter((line) => listed.some((row) => row.item.id === line.item_id))
        .filter((line) => !wanted || wanted.includes(line.kind))
        .filter((line) => key !== "payroll.arrears" || line.code === "ADJ_EARN")
        .map((line) => {
          const row = listed.find((item) => item.item.id === line.item_id);
          return [row?.employeeCode ?? "—", row?.employeeName ?? "Unknown", PAYROLL_LINE_KIND_LABELS[line.kind], line.code, line.name, line.amount];
        });
      return {
        key,
        title: def.title,
        description: def.description,
        note: `Lines from payroll run ${selected.period}.`,
        headers: ["Code", "Name", "Kind", "Component", "Head", "Amount"],
        rows: mapped,
      };
    }
    if (key === "payroll.variance") {
      const previous = runs.find((row) => row.period < selected.period) ?? null;
      const prevItems = previous ? await listPayrollItems(organizationId, previous.id) : [];
      return {
        key,
        title: def.title,
        description: def.description,
        note: previous ? `Compared with ${previous.period}.` : "No previous run to compare.",
        headers: ["Code", "Name", "Current net", "Previous net", "Variance"],
        rows: listed.map((row) => {
          const prior = prevItems.find((item) => item.employee_id === row.item.employee_id);
          const previousNet = prior?.net_pay ?? 0;
          return [row.employeeCode, row.employeeName, row.item.net_pay, previousNet, row.item.net_pay - previousNet];
        }),
      };
    }
    const filings = await listComplianceFilings(organizationId, selected.id);
    if (key === "compliance.employer") {
      return {
        key,
        title: def.title,
        description: def.description,
        note: `Employer amounts from payroll items in ${selected.period}.`,
        headers: ["Code", "Name", "PF employer", "ESI employer", "LWF employer", "Employer cost"],
        rows: listed.map((row) => [
          row.employeeCode,
          row.employeeName,
          row.item.pf_employer,
          row.item.esi_employer,
          row.item.lwf_employer,
          row.item.employer_cost,
        ]),
      };
    }
    const head = key.split(".")[1]?.toUpperCase() as "PF" | "ESI" | "PT" | "LWF" | "TDS";
    const filtered = filings.filter((row) => row.head === head);
    return {
      key,
      title: def.title,
      description: def.description,
      note: "Uses compliance_filings generated when payroll is processed. Seed versions remain unverified.",
      headers: ["Head", "Period", "Employees", "Employee amount", "Employer amount", "Total", "Status"],
      rows: filtered.map((row) => [
        STATUTORY_HEAD_LABELS[row.head],
        row.period,
        row.employee_count,
        row.employee_amount,
        row.employer_amount,
        row.total_amount,
        row.status,
      ]),
    };
  }

  if (key.startsWith("claims.") || key.startsWith("loans.")) {
    if (key === "claims.register" || key === "claims.reimbursement") {
      const claims = (await loadClaimListItems(organizationId)).filter((row) => {
        if (!matchEmployee(row.claim.employee_id)) return false;
        if (filters.status && row.claim.status !== filters.status) return false;
        return inRange(row.claim.claim_date, filters.from, filters.to);
      });
      if (key === "claims.reimbursement") {
        const reimbursements = await listReimbursements(organizationId);
        const rows = reimbursements.filter((row) => matchEmployee(row.employee_id) && inRange(row.entry_date, filters.from, filters.to));
        return {
          key,
          title: def.title,
          description: def.description,
          headers: ["Date", "Code", "Name", "Source", "Amount", "Status"],
          rows: [
            ...claims
              .filter((row) => row.claim.status === "APPROVED" || row.claim.status === "PAID")
              .map((row) => [
                row.claim.claim_date,
                row.employeeCode,
                row.employeeName,
                row.claimTypeName,
                row.claim.approved_amount ?? row.claim.submitted_amount,
                row.claim.status,
              ]),
            ...rows.map((row) => {
              const employee = catalog.employees.find((item) => item.id === row.employee_id);
              return [row.entry_date, employee?.employee_code ?? "—", employee?.display_name ?? "Unknown", "Reimbursement", row.amount, row.status];
            }),
          ],
        };
      }
      return {
        key,
        title: def.title,
        description: def.description,
        headers: ["Date", "Code", "Name", "Type", "Amount", "Status"],
        rows: claims.map((row) => [
          row.claim.claim_date,
          row.employeeCode,
          row.employeeName,
          row.claimTypeName,
          row.claim.approved_amount ?? row.claim.submitted_amount,
          row.claim.status,
        ]),
      };
    }
    if (key === "loans.outstanding") {
      const accounts = (await loadAccountListItems(organizationId, timezone)).filter((row) => {
        if (!matchEmployee(row.account.employee_id)) return false;
        if (filters.status && row.account.status !== filters.status) return false;
        return true;
      });
      return {
        key,
        title: def.title,
        description: def.description,
        headers: ["Code", "Name", "Type", "Status", "Principal outstanding", "Interest outstanding"],
        rows: accounts.map((row) => [
          row.employeeCode,
          row.employeeName,
          row.loanTypeName,
          row.account.status,
          row.account.outstanding_principal,
          row.account.outstanding_interest,
        ]),
      };
    }
    const repayments = await listLoanRepayments(organizationId);
    const accounts = await loadAccountListItems(organizationId, timezone);
    return {
      key,
      title: def.title,
      description: def.description,
      headers: ["Date", "Code", "Name", "Amount", "Source", "Reference"],
      rows: repayments
        .filter((row) => inRange(row.payment_date, filters.from, filters.to))
        .map((row) => {
          const account = accounts.find((item) => item.account.id === row.account_id);
          return [
            row.payment_date,
            account?.employeeCode ?? "—",
            account?.employeeName ?? "Unknown",
            row.amount,
            row.source,
            row.reference,
          ];
        }),
    };
  }

  const exitsCatalog = await loadExitsCatalog(organizationId);
  if (key === "exits.register") {
    const rows = toExitListItem(exitsCatalog).filter((row) => {
      if (!matchEmployee(row.exit.employee_id)) return false;
      if (filters.status && row.exit.status !== filters.status) return false;
      return inRange(row.exit.last_working_date, filters.from, filters.to);
    });
    return {
      key,
      title: def.title,
      description: def.description,
      headers: ["Code", "Name", "Type", "LWD", "Status", "Department"],
      rows: rows.map((row) => [row.employeeCode, row.employeeName, row.exit.exit_type, row.exit.last_working_date, row.exit.status, row.departmentName]),
    };
  }
  if (key === "exits.settlements") {
    const rows = toSettlementListItem(exitsCatalog).filter((row) => !filters.status || row.settlement.status === filters.status);
    return {
      key,
      title: def.title,
      description: def.description,
      headers: ["Code", "Name", "Status", "Net payable", "Paid", "Outstanding"],
      rows: rows.map((row) => [
        row.employeeCode,
        row.employeeName,
        row.settlement.status,
        row.settlement.net_payable,
        row.settlement.paid_amount,
        row.settlement.net_payable - row.settlement.paid_amount,
      ]),
    };
  }
  if (key === "contractors.invoices") {
    const rows = toInvoiceListItem(exitsCatalog).filter(
      (row) => (!filters.status || row.invoice.status === filters.status) && inRange(row.invoice.invoice_date, filters.from, filters.to)
    );
    return {
      key,
      title: def.title,
      description: def.description,
      headers: ["Invoice", "Contractor", "Date", "Gross", "Withholding", "Net", "Paid", "Status"],
      rows: rows.map((row) => [
        row.invoice.invoice_number,
        row.contractorName,
        row.invoice.invoice_date,
        row.invoice.gross_amount,
        row.invoice.withholding_amount,
        row.invoice.net_payable,
        row.invoice.paid_amount,
        row.invoice.status,
      ]),
    };
  }
  return {
    key,
    title: def.title,
    description: def.description,
    headers: ["Date", "Contractor invoice", "Amount", "Method", "Reference"],
    rows: exitsCatalog.invoicePayments
      .filter((row) => inRange(row.payment_date, filters.from, filters.to))
      .map((row) => {
        const invoice = exitsCatalog.invoices.find((item) => item.id === row.invoice_id);
        return [row.payment_date, invoice?.invoice_number ?? "—", row.amount, row.method, row.reference];
      }),
  };
}
