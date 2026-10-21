import type { PermissionCode } from "@/lib/constants";

export type ReportGroup =
  | "hr"
  | "attendance"
  | "leave"
  | "payroll"
  | "compliance"
  | "claims"
  | "exits"
  | "biometric";

export type ReportKey =
  | "hr.register"
  | "hr.joining-exit"
  | "hr.headcount"
  | "hr.status"
  | "attendance.daily"
  | "attendance.monthly"
  | "attendance.present-absent"
  | "attendance.late"
  | "attendance.early"
  | "attendance.overtime"
  | "attendance.lop"
  | "attendance.missing-punches"
  | "attendance.device-events"
  | "leave.register"
  | "leave.balances"
  | "leave.pending"
  | "leave.department"
  | "payroll.register"
  | "payroll.components"
  | "payroll.gross-net"
  | "payroll.earnings"
  | "payroll.deductions"
  | "payroll.lop"
  | "payroll.arrears"
  | "payroll.revisions"
  | "payroll.variance"
  | "payroll.cost"
  | "compliance.pf"
  | "compliance.esi"
  | "compliance.pt"
  | "compliance.lwf"
  | "compliance.tds"
  | "compliance.employer"
  | "claims.register"
  | "claims.reimbursement"
  | "loans.outstanding"
  | "loans.repayments"
  | "exits.register"
  | "exits.settlements"
  | "contractors.invoices"
  | "contractors.payments"
  | "biometric.devices"
  | "biometric.punches"
  | "biometric.unmapped"
  | "biometric.failed"
  | "biometric.logs";

export type ReportDef = {
  key: ReportKey;
  group: ReportGroup;
  title: string;
  description: string;
  permission: PermissionCode;
  filters: Array<"period" | "from" | "to" | "branch" | "department" | "employee" | "status">;
  phase4?: boolean;
};

export const REPORT_GROUPS: Array<{ id: ReportGroup; title: string; description: string }> = [
  { id: "hr", title: "HR", description: "Employee register, joining/exit and headcount." },
  { id: "attendance", title: "Attendance", description: "Leave-written days and punch ingest. Phase 4 late/OT/LOP is not calculated yet." },
  { id: "leave", title: "Leave", description: "Requests, balances and department summaries." },
  { id: "payroll", title: "Payroll", description: "Register, components and cost from finalized payroll rows." },
  { id: "compliance", title: "Compliance", description: "PF, ESI, PT, LWF, TDS from Phase 11 filings and results." },
  { id: "claims", title: "Claims & Loans", description: "Claims register, reimbursements, outstanding loans and repayments." },
  { id: "exits", title: "Exit & Contractors", description: "Exits, settlements, contractor invoices and payments." },
  { id: "biometric", title: "Biometric", description: "Device health, punches, unmapped users and ingest logs." },
];

export const REPORTS: ReportDef[] = [
  { key: "hr.register", group: "hr", title: "Employee register", description: "All employees with branch, department, designation and status.", permission: "employee.view", filters: ["branch", "department", "status", "employee"] },
  { key: "hr.joining-exit", group: "hr", title: "Joining / exit", description: "Joiners from employment dates and recorded exits.", permission: "employee.view", filters: ["from", "to", "branch", "department"] },
  { key: "hr.headcount", group: "hr", title: "Department / branch headcount", description: "Active headcount grouped by department and branch.", permission: "employee.view", filters: ["branch", "department", "status"] },
  { key: "hr.status", group: "hr", title: "Employment status", description: "Employees grouped by employment status.", permission: "employee.view", filters: ["status", "branch"] },
  { key: "attendance.daily", group: "attendance", title: "Daily register", description: "Leave-written attendance_days. Unmarked working days are not calculated until Phase 4.", permission: "attendance.view", filters: ["from", "to", "branch", "department", "employee", "status"] },
  { key: "attendance.monthly", group: "attendance", title: "Monthly register", description: "Day marks rolled up by employee and month.", permission: "attendance.view", filters: ["period", "branch", "department", "employee"] },
  { key: "attendance.present-absent", group: "attendance", title: "Present / absent", description: "PRESENT and ABSENT marks only. Phase 4 will fill these from punches.", permission: "attendance.view", filters: ["from", "to", "employee"], phase4: true },
  { key: "attendance.late", group: "attendance", title: "Late", description: "Not calculated. Phase 4 attendance engine is not started.", permission: "attendance.view", filters: ["from", "to"], phase4: true },
  { key: "attendance.early", group: "attendance", title: "Early exit", description: "Not calculated. Phase 4 attendance engine is not started.", permission: "attendance.view", filters: ["from", "to"], phase4: true },
  { key: "attendance.overtime", group: "attendance", title: "Overtime", description: "Not calculated. Phase 4 attendance engine is not started.", permission: "attendance.view", filters: ["from", "to"], phase4: true },
  { key: "attendance.lop", group: "attendance", title: "LOP", description: "Unpaid leave marks from attendance_days. Punch-based LOP waits for Phase 4.", permission: "attendance.view", filters: ["from", "to", "employee"] },
  { key: "attendance.missing-punches", group: "attendance", title: "Missing punches", description: "Normalized events that stayed UNMAPPED, plus days with no punch (informational).", permission: "biometric.view", filters: ["from", "to"] },
  { key: "attendance.device-events", group: "attendance", title: "Device events", description: "Normalized biometric events.", permission: "biometric.view", filters: ["from", "to", "status"] },
  { key: "leave.register", group: "leave", title: "Leave register", description: "All leave requests.", permission: "leave.view", filters: ["from", "to", "branch", "department", "employee", "status"] },
  { key: "leave.balances", group: "leave", title: "Leave balances", description: "Current leave balance views.", permission: "leave.view", filters: ["employee", "department"] },
  { key: "leave.pending", group: "leave", title: "Pending requests", description: "Submitted / pending-approval leave.", permission: "leave.view", filters: ["branch", "department"] },
  { key: "leave.department", group: "leave", title: "Department summary", description: "Approved leave days by department.", permission: "leave.view", filters: ["from", "to", "department"] },
  { key: "payroll.register", group: "payroll", title: "Payroll register", description: "Payroll runs with totals. Uses stored run totals, not a second engine.", permission: "payroll.view", filters: ["period", "status"] },
  { key: "payroll.components", group: "payroll", title: "Salary components", description: "Payroll lines for the selected period.", permission: "payroll.view", filters: ["period", "branch", "department", "employee"] },
  { key: "payroll.gross-net", group: "payroll", title: "Gross to net", description: "Included employees with earnings, deductions and net from payroll items.", permission: "payroll.view", filters: ["period", "branch", "department", "employee"] },
  { key: "payroll.earnings", group: "payroll", title: "Earnings", description: "Earning, reimbursement and claim lines.", permission: "payroll.view", filters: ["period", "employee"] },
  { key: "payroll.deductions", group: "payroll", title: "Deductions", description: "Deduction, loan and statutory lines.", permission: "payroll.view", filters: ["period", "employee"] },
  { key: "payroll.lop", group: "payroll", title: "Payroll LOP", description: "LOP days stored on payroll items.", permission: "payroll.view", filters: ["period", "employee"] },
  { key: "payroll.arrears", group: "payroll", title: "Arrears", description: "Adjustment earning lines posted on a run.", permission: "payroll.view", filters: ["period"] },
  { key: "payroll.revisions", group: "payroll", title: "Salary revisions", description: "Salary revision history.", permission: "salary.history.view", filters: ["from", "to", "employee", "status"] },
  { key: "payroll.variance", group: "payroll", title: "Payroll variance", description: "Net pay compared with the previous run, when one exists.", permission: "payroll.view", filters: ["period"] },
  { key: "payroll.cost", group: "payroll", title: "Employee cost", description: "Net plus employer contributions from payroll items.", permission: "payroll.view", filters: ["period", "branch", "department"] },
  { key: "compliance.pf", group: "compliance", title: "PF", description: "PF filings generated from payroll process.", permission: "compliance.view", filters: ["period"] },
  { key: "compliance.esi", group: "compliance", title: "ESI", description: "ESI filings generated from payroll process.", permission: "compliance.view", filters: ["period"] },
  { key: "compliance.pt", group: "compliance", title: "PT", description: "Professional tax filings.", permission: "compliance.view", filters: ["period"] },
  { key: "compliance.lwf", group: "compliance", title: "LWF", description: "Labour welfare fund filings.", permission: "compliance.view", filters: ["period"] },
  { key: "compliance.tds", group: "compliance", title: "TDS", description: "TDS filings.", permission: "compliance.view", filters: ["period"] },
  { key: "compliance.employer", group: "compliance", title: "Employer contributions", description: "Employer PF/ESI/LWF from payroll items.", permission: "compliance.view", filters: ["period"] },
  { key: "claims.register", group: "claims", title: "Claims register", description: "All claims with type and status.", permission: "claims.view", filters: ["from", "to", "employee", "status", "department"] },
  { key: "claims.reimbursement", group: "claims", title: "Reimbursement summary", description: "Approved claims and reimbursement entries.", permission: "claims.view", filters: ["from", "to", "employee"] },
  { key: "loans.outstanding", group: "claims", title: "Outstanding loans", description: "Active loan accounts and outstanding principal.", permission: "loans.view", filters: ["employee", "status"] },
  { key: "loans.repayments", group: "claims", title: "Repayment history", description: "Loan repayments including payroll recoveries.", permission: "loans.view", filters: ["from", "to", "employee"] },
  { key: "exits.register", group: "exits", title: "Exit register", description: "Employee exits.", permission: "exits.view", filters: ["from", "to", "status", "department"] },
  { key: "exits.settlements", group: "exits", title: "Settlement outstanding", description: "Settlements with net payable and paid amount.", permission: "settlements.view", filters: ["status"] },
  { key: "contractors.invoices", group: "exits", title: "Contractor invoices", description: "Contractor invoices and withholding.", permission: "contractors.view", filters: ["from", "to", "status"] },
  { key: "contractors.payments", group: "exits", title: "Contractor payments", description: "Recorded contractor payment rows.", permission: "contractors.view", filters: ["from", "to"] },
  { key: "biometric.devices", group: "biometric", title: "Device health", description: "Devices and last-seen status.", permission: "biometric.view", filters: ["status"] },
  { key: "biometric.punches", group: "biometric", title: "Raw punches", description: "Mapped attendance punches.", permission: "biometric.view", filters: ["from", "to", "employee"] },
  { key: "biometric.unmapped", group: "biometric", title: "Unmapped users", description: "Normalized events waiting for identity maps.", permission: "biometric.view", filters: ["from", "to"] },
  { key: "biometric.failed", group: "biometric", title: "Failed events", description: "Raw ingest events in error.", permission: "biometric.view", filters: ["from", "to"] },
  { key: "biometric.logs", group: "biometric", title: "Sync logs", description: "Recent raw ingest log.", permission: "biometric.view", filters: ["from", "to", "status"] },
];

export function reportByKey(key: string) {
  return REPORTS.find((item) => item.key === key) ?? null;
}
