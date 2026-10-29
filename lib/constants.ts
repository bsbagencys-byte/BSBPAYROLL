export const APP_NAME = "BSB Payroll";
export const APP_TAGLINE = "Payroll operations, organised.";
export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_CURRENCY_SYMBOL = "₹";
export const AUTH_EMAIL_DOMAIN =
  process.env.AUTH_EMAIL_DOMAIN ?? "auth.bsbpayroll.internal";

export const ROLE_CODES = [
  "SUPER_ADMIN",
  "ADMIN",
  "HR",
  "PAYROLL",
  "ACCOUNTANT",
  "MANAGER",
  "EMPLOYEE",
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export const ROLE_LABELS: Record<RoleCode, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  HR: "HR",
  PAYROLL: "Payroll",
  ACCOUNTANT: "Accountant",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

export const PERMISSIONS = [
  { code: "organization.view", group: "Organization", label: "View organization" },
  { code: "organization.edit", group: "Organization", label: "Edit organization" },
  { code: "user.view", group: "Users", label: "View users" },
  { code: "user.create", group: "Users", label: "Create users" },
  { code: "user.edit", group: "Users", label: "Edit users" },
  { code: "user.disable", group: "Users", label: "Disable users" },
  { code: "employee.view", group: "Employees", label: "View employees" },
  { code: "employee.create", group: "Employees", label: "Create employees" },
  { code: "employee.edit", group: "Employees", label: "Edit employees" },
  { code: "employee.disable", group: "Employees", label: "Disable employees" },
  { code: "employee.documents", group: "Employees", label: "Manage employee documents" },
  { code: "employee.import", group: "Employees", label: "Import employees" },
  { code: "organization.branch.manage", group: "Organization", label: "Manage branches" },
  { code: "organization.department.manage", group: "Organization", label: "Manage departments" },
  { code: "organization.designation.manage", group: "Organization", label: "Manage designations" },
  { code: "attendance.view", group: "Attendance", label: "View attendance" },
  { code: "payroll.view", group: "Payroll", label: "View payroll" },
  { code: "payroll.process", group: "Payroll", label: "Process payroll" },
  { code: "payroll.lock", group: "Payroll", label: "Lock and unlock payroll" },
  { code: "payroll.review", group: "Payroll", label: "Review payroll" },
  { code: "payroll.approve", group: "Payroll", label: "Approve payroll" },
  { code: "payroll.reject", group: "Payroll", label: "Reject payroll" },
  { code: "payroll.finalize", group: "Payroll", label: "Finalize payroll" },
  { code: "payroll.adjust", group: "Payroll", label: "Create payroll adjustments" },
  { code: "payroll.payslip.view", group: "Payroll", label: "View payslips" },
  { code: "payroll.export", group: "Payroll", label: "Export payroll" },
  { code: "payroll.settings", group: "Payroll", label: "Manage payroll settings" },
  { code: "payslip.generate", group: "Payroll", label: "Generate payslips" },
  { code: "payslip.export", group: "Payroll", label: "Export payslips" },
  { code: "compliance.view", group: "Compliance", label: "View compliance" },
  { code: "compliance.export", group: "Compliance", label: "Export compliance" },
  { code: "compliance.manage", group: "Compliance", label: "Manage compliance filings" },
  { code: "compliance.rules.manage", group: "Compliance", label: "Manage statutory rule versions" },
  { code: "compliance.tax.manage", group: "Compliance", label: "Manage tax declarations and TDS" },
  { code: "compliance.proofs.review", group: "Compliance", label: "Review tax proofs" },
  { code: "settings.manage", group: "Settings", label: "Manage settings" },
  { code: "biometric.view", group: "Biometric", label: "View biometric devices and punches" },
  { code: "biometric.manage", group: "Biometric", label: "Manage biometric devices" },
  { code: "biometric.mapping", group: "Biometric", label: "Map device users to employees" },
  { code: "leave.view", group: "Leave", label: "View leave" },
  { code: "leave.request", group: "Leave", label: "Submit leave requests" },
  { code: "leave.approve", group: "Leave", label: "Approve leave requests" },
  { code: "leave.manage", group: "Leave", label: "Manage leave records" },
  { code: "leave.balance.manage", group: "Leave", label: "Adjust leave balances" },
  { code: "leave.policy.manage", group: "Leave", label: "Manage leave policies" },
  { code: "leave.calendar.manage", group: "Leave", label: "Manage holidays" },
  { code: "leave.comp_off.manage", group: "Leave", label: "Manage comp-off" },
  { code: "salary.view", group: "Salary", label: "View salary" },
  { code: "salary.manage", group: "Salary", label: "Assign and edit employee salary" },
  { code: "salary.component.manage", group: "Salary", label: "Manage salary components" },
  { code: "salary.structure.manage", group: "Salary", label: "Manage salary structures" },
  { code: "salary.revision.create", group: "Salary", label: "Create salary revisions" },
  { code: "salary.revision.approve", group: "Salary", label: "Approve salary revisions" },
  { code: "salary.history.view", group: "Salary", label: "View salary history" },
  { code: "benefits.view", group: "Benefits", label: "View benefits" },
  { code: "benefits.manage", group: "Benefits", label: "Manage benefit types and policies" },
  { code: "benefits.assign", group: "Benefits", label: "Assign employee benefits" },
  { code: "claims.view", group: "Claims", label: "View claims" },
  { code: "claims.create", group: "Claims", label: "Create claims" },
  { code: "claims.edit", group: "Claims", label: "Edit claims" },
  { code: "claims.approve", group: "Claims", label: "Approve claims" },
  { code: "claims.manage", group: "Claims", label: "Manage claims" },
  { code: "claims.export", group: "Claims", label: "Export claims" },
  { code: "loans.view", group: "Loans", label: "View loans" },
  { code: "loans.create", group: "Loans", label: "Create loan applications" },
  { code: "loans.edit", group: "Loans", label: "Edit loan applications" },
  { code: "loans.approve", group: "Loans", label: "Approve loans" },
  { code: "loans.disburse", group: "Loans", label: "Disburse loans" },
  { code: "loans.repayment.manage", group: "Loans", label: "Record loan repayments" },
  { code: "loans.adjust", group: "Loans", label: "Adjust, waive or defer loans" },
  { code: "loans.export", group: "Loans", label: "Export loans" },
  { code: "loans.settings", group: "Loans", label: "Manage loan types and policies" },
  { code: "exits.view", group: "Exits", label: "View employee exits" },
  { code: "exits.create", group: "Exits", label: "Create employee exits" },
  { code: "exits.edit", group: "Exits", label: "Edit employee exits" },
  { code: "exits.approve", group: "Exits", label: "Approve employee exits" },
  { code: "exits.cancel", group: "Exits", label: "Cancel employee exits" },
  { code: "exits.export", group: "Exits", label: "Export employee exits" },
  { code: "clearance.view", group: "Exits", label: "View exit clearance" },
  { code: "clearance.manage", group: "Exits", label: "Manage exit clearance" },
  { code: "settlements.view", group: "Settlements", label: "View settlements" },
  { code: "settlements.calculate", group: "Settlements", label: "Calculate settlements" },
  { code: "settlements.review", group: "Settlements", label: "Review settlements" },
  { code: "settlements.approve", group: "Settlements", label: "Approve settlements" },
  { code: "settlements.finalize", group: "Settlements", label: "Finalize settlements" },
  { code: "settlements.pay", group: "Settlements", label: "Record settlement payments" },
  { code: "settlements.adjust", group: "Settlements", label: "Adjust settlements" },
  { code: "settlements.export", group: "Settlements", label: "Export settlements" },
  { code: "contractors.view", group: "Contractors", label: "View contractors" },
  { code: "contractors.manage", group: "Contractors", label: "Manage contractors" },
  { code: "contractors.engagements.manage", group: "Contractors", label: "Manage contractor engagements" },
  { code: "contractors.invoices.create", group: "Contractors", label: "Create contractor invoices" },
  { code: "contractors.invoices.approve", group: "Contractors", label: "Approve contractor invoices" },
  { code: "contractors.pay", group: "Contractors", label: "Record contractor payments" },
  { code: "contractors.withholding.manage", group: "Contractors", label: "Manage contractor withholding" },
  { code: "contractors.export", group: "Contractors", label: "Export contractor data" },
  { code: "self.view", group: "Self Service", label: "Access self-service portal" },
  { code: "self.profile.update", group: "Self Service", label: "Request profile changes" },
  { code: "self.change_request.review", group: "Self Service", label: "Review profile change requests" },
  { code: "self.notifications.manage", group: "Self Service", label: "Send self-service notifications" },
  { code: "reports.view", group: "Reports", label: "View reports" },
  { code: "reports.export", group: "Reports", label: "Export reports" },
  { code: "accounting.manage", group: "Accounting", label: "Manage ledger accounts and mappings" },
  { code: "accounting.journal.view", group: "Accounting", label: "View payroll journals" },
  { code: "accounting.journal.export", group: "Accounting", label: "Export payroll journals" },
  { code: "payments.view", group: "Payments", label: "View salary payment batches" },
  { code: "payments.create", group: "Payments", label: "Create and validate payment batches" },
  { code: "payments.approve", group: "Payments", label: "Approve payment batches" },
  { code: "payments.export", group: "Payments", label: "Export bank payment files" },
  { code: "payments.reconcile", group: "Payments", label: "Record and reconcile payments" },
  { code: "notifications.view", group: "Notifications", label: "View own notifications" },
  { code: "notifications.manage", group: "Notifications", label: "Manage notification templates and preferences" },
  { code: "automation.view", group: "Automation", label: "View automation rules and jobs" },
  { code: "automation.manage", group: "Automation", label: "Manage automation rules" },
  { code: "automation.jobs.view", group: "Automation", label: "View scheduled job executions" },
  { code: "automation.jobs.retry", group: "Automation", label: "Retry or cancel scheduled jobs" },
  { code: "developers.view", group: "Developers", label: "View developer settings" },
  { code: "developers.webhooks.manage", group: "Developers", label: "Manage webhook endpoints" },
  { code: "developers.webhooks.replay", group: "Developers", label: "Replay webhook deliveries" },
  { code: "developers.api_keys.manage", group: "Developers", label: "Manage API keys" },
  { code: "developers.logs.view", group: "Developers", label: "View API and webhook logs" },
  { code: "analytics.view", group: "Analytics", label: "View analytics dashboards" },
  { code: "analytics.export", group: "Analytics", label: "Export analytics reports" },
  { code: "analytics.alerts.manage", group: "Analytics", label: "Acknowledge and resolve analytics alerts" },
  { code: "analytics.thresholds.manage", group: "Analytics", label: "Manage analytics anomaly thresholds" },
  { code: "analytics.assistant.use", group: "Analytics", label: "Use the optional analytics assistant" },
  { code: "subscriptions.view", group: "Billing", label: "View organization subscription" },
  { code: "subscriptions.manage", group: "Billing", label: "Manage organization subscriptions" },
  { code: "plans.manage", group: "Billing", label: "Manage subscription plans" },
  { code: "billing.view", group: "Billing", label: "View subscription invoices and usage" },
  { code: "billing.invoice.manage", group: "Billing", label: "Issue and void subscription invoices" },
  { code: "billing.payment.view", group: "Billing", label: "View subscription payment transactions" },
  { code: "billing.refund.manage", group: "Billing", label: "Record verified subscription refunds" },
  { code: "subscription.override", group: "Billing", label: "Override entitlements and subscription status" },
  { code: "onboarding.view", group: "Onboarding", label: "View onboarding checklist" },
  { code: "onboarding.manage", group: "Onboarding", label: "Manage onboarding progress" },
  { code: "migration.view", group: "Migration", label: "View data migration jobs" },
  { code: "migration.manage", group: "Migration", label: "Preview and confirm data imports" },
  { code: "support.view", group: "Support", label: "View support tickets" },
  { code: "support.create", group: "Support", label: "Create support tickets" },
  { code: "support.manage", group: "Support", label: "Update organization support tickets" },
  { code: "support.platform", group: "Support", label: "Manage platform support across organizations" },
  { code: "data.export", group: "Data", label: "Request organization data export" },
  { code: "data.offboard", group: "Data", label: "Request organization offboarding" },
  { code: "platform.ops", group: "Platform", label: "View platform operations" },
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number]["code"];

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleCode, PermissionCode[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.code),
  ADMIN: PERMISSIONS.map((p) => p.code).filter(
    (code) =>
      code !== "plans.manage" &&
      code !== "subscription.override" &&
      code !== "billing.invoice.manage" &&
      code !== "billing.refund.manage" &&
      code !== "support.platform" &&
      code !== "platform.ops" &&
      code !== "data.offboard"
  ),
  HR: [
    "organization.view",
    "user.view",
    "user.create",
    "user.edit",
    "employee.view",
    "employee.create",
    "employee.edit",
    "employee.disable",
    "employee.documents",
    "employee.import",
    "organization.branch.manage",
    "organization.department.manage",
    "organization.designation.manage",
    "attendance.view",
    "payroll.view",
    "payroll.review",
    "payroll.approve",
    "payroll.reject",
    "payroll.payslip.view",
    "payroll.export",
    "payslip.export",
    "compliance.view",
    "compliance.export",
    "compliance.manage",
    "compliance.rules.manage",
    "compliance.tax.manage",
    "compliance.proofs.review",
    "settings.manage",
    "biometric.view",
    "biometric.manage",
    "biometric.mapping",
    "leave.view",
    "leave.request",
    "leave.approve",
    "leave.manage",
    "leave.balance.manage",
    "leave.policy.manage",
    "leave.calendar.manage",
    "leave.comp_off.manage",
    "salary.view",
    "salary.manage",
    "salary.component.manage",
    "salary.structure.manage",
    "salary.revision.create",
    "salary.revision.approve",
    "salary.history.view",
    "benefits.view",
    "benefits.manage",
    "benefits.assign",
    "claims.view",
    "claims.create",
    "claims.edit",
    "claims.approve",
    "claims.manage",
    "claims.export",
    "loans.view",
    "loans.create",
    "loans.edit",
    "loans.approve",
    "loans.disburse",
    "loans.repayment.manage",
    "loans.adjust",
    "loans.export",
    "loans.settings",
    "exits.view",
    "exits.create",
    "exits.edit",
    "exits.approve",
    "exits.cancel",
    "exits.export",
    "clearance.view",
    "clearance.manage",
    "settlements.view",
    "settlements.calculate",
    "settlements.review",
    "settlements.approve",
    "settlements.finalize",
    "settlements.pay",
    "settlements.adjust",
    "settlements.export",
    "contractors.view",
    "contractors.manage",
    "contractors.engagements.manage",
    "contractors.invoices.create",
    "contractors.invoices.approve",
    "contractors.pay",
    "contractors.withholding.manage",
    "contractors.export",
    "self.view",
    "self.profile.update",
    "self.change_request.review",
    "self.notifications.manage",
    "reports.view",
    "reports.export",
    "notifications.view",
    "notifications.manage",
    "automation.view",
    "automation.manage",
    "automation.jobs.view",
    "automation.jobs.retry",
    "analytics.view",
    "analytics.export",
    "analytics.alerts.manage",
    "analytics.thresholds.manage",
    "analytics.assistant.use",
    "subscriptions.view",
    "billing.view",
    "billing.payment.view",
    "onboarding.view",
    "onboarding.manage",
    "migration.view",
    "migration.manage",
    "support.view",
    "support.create",
    "support.manage",
    "data.export",
  ],
  PAYROLL: [
    "organization.view",
    "user.view",
    "employee.view",
    "attendance.view",
    "payroll.view",
    "payroll.process",
    "payroll.lock",
    "payroll.review",
    "payroll.approve",
    "payroll.reject",
    "payroll.finalize",
    "payroll.adjust",
    "payroll.payslip.view",
    "payroll.export",
    "payroll.settings",
    "payslip.generate",
    "payslip.export",
    "compliance.view",
    "compliance.export",
    "biometric.view",
    "leave.view",
    "salary.view",
    "salary.manage",
    "salary.revision.create",
    "salary.history.view",
    "benefits.view",
    "claims.view",
    "claims.approve",
    "claims.export",
    "loans.view",
    "loans.disburse",
    "loans.repayment.manage",
    "loans.export",
    "exits.view",
    "exits.export",
    "clearance.view",
    "settlements.view",
    "settlements.calculate",
    "settlements.export",
    "contractors.view",
    "contractors.export",
    "self.view",
    "self.profile.update",
    "self.notifications.manage",
    "reports.view",
    "reports.export",
    "accounting.journal.view",
    "payments.view",
    "payments.create",
    "payments.export",
    "notifications.view",
    "automation.view",
    "automation.jobs.view",
    "analytics.view",
    "analytics.export",
    "analytics.alerts.manage",
    "analytics.assistant.use",
    "onboarding.view",
    "migration.view",
    "migration.manage",
    "support.view",
    "support.create",
  ],
  ACCOUNTANT: [
    "organization.view",
    "employee.view",
    "payroll.view",
    "payroll.review",
    "payroll.approve",
    "payroll.reject",
    "payroll.payslip.view",
    "payroll.export",
    "payslip.export",
    "compliance.view",
    "compliance.export",
    "compliance.tax.manage",
    "compliance.proofs.review",
    "leave.view",
    "salary.view",
    "salary.history.view",
    "benefits.view",
    "claims.view",
    "claims.approve",
    "claims.export",
    "loans.view",
    "loans.approve",
    "loans.disburse",
    "loans.repayment.manage",
    "loans.export",
    "exits.view",
    "clearance.view",
    "settlements.view",
    "settlements.review",
    "settlements.approve",
    "settlements.finalize",
    "settlements.pay",
    "settlements.export",
    "contractors.view",
    "contractors.invoices.create",
    "contractors.invoices.approve",
    "contractors.pay",
    "contractors.withholding.manage",
    "contractors.export",
    "self.view",
    "self.profile.update",
    "reports.view",
    "reports.export",
    "accounting.manage",
    "accounting.journal.view",
    "accounting.journal.export",
    "payments.view",
    "payments.create",
    "payments.approve",
    "payments.export",
    "payments.reconcile",
    "notifications.view",
    "analytics.view",
    "analytics.export",
    "analytics.alerts.manage",
    "subscriptions.view",
    "billing.view",
    "billing.payment.view",
    "onboarding.view",
    "support.view",
    "support.create",
    "data.export",
  ],
  MANAGER: [
    "organization.view",
    "user.view",
    "employee.view",
    "attendance.view",
    "biometric.view",
    "leave.view",
    "leave.request",
    "leave.approve",
    "benefits.view",
    "claims.view",
    "claims.create",
    "claims.approve",
    "loans.view",
    "loans.create",
    "loans.approve",
    "exits.view",
    "exits.approve",
    "clearance.view",
    "clearance.manage",
    "contractors.view",
    "self.view",
    "self.profile.update",
    "reports.view",
    "notifications.view",
    "analytics.view",
    "support.view",
    "support.create",
  ],
  EMPLOYEE: [
    "organization.view",
    "employee.view",
    "attendance.view",
    "leave.view",
    "leave.request",
    "claims.view",
    "claims.create",
    "loans.view",
    "loans.create",
    "payroll.payslip.view",
    "self.view",
    "self.profile.update",
    "notifications.view",
    "support.view",
    "support.create",
  ],
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", enabled: true },
  { href: "/my", label: "My Space", icon: "UserCircle", enabled: true, phase: 13 },
  { href: "/employees", label: "Employees", icon: "Users", enabled: true, phase: 2 },
  { href: "/attendance", label: "Attendance", icon: "CalendarCheck", enabled: false, phase: 4 },
  { href: "/leave", label: "Leave", icon: "Palmtree", enabled: true, phase: 5 },
  { href: "/salary", label: "Salary", icon: "Banknote", enabled: true, phase: 6 },
  { href: "/benefits", label: "Benefits", icon: "Gift", enabled: true, phase: 7 },
  { href: "/claims", label: "Claims", icon: "Receipt", enabled: true, phase: 7 },
  { href: "/loans", label: "Loans", icon: "HandCoins", enabled: true, phase: 8 },
  { href: "/biometric", label: "Biometric", icon: "Fingerprint", enabled: true, phase: 3 },
  { href: "/payroll", label: "Payroll", icon: "Wallet", enabled: true, phase: 9 },
  { href: "/employees/exits", label: "Exits", icon: "UserMinus", enabled: true, phase: 12 },
  { href: "/settlements", label: "Settlements", icon: "FileSignature", enabled: true, phase: 12 },
  { href: "/contractors", label: "Contractors", icon: "Briefcase", enabled: true, phase: 12 },
  { href: "/reports", label: "Reports", icon: "BarChart3", enabled: true, phase: 14 },
  { href: "/analytics", label: "Analytics", icon: "LineChart", enabled: true, phase: 16 },
  { href: "/billing/invoices", label: "Billing", icon: "CreditCard", enabled: true, phase: 18 },
  { href: "/accounting", label: "Accounting", icon: "BookOpen", enabled: true, phase: 14 },
  { href: "/payments", label: "Payments", icon: "Landmark", enabled: true, phase: 14 },
  { href: "/notifications", label: "Notifications", icon: "Bell", enabled: true, phase: 15 },
  { href: "/automation", label: "Automation", icon: "Workflow", enabled: true, phase: 15 },
  { href: "/compliance", label: "Compliance", icon: "ShieldCheck", enabled: true, phase: 9 },
  { href: "/onboarding", label: "Onboarding", icon: "ListChecks", enabled: true, phase: 19 },
  { href: "/support", label: "Support", icon: "LifeBuoy", enabled: true, phase: 19 },
  { href: "/settings/company", label: "Settings", icon: "Settings", enabled: true },
] as const;

export const SETTINGS_NAV = [
  { href: "/settings/company", label: "Company" },
  { href: "/settings/branches", label: "Branches" },
  { href: "/settings/departments", label: "Departments" },
  { href: "/settings/designations", label: "Designations" },
  { href: "/settings/locations", label: "Locations" },
  { href: "/settings/employment-types", label: "Employment types" },
  { href: "/settings/users", label: "Users" },
  { href: "/settings/roles", label: "Roles" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/developers", label: "Developers" },
  { href: "/settings/subscription", label: "Subscription" },
  { href: "/settings/data-migration", label: "Data migration" },
  { href: "/settings/data-export", label: "Data export" },
] as const;

export const EMPLOYEE_STATUSES = ["ACTIVE", "INACTIVE", "ON_NOTICE", "TERMINATED", "RESIGNED"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ON_NOTICE: "On notice",
  TERMINATED: "Terminated",
  RESIGNED: "Resigned",
};

export const GENDERS = ["MALE", "FEMALE", "OTHER", "UNSPECIFIED"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  UNSPECIFIED: "Unspecified",
};

export const DOCUMENT_TYPES = [
  "AADHAAR",
  "PAN",
  "OFFER_LETTER",
  "JOINING_LETTER",
  "APPOINTMENT_LETTER",
  "ID_PROOF",
  "ADDRESS_PROOF",
  "OTHER",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  AADHAAR: "Aadhaar",
  PAN: "PAN",
  OFFER_LETTER: "Offer Letter",
  JOINING_LETTER: "Joining Letter",
  APPOINTMENT_LETTER: "Appointment Letter",
  ID_PROOF: "ID Proof",
  ADDRESS_PROOF: "Address Proof",
  OTHER: "Other",
};

export const DEFAULT_EMPLOYMENT_TYPES = [
  { name: "Full Time", code: "FT", isSystem: true },
  { name: "Part Time", code: "PT", isSystem: true },
  { name: "Contract", code: "CT", isSystem: true },
  { name: "Temporary", code: "TMP", isSystem: true },
  { name: "Intern", code: "INT", isSystem: true },
  { name: "Consultant", code: "CON", isSystem: true },
] as const;

export const HISTORY_EVENT_TYPES = [
  "JOINING",
  "DEPARTMENT_CHANGE",
  "DESIGNATION_CHANGE",
  "BRANCH_TRANSFER",
  "MANAGER_CHANGE",
  "EMPLOYMENT_TYPE_CHANGE",
  "STATUS_CHANGE",
] as const;

export const PAGE_SIZE = 10;

export const INDUSTRIES = [
  "Manufacturing",
  "Information Technology",
  "Retail",
  "Healthcare",
  "Education",
  "Construction",
  "Logistics",
  "Hospitality",
  "Financial Services",
  "Other",
] as const;

export const PAYROLL_FREQUENCIES = ["MONTHLY", "BIMONTHLY", "WEEKLY"] as const;

export const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "UTC",
  "America/New_York",
  "Europe/London",
] as const;

export const PUBLIC_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/unauthorized",
  "/api/biometric/push",
  "/api/biometric/webhook",
  "/api/v1",
  "/api/internal/jobs",
];

export const PASSWORD_POLICY = {
  minLength: 8,
  requireLetter: true,
  requireNumber: true,
  requireSpecial: true,
};

export const LOGIN_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  maxAttempts: 8,
};

export const BIOMETRIC_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxAttempts: 120,
};

export const API_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxAttempts: 60,
};

export const BIOMETRIC_VENDORS = ["ESSL", "ZKTECO", "MATRIX", "GENERIC"] as const;
export type BiometricVendor = (typeof BIOMETRIC_VENDORS)[number];

export const BIOMETRIC_VENDOR_LABELS: Record<BiometricVendor, string> = {
  ESSL: "eSSL",
  ZKTECO: "ZKTeco",
  MATRIX: "Matrix COSEC",
  GENERIC: "Generic JSON",
};

export const DEVICE_CONNECTION_MODES = ["PUSH", "WEBHOOK", "SIMULATOR"] as const;
export type DeviceConnectionMode = (typeof DEVICE_CONNECTION_MODES)[number];

export const DEVICE_CONNECTION_LABELS: Record<DeviceConnectionMode, string> = {
  PUSH: "Cloud push",
  WEBHOOK: "Webhook",
  SIMULATOR: "Simulator",
};

export const DEVICE_STATUSES = ["PENDING", "ACTIVE", "DISABLED", "OFFLINE"] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  DISABLED: "Disabled",
  OFFLINE: "Offline",
};

export const PUNCH_DIRECTIONS = ["IN", "OUT", "UNKNOWN"] as const;
export type PunchDirection = (typeof PUNCH_DIRECTIONS)[number];

export const PUNCH_DIRECTION_LABELS: Record<PunchDirection, string> = {
  IN: "In",
  OUT: "Out",
  UNKNOWN: "Unknown",
};

export const BIOMETRIC_EVENT_STATUSES = [
  "RECEIVED",
  "NORMALIZED",
  "MAPPED",
  "UNMAPPED",
  "DUPLICATE",
  "REJECTED",
] as const;
export type BiometricEventStatus = (typeof BIOMETRIC_EVENT_STATUSES)[number];

export const BIOMETRIC_SOURCES = ["PUSH", "WEBHOOK", "SIMULATOR"] as const;
export type BiometricSource = (typeof BIOMETRIC_SOURCES)[number];

export const VERIFICATION_MODES = ["FINGER", "CARD", "PIN", "PASSWORD", "OTHER", "UNKNOWN"] as const;
export type VerificationMode = (typeof VERIFICATION_MODES)[number];

export const TIMEZONE_OFFSETS: Record<string, string> = {
  "Asia/Kolkata": "+05:30",
  "Asia/Dubai": "+04:00",
  "Asia/Singapore": "+08:00",
  UTC: "+00:00",
  "America/New_York": "-05:00",
  "Europe/London": "+00:00",
};

export const BIOMETRIC_NAV = [
  { href: "/biometric", label: "Overview" },
  { href: "/biometric/devices/new", label: "Add device" },
  { href: "/biometric/mapping", label: "Identity mapping" },
  { href: "/biometric/punches", label: "Punches" },
  { href: "/biometric/live", label: "Live" },
  { href: "/biometric/logs", label: "Logs" },
  { href: "/biometric/simulator", label: "Simulator" },
  { href: "/biometric/compatibility", label: "Compatibility" },
] as const;

export const DEMO_ESSL_DEVICE_ID = "b1111111-1111-1111-1111-111111111111";
export const DEMO_ESSL_DEVICE_TOKEN = "demo-essl-ho-token";

export const LEAVE_TYPE_STATUSES = ["ACTIVE", "DISABLED", "ARCHIVED"] as const;
export type LeaveTypeStatus = (typeof LEAVE_TYPE_STATUSES)[number];

export const ACCRUAL_METHODS = ["ANNUAL", "MONTHLY", "NONE", "MANUAL"] as const;
export type AccrualMethod = (typeof ACCRUAL_METHODS)[number];

export const ACCRUAL_METHOD_LABELS: Record<AccrualMethod, string> = {
  ANNUAL: "Annual allocation",
  MONTHLY: "Monthly accrual",
  NONE: "No accrual / unlimited",
  MANUAL: "Manual allocation",
};

export const ACCRUAL_FREQUENCIES = ["ANNUAL", "MONTHLY", "NONE"] as const;
export type AccrualFrequency = (typeof ACCRUAL_FREQUENCIES)[number];

export const POLICY_SCOPES = ["ORGANIZATION", "BRANCH", "DEPARTMENT", "DESIGNATION", "EMPLOYMENT_TYPE", "EMPLOYEE"] as const;
export type PolicyScope = (typeof POLICY_SCOPES)[number];

export const POLICY_SCOPE_LABELS: Record<PolicyScope, string> = {
  ORGANIZATION: "Organization",
  BRANCH: "Branch",
  DEPARTMENT: "Department",
  DESIGNATION: "Designation",
  EMPLOYMENT_TYPE: "Employment type",
  EMPLOYEE: "Employee",
};

export const LEAVE_REQUEST_STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "CANCELLED", "WITHDRAWN"] as const;
export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUSES)[number];

export const LEAVE_REQUEST_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  WITHDRAWN: "Withdrawn",
};

export const LEAVE_DAY_SESSIONS = ["FULL", "FIRST_HALF", "SECOND_HALF"] as const;
export type LeaveDaySession = (typeof LEAVE_DAY_SESSIONS)[number];

export const LEAVE_DAY_SESSION_LABELS: Record<LeaveDaySession, string> = {
  FULL: "Full day",
  FIRST_HALF: "First half",
  SECOND_HALF: "Second half",
};

export const LEAVE_LEDGER_SOURCES = [
  "ALLOCATED",
  "ACCRUED",
  "USED",
  "CANCELLED",
  "CARRY_FORWARD",
  "ADJUSTMENT",
  "COMP_OFF_EARNED",
  "COMP_OFF_USED",
  "ENCASHED",
  "PENDING",
] as const;
export type LeaveLedgerSource = (typeof LEAVE_LEDGER_SOURCES)[number];

export const HOLIDAY_TYPES = ["NATIONAL", "REGIONAL", "OPTIONAL", "COMPANY"] as const;
export type HolidayType = (typeof HOLIDAY_TYPES)[number];

export const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  NATIONAL: "National",
  REGIONAL: "Regional",
  OPTIONAL: "Optional",
  COMPANY: "Company",
};

export const COMP_OFF_STATUSES = ["PENDING", "APPROVED", "REJECTED", "EXPIRED", "USED"] as const;
export type CompOffStatus = (typeof COMP_OFF_STATUSES)[number];

export const COMP_OFF_STATUS_LABELS: Record<CompOffStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  USED: "Used",
};

export const ATTENDANCE_DAY_STATUSES = [
  "PRESENT",
  "ABSENT",
  "WEEKLY_OFF",
  "HOLIDAY",
  "PAID_LEAVE",
  "UNPAID_LEAVE",
  "HALF_DAY_LEAVE",
  "COMP_OFF",
] as const;
export type AttendanceDayStatus = (typeof ATTENDANCE_DAY_STATUSES)[number];

export const ATTENDANCE_DAY_STATUS_LABELS: Record<AttendanceDayStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  WEEKLY_OFF: "Weekly off",
  HOLIDAY: "Holiday",
  PAID_LEAVE: "Paid leave",
  UNPAID_LEAVE: "Unpaid leave",
  HALF_DAY_LEAVE: "Half-day leave",
  COMP_OFF: "Comp-off",
};

export const LEAVE_NAV = [
  { href: "/leave", label: "Overview" },
  { href: "/leave/requests", label: "Requests" },
  { href: "/leave/approvals", label: "Approvals" },
  { href: "/leave/balances", label: "Balances" },
  { href: "/leave/calendar", label: "Calendar" },
  { href: "/leave/holidays", label: "Holidays" },
  { href: "/leave/types", label: "Types" },
  { href: "/leave/policies", label: "Policies" },
  { href: "/leave/comp-off", label: "Comp-off" },
  { href: "/leave/reports", label: "Reports" },
  { href: "/leave/settings", label: "Settings" },
] as const;

export const SALARY_COMPONENT_TYPES = ["EARNING", "DEDUCTION", "REIMBURSEMENT"] as const;
export type SalaryComponentType = (typeof SALARY_COMPONENT_TYPES)[number];

export const SALARY_COMPONENT_TYPE_LABELS: Record<SalaryComponentType, string> = {
  EARNING: "Earning",
  DEDUCTION: "Deduction",
  REIMBURSEMENT: "Reimbursement",
};

export const SALARY_COMPONENT_CATEGORIES = [
  "BASIC",
  "ALLOWANCE",
  "VARIABLE",
  "STATUTORY_PLACEHOLDER",
  "BENEFIT",
  "DEDUCTION",
  "REIMBURSEMENT",
  "OTHER",
] as const;
export type SalaryComponentCategory = (typeof SALARY_COMPONENT_CATEGORIES)[number];

export const SALARY_COMPONENT_CATEGORY_LABELS: Record<SalaryComponentCategory, string> = {
  BASIC: "Basic",
  ALLOWANCE: "Allowance",
  VARIABLE: "Variable",
  STATUTORY_PLACEHOLDER: "Statutory placeholder",
  BENEFIT: "Employer benefit",
  DEDUCTION: "Deduction",
  REIMBURSEMENT: "Reimbursement",
  OTHER: "Other",
};

export const SALARY_CALCULATION_METHODS = ["FIXED", "PERCENTAGE", "FORMULA", "MANUAL", "RESIDUAL"] as const;
export type SalaryCalculationMethod = (typeof SALARY_CALCULATION_METHODS)[number];

export const SALARY_CALCULATION_METHOD_LABELS: Record<SalaryCalculationMethod, string> = {
  FIXED: "Fixed amount",
  PERCENTAGE: "Percentage of base",
  FORMULA: "Formula",
  MANUAL: "Manual / payroll input",
  RESIDUAL: "Residual of CTC",
};

export const SALARY_FREQUENCIES = ["MONTHLY", "ANNUAL", "ONE_TIME", "PAYROLL"] as const;
export type SalaryFrequency = (typeof SALARY_FREQUENCIES)[number];

export const SALARY_FREQUENCY_LABELS: Record<SalaryFrequency, string> = {
  MONTHLY: "Monthly",
  ANNUAL: "Annual",
  ONE_TIME: "One time",
  PAYROLL: "With payroll",
};

export const SALARY_ASSIGNMENT_STATUSES = ["DRAFT", "ACTIVE", "CLOSED"] as const;
export type SalaryAssignmentStatus = (typeof SALARY_ASSIGNMENT_STATUSES)[number];

export const SALARY_REVISION_STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "APPLIED"] as const;
export type SalaryRevisionStatus = (typeof SALARY_REVISION_STATUSES)[number];

export const SALARY_REVISION_STATUS_LABELS: Record<SalaryRevisionStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  APPLIED: "Applied",
};

export const SALARY_CHANGE_TYPES = [
  "NEW_JOINER",
  "REVISION",
  "PROMOTION",
  "INCREMENT",
  "TRANSFER",
  "STRUCTURE_CHANGE",
  "DEACTIVATED",
] as const;
export type SalaryChangeType = (typeof SALARY_CHANGE_TYPES)[number];

export const SALARY_CHANGE_TYPE_LABELS: Record<SalaryChangeType, string> = {
  NEW_JOINER: "New joiner",
  REVISION: "Salary revision",
  PROMOTION: "Promotion",
  INCREMENT: "Increment",
  TRANSFER: "Transfer",
  STRUCTURE_CHANGE: "Structure change",
  DEACTIVATED: "Deactivated",
};

export const COMPENSATION_ENTRY_STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED"] as const;
export type CompensationEntryStatus = (typeof COMPENSATION_ENTRY_STATUSES)[number];

export const COMPENSATION_ENTRY_STATUS_LABELS: Record<CompensationEntryStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const SALARY_NAV = [
  { href: "/salary", label: "Overview" },
  { href: "/salary/components", label: "Components" },
  { href: "/salary/structures", label: "Structures" },
  { href: "/salary/employee", label: "Employees" },
  { href: "/salary/revisions", label: "Revisions" },
  { href: "/salary/history", label: "History" },
  { href: "/salary/variable", label: "Variable" },
  { href: "/salary/reimbursements", label: "Reimbursements" },
  { href: "/salary/reports", label: "Reports" },
  { href: "/salary/settings", label: "Settings" },
] as const;

export const BENEFIT_CATEGORIES = [
  "FUEL",
  "TELEPHONE",
  "INTERNET",
  "MEDICAL",
  "TRAVEL",
  "MEAL",
  "OTHER",
] as const;
export type BenefitCategory = (typeof BENEFIT_CATEGORIES)[number];

export const BENEFIT_CATEGORY_LABELS: Record<BenefitCategory, string> = {
  FUEL: "Fuel",
  TELEPHONE: "Telephone",
  INTERNET: "Internet",
  MEDICAL: "Medical",
  TRAVEL: "Travel",
  MEAL: "Meal",
  OTHER: "Other",
};

export const BENEFIT_CALCULATION_METHODS = ["FIXED", "PERCENTAGE", "MANUAL"] as const;
export type BenefitCalculationMethod = (typeof BENEFIT_CALCULATION_METHODS)[number];

export const BENEFIT_CALCULATION_METHOD_LABELS: Record<BenefitCalculationMethod, string> = {
  FIXED: "Fixed amount",
  PERCENTAGE: "Percentage of CTC",
  MANUAL: "Manual",
};

export const BENEFIT_FREQUENCIES = ["MONTHLY", "ANNUAL", "ONE_TIME"] as const;
export type BenefitFrequency = (typeof BENEFIT_FREQUENCIES)[number];

export const BENEFIT_FREQUENCY_LABELS: Record<BenefitFrequency, string> = {
  MONTHLY: "Monthly",
  ANNUAL: "Annual",
  ONE_TIME: "One time",
};

export const BENEFIT_TAX_TREATMENTS = ["TAXABLE", "EXEMPT", "PARTIAL", "UNSET"] as const;
export type BenefitTaxTreatment = (typeof BENEFIT_TAX_TREATMENTS)[number];

export const BENEFIT_TAX_TREATMENT_LABELS: Record<BenefitTaxTreatment, string> = {
  TAXABLE: "Taxable (placeholder)",
  EXEMPT: "Exempt (placeholder)",
  PARTIAL: "Partial (placeholder)",
  UNSET: "Not set",
};

export const BENEFIT_ASSIGNMENT_STATUSES = ["DRAFT", "ACTIVE", "CLOSED"] as const;
export type BenefitAssignmentStatus = (typeof BENEFIT_ASSIGNMENT_STATUSES)[number];

export const BENEFIT_ASSIGNMENT_STATUS_LABELS: Record<BenefitAssignmentStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  CLOSED: "Closed",
};

export const CLAIM_CATEGORIES = [
  "TRAVEL",
  "TA_DA",
  "FUEL",
  "MEDICAL",
  "TELEPHONE",
  "INTERNET",
  "FOOD",
  "OTHER",
] as const;
export type ClaimCategory = (typeof CLAIM_CATEGORIES)[number];

export const CLAIM_CATEGORY_LABELS: Record<ClaimCategory, string> = {
  TRAVEL: "Travel",
  TA_DA: "TA/DA",
  FUEL: "Fuel",
  MEDICAL: "Medical",
  TELEPHONE: "Telephone",
  INTERNET: "Internet",
  FOOD: "Food",
  OTHER: "Other",
};

export const CLAIM_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "PAID",
  "INCLUDED_IN_PAYROLL",
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  PAID: "Paid",
  INCLUDED_IN_PAYROLL: "Included in payroll",
};

export const CLAIM_APPROVAL_STEPS = ["MANAGER", "FINANCE", "SINGLE"] as const;
export type ClaimApprovalStep = (typeof CLAIM_APPROVAL_STEPS)[number];

export const CLAIM_APPROVAL_STEP_LABELS: Record<ClaimApprovalStep, string> = {
  MANAGER: "Manager",
  FINANCE: "Finance / Admin",
  SINGLE: "Single approver",
};

export const CLAIM_APPROVAL_DECISIONS = ["APPROVED", "REJECTED", "REQUEST_CORRECTION"] as const;
export type ClaimApprovalDecision = (typeof CLAIM_APPROVAL_DECISIONS)[number];

export const CLAIM_APPROVAL_DECISION_LABELS: Record<ClaimApprovalDecision, string> = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REQUEST_CORRECTION: "Request correction",
};

export const TRAVEL_TYPES = ["LOCAL", "DOMESTIC", "OVERNIGHT", "OUTSTATION"] as const;
export type TravelType = (typeof TRAVEL_TYPES)[number];

export const TRAVEL_TYPE_LABELS: Record<TravelType, string> = {
  LOCAL: "Local",
  DOMESTIC: "Domestic",
  OVERNIGHT: "Overnight",
  OUTSTATION: "Outstation",
};

export const TRAVEL_MODES = ["CAR", "BIKE", "BUS", "TRAIN", "FLIGHT", "TAXI", "OTHER"] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];

export const TRAVEL_MODE_LABELS: Record<TravelMode, string> = {
  CAR: "Car",
  BIKE: "Bike",
  BUS: "Bus",
  TRAIN: "Train",
  FLIGHT: "Flight",
  TAXI: "Taxi",
  OTHER: "Other",
};

export const CITY_CATEGORIES = ["A", "B", "C", "OTHER"] as const;
export type CityCategory = (typeof CITY_CATEGORIES)[number];

export const CITY_CATEGORY_LABELS: Record<CityCategory, string> = {
  A: "Tier A",
  B: "Tier B",
  C: "Tier C",
  OTHER: "Other",
};

export const CLAIM_POLICY_CHECK_RESULTS = ["PASS", "WARN", "FAIL"] as const;
export type ClaimPolicyCheckResult = (typeof CLAIM_POLICY_CHECK_RESULTS)[number];

export const CLAIM_WORKFLOW_MODES = ["SINGLE", "TWO_STEP"] as const;
export type ClaimWorkflowMode = (typeof CLAIM_WORKFLOW_MODES)[number];

export const CLAIM_WORKFLOW_MODE_LABELS: Record<ClaimWorkflowMode, string> = {
  SINGLE: "Single-step approval",
  TWO_STEP: "Manager then finance",
};

export const BENEFITS_NAV = [
  { href: "/benefits", label: "Overview" },
  { href: "/benefits/components", label: "Benefit types" },
  { href: "/benefits/policies", label: "Policies" },
  { href: "/benefits/employee", label: "Assignments" },
  { href: "/benefits/reports", label: "Reports" },
] as const;

export const CLAIMS_NAV = [
  { href: "/claims", label: "Overview" },
  { href: "/claims/new", label: "New claim" },
  { href: "/claims/pending", label: "Pending" },
  { href: "/claims/approvals", label: "Approvals" },
  { href: "/claims/approved", label: "Approved" },
  { href: "/claims/history", label: "History" },
  { href: "/claims/policies", label: "Policies" },
  { href: "/claims/reports", label: "Reports" },
] as const;

export const LOAN_CATEGORIES = [
  "SALARY_ADVANCE",
  "EMPLOYEE_LOAN",
  "EMERGENCY_LOAN",
  "FESTIVAL_ADVANCE",
  "OTHER",
] as const;
export type LoanCategory = (typeof LOAN_CATEGORIES)[number];

export const LOAN_CATEGORY_LABELS: Record<LoanCategory, string> = {
  SALARY_ADVANCE: "Salary advance",
  EMPLOYEE_LOAN: "Employee loan",
  EMERGENCY_LOAN: "Emergency loan",
  FESTIVAL_ADVANCE: "Festival advance",
  OTHER: "Other",
};

export const LOAN_INTEREST_METHODS = ["NONE", "FLAT", "REDUCING"] as const;
export type LoanInterestMethod = (typeof LOAN_INTEREST_METHODS)[number];

export const LOAN_INTEREST_METHOD_LABELS: Record<LoanInterestMethod, string> = {
  NONE: "Zero interest",
  FLAT: "Flat interest",
  REDUCING: "Reducing balance",
};

export const LOAN_APPLICATION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "DISBURSED",
] as const;
export type LoanApplicationStatus = (typeof LOAN_APPLICATION_STATUSES)[number];

export const LOAN_APPLICATION_STATUS_LABELS: Record<LoanApplicationStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  DISBURSED: "Disbursed",
};

export const LOAN_ACCOUNT_STATUSES = ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED", "WRITTEN_OFF"] as const;
export type LoanAccountStatus = (typeof LOAN_ACCOUNT_STATUSES)[number];

export const LOAN_ACCOUNT_STATUS_LABELS: Record<LoanAccountStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  WRITTEN_OFF: "Written off",
};

export const LOAN_INSTALLMENT_STATUSES = [
  "UPCOMING",
  "DUE",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "WAIVED",
  "DEFERRED",
] as const;
export type LoanInstallmentStatus = (typeof LOAN_INSTALLMENT_STATUSES)[number];

export const LOAN_INSTALLMENT_STATUS_LABELS: Record<LoanInstallmentStatus, string> = {
  UPCOMING: "Upcoming",
  DUE: "Due",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  WAIVED: "Waived",
  DEFERRED: "Deferred",
};

export const LOAN_PAYMENT_METHODS = ["CASH", "BANK", "PAYROLL", "OTHER"] as const;
export type LoanPaymentMethod = (typeof LOAN_PAYMENT_METHODS)[number];

export const LOAN_PAYMENT_METHOD_LABELS: Record<LoanPaymentMethod, string> = {
  CASH: "Cash",
  BANK: "Bank transfer",
  PAYROLL: "Payroll deduction",
  OTHER: "Other",
};

export const LOAN_LEDGER_TYPES = [
  "DISBURSEMENT",
  "PRINCIPAL_REPAYMENT",
  "INTEREST_REPAYMENT",
  "MANUAL_REPAYMENT",
  "PAYROLL_DEDUCTION_REFERENCE",
  "ADJUSTMENT",
  "WAIVER",
  "REVERSAL",
] as const;
export type LoanLedgerType = (typeof LOAN_LEDGER_TYPES)[number];

export const LOAN_LEDGER_TYPE_LABELS: Record<LoanLedgerType, string> = {
  DISBURSEMENT: "Disbursement",
  PRINCIPAL_REPAYMENT: "Principal repayment",
  INTEREST_REPAYMENT: "Interest repayment",
  MANUAL_REPAYMENT: "Manual repayment",
  PAYROLL_DEDUCTION_REFERENCE: "Payroll deduction",
  ADJUSTMENT: "Adjustment",
  WAIVER: "Waiver",
  REVERSAL: "Reversal",
};

export const LOAN_ADJUSTMENT_KINDS = ["SKIP", "DEFER", "WAIVER", "WRITE_OFF", "REVERSAL"] as const;
export type LoanAdjustmentKind = (typeof LOAN_ADJUSTMENT_KINDS)[number];

export const LOAN_ADJUSTMENT_KIND_LABELS: Record<LoanAdjustmentKind, string> = {
  SKIP: "Skip installment",
  DEFER: "Defer installment",
  WAIVER: "Waive installment",
  WRITE_OFF: "Write off",
  REVERSAL: "Reverse payment",
};

export const LOAN_WORKFLOW_MODES = ["SINGLE", "TWO_STEP"] as const;
export type LoanWorkflowMode = (typeof LOAN_WORKFLOW_MODES)[number];

export const LOAN_WORKFLOW_MODE_LABELS: Record<LoanWorkflowMode, string> = {
  SINGLE: "Single-step approval",
  TWO_STEP: "Manager then finance",
};

export const LOAN_APPROVAL_STEPS = ["MANAGER", "FINANCE", "SINGLE"] as const;
export type LoanApprovalStep = (typeof LOAN_APPROVAL_STEPS)[number];

export const LOAN_APPROVAL_STEP_LABELS: Record<LoanApprovalStep, string> = {
  MANAGER: "Manager",
  FINANCE: "Finance / Admin",
  SINGLE: "Single approver",
};

export const LOAN_APPROVAL_DECISIONS = ["APPROVED", "REJECTED"] as const;
export type LoanApprovalDecision = (typeof LOAN_APPROVAL_DECISIONS)[number];

export const LOANS_NAV = [
  { href: "/loans", label: "Overview" },
  { href: "/loans/types", label: "Loan types" },
  { href: "/loans/applications", label: "Applications" },
  { href: "/loans/active", label: "Active" },
  { href: "/loans/repayments", label: "Repayments" },
  { href: "/loans/history", label: "History" },
  { href: "/loans/settings", label: "Settings" },
] as const;

export const PAYROLL_RUN_STATUSES = [
  "DRAFT",
  "CALCULATED",
  "UNDER_REVIEW",
  "APPROVAL_PENDING",
  "APPROVED",
  "FINALIZED",
  "LOCKED",
  "PROCESSED",
  "PAID",
  "CANCELLED",
] as const;
export type PayrollRunStatus = (typeof PAYROLL_RUN_STATUSES)[number];

export const PAYROLL_RUN_STATUS_LABELS: Record<PayrollRunStatus, string> = {
  DRAFT: "Draft",
  CALCULATED: "Calculated",
  UNDER_REVIEW: "Under review",
  APPROVAL_PENDING: "Approval pending",
  APPROVED: "Approved",
  FINALIZED: "Finalized",
  LOCKED: "Locked",
  PROCESSED: "Processed",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export const PAYROLL_RUN_TYPES = ["MONTHLY", "ADJUSTMENT", "OFF_CYCLE"] as const;
export type PayrollRunType = (typeof PAYROLL_RUN_TYPES)[number];

export const PAYROLL_RUN_TYPE_LABELS: Record<PayrollRunType, string> = {
  MONTHLY: "Monthly",
  ADJUSTMENT: "Adjustment",
  OFF_CYCLE: "Off-cycle",
};

export const PAYROLL_ITEM_STATUSES = ["INCLUDED", "ON_HOLD", "EXCLUDED", "ERROR"] as const;
export type PayrollItemStatus = (typeof PAYROLL_ITEM_STATUSES)[number];

export const PAYROLL_ITEM_STATUS_LABELS: Record<PayrollItemStatus, string> = {
  INCLUDED: "Included",
  ON_HOLD: "On hold",
  EXCLUDED: "Excluded",
  ERROR: "Error",
};

export const PAYSLIP_STATUSES = ["DRAFT", "ISSUED", "VOID"] as const;
export type PayslipStatus = (typeof PAYSLIP_STATUSES)[number];

export const PAYSLIP_STATUS_LABELS: Record<PayslipStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  VOID: "Void",
};

export const PAYROLL_LINE_KINDS = [
  "EARNING",
  "DEDUCTION",
  "REIMBURSEMENT",
  "CLAIM",
  "LOAN",
  "STATUTORY",
  "EMPLOYER",
  "ADJUSTMENT",
] as const;
export type PayrollLineKind = (typeof PAYROLL_LINE_KINDS)[number];

export const PAYROLL_LINE_KIND_LABELS: Record<PayrollLineKind, string> = {
  EARNING: "Earning",
  DEDUCTION: "Deduction",
  REIMBURSEMENT: "Reimbursement",
  CLAIM: "Claim",
  LOAN: "Loan",
  STATUTORY: "Statutory",
  EMPLOYER: "Employer contribution",
  ADJUSTMENT: "Adjustment",
};

export const PAYROLL_EXCEPTION_CODES = [
  "MISSING_SALARY_STRUCTURE",
  "MISSING_ATTENDANCE",
  "UNRESOLVED_ATTENDANCE_EXCEPTION",
  "UNRESOLVED_LEAVE",
  "INVALID_SALARY_PERIOD",
  "DUPLICATE_SOURCE",
  "LOAN_MISMATCH",
  "NEGATIVE_RESULT",
  "INVALID_EMPLOYEE_STATE",
  "OTHER_CALCULATION_ERROR",
  "STATUTORY_RULE_MISSING",
  "STATUTORY_UAN_MISSING",
  "STATUTORY_PAN_MISSING",
  "STATUTORY_UNVERIFIED_RULE",
] as const;
export type PayrollExceptionCode = (typeof PAYROLL_EXCEPTION_CODES)[number];

export const PAYROLL_EXCEPTION_CODE_LABELS: Record<PayrollExceptionCode, string> = {
  MISSING_SALARY_STRUCTURE: "Missing salary structure",
  MISSING_ATTENDANCE: "Missing attendance",
  UNRESOLVED_ATTENDANCE_EXCEPTION: "Unresolved attendance exception",
  UNRESOLVED_LEAVE: "Unresolved leave",
  INVALID_SALARY_PERIOD: "Invalid salary period",
  DUPLICATE_SOURCE: "Duplicate source",
  LOAN_MISMATCH: "Loan mismatch",
  NEGATIVE_RESULT: "Negative result",
  INVALID_EMPLOYEE_STATE: "Invalid employee state",
  OTHER_CALCULATION_ERROR: "Other calculation error",
  STATUTORY_RULE_MISSING: "Statutory rule missing",
  STATUTORY_UAN_MISSING: "UAN missing for PF",
  STATUTORY_PAN_MISSING: "PAN missing for TDS",
  STATUTORY_UNVERIFIED_RULE: "Unverified statutory rule",
};

export const PAYROLL_EXCEPTION_SEVERITIES = ["ERROR", "WARNING"] as const;
export type PayrollExceptionSeverity = (typeof PAYROLL_EXCEPTION_SEVERITIES)[number];

export const PAYROLL_EXCEPTION_STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED"] as const;
export type PayrollExceptionStatus = (typeof PAYROLL_EXCEPTION_STATUSES)[number];

export const PAYROLL_EXCEPTION_STATUS_LABELS: Record<PayrollExceptionStatus, string> = {
  OPEN: "Open",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
};

export const PAYROLL_APPROVAL_ACTIONS = [
  "SUBMIT_REVIEW",
  "APPROVE",
  "REJECT",
  "RETURN_DRAFT",
  "FINALIZE",
  "LOCK",
  "UNLOCK",
  "CANCEL",
  "PROCESS",
  "PAID",
] as const;
export type PayrollApprovalAction = (typeof PAYROLL_APPROVAL_ACTIONS)[number];

export const PAYROLL_APPROVAL_ACTION_LABELS: Record<PayrollApprovalAction, string> = {
  SUBMIT_REVIEW: "Submitted for review",
  APPROVE: "Approved",
  REJECT: "Rejected",
  RETURN_DRAFT: "Returned to draft",
  FINALIZE: "Finalized",
  LOCK: "Locked",
  UNLOCK: "Unlocked",
  CANCEL: "Cancelled",
  PROCESS: "Processed",
  PAID: "Marked paid",
};

export const PAYSLIP_SECTIONS = [
  "EARNING",
  "REIMBURSEMENT",
  "DEDUCTION",
  "STATUTORY",
  "STATUTORY_RESERVED",
  "EMPLOYER",
  "TOTAL",
] as const;
export type PayslipSection = (typeof PAYSLIP_SECTIONS)[number];

export const STATUTORY_HEADS = ["PF", "ESI", "PT", "TDS", "LWF"] as const;
export type StatutoryHead = (typeof STATUTORY_HEADS)[number];

export const STATUTORY_HEAD_LABELS: Record<StatutoryHead, string> = {
  PF: "Provident Fund",
  ESI: "ESI",
  PT: "Professional Tax",
  TDS: "TDS",
  LWF: "Labour Welfare Fund",
};

export const STATUTORY_RULE_STATUSES = ["DRAFT", "ACTIVE", "DISABLED", "ARCHIVED"] as const;
export type StatutoryRuleVersionStatus = (typeof STATUTORY_RULE_STATUSES)[number];

export const STATUTORY_RULE_STATUS_LABELS: Record<StatutoryRuleVersionStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  DISABLED: "Disabled",
  ARCHIVED: "Archived",
};

export const TAX_REGIMES = ["OLD", "NEW", "NEW_ACT_2025"] as const;
export type TaxRegime = (typeof TAX_REGIMES)[number];

export const TAX_REGIME_LABELS: Record<TaxRegime, string> = {
  OLD: "Old regime (Income-tax Act, 1961)",
  NEW: "New regime (section 115BAC)",
  NEW_ACT_2025: "Income Tax Act, 2025",
};

export const TAX_DECLARATION_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"] as const;
export type TaxDeclarationStatus = (typeof TAX_DECLARATION_STATUSES)[number];

export const TAX_DECLARATION_STATUS_LABELS: Record<TaxDeclarationStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const TAX_PROOF_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type TaxProofStatus = (typeof TAX_PROOF_STATUSES)[number];

export const TAX_PROOF_STATUS_LABELS: Record<TaxProofStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const STATUTORY_ROUNDING_MODES = ["NEAREST_RUPEE", "NEAREST_PAISE", "FLOOR_RUPEE"] as const;
export type StatutoryRoundingMode = (typeof STATUTORY_ROUNDING_MODES)[number];

export const COMPLIANCE_FILING_STATUSES = ["DRAFT", "READY", "EXPORTED"] as const;
export type ComplianceFilingStatus = (typeof COMPLIANCE_FILING_STATUSES)[number];

export const COMPLIANCE_FILING_STATUS_LABELS: Record<ComplianceFilingStatus, string> = {
  DRAFT: "Draft",
  READY: "Ready",
  EXPORTED: "Exported",
};

export const PAYROLL_NAV = [
  { href: "/payroll", label: "Overview" },
  { href: "/payroll/runs", label: "Runs" },
  { href: "/payroll/review", label: "Review" },
  { href: "/payroll/exceptions", label: "Exceptions" },
  { href: "/payroll/employees", label: "Employees" },
  { href: "/payroll/payslips", label: "Payslips" },
  { href: "/payroll/reports", label: "Reports" },
  { href: "/payroll/settings", label: "Settings" },
] as const;

export const COMPLIANCE_NAV = [
  { href: "/compliance", label: "Overview" },
  { href: "/compliance/rules", label: "Rules" },
  { href: "/compliance/pf", label: "EPF" },
  { href: "/compliance/esi", label: "ESI" },
  { href: "/compliance/pt", label: "PT" },
  { href: "/compliance/lwf", label: "LWF" },
  { href: "/compliance/tds", label: "TDS" },
  { href: "/compliance/declarations", label: "Declarations" },
  { href: "/compliance/proofs", label: "Proofs" },
  { href: "/compliance/forms", label: "Forms" },
  { href: "/compliance/reports", label: "Reports" },
  { href: "/compliance/settings", label: "Settings" },
] as const;

export const EXIT_TYPES = ["RESIGNATION", "TERMINATION", "RETIREMENT", "CONTRACT_EXPIRY", "OTHER"] as const;
export type ExitType = (typeof EXIT_TYPES)[number];
export const EXIT_TYPE_LABELS: Record<ExitType, string> = {
  RESIGNATION: "Resignation",
  TERMINATION: "Termination",
  RETIREMENT: "Retirement",
  CONTRACT_EXPIRY: "Contract expiry",
  OTHER: "Other",
};

export const EXIT_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "IN_NOTICE",
  "CLEARANCE_PENDING",
  "SETTLEMENT_PENDING",
  "SETTLED",
  "CANCELLED",
] as const;
export type ExitStatus = (typeof EXIT_STATUSES)[number];
export const EXIT_STATUS_LABELS: Record<ExitStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  IN_NOTICE: "In notice",
  CLEARANCE_PENDING: "Clearance pending",
  SETTLEMENT_PENDING: "Settlement pending",
  SETTLED: "Settled",
  CANCELLED: "Cancelled",
};

export const CLEARANCE_DEPARTMENTS = ["HR", "FINANCE", "IT", "ADMIN", "MANAGER"] as const;
export type ClearanceDepartment = (typeof CLEARANCE_DEPARTMENTS)[number];
export const CLEARANCE_DEPARTMENT_LABELS: Record<ClearanceDepartment, string> = {
  HR: "HR",
  FINANCE: "Finance",
  IT: "IT / Assets",
  ADMIN: "Administration",
  MANAGER: "Reporting manager",
};

export const CLEARANCE_TASK_STATUSES = ["PENDING", "CLEARED", "BLOCKED", "NOT_APPLICABLE"] as const;
export type ClearanceTaskStatus = (typeof CLEARANCE_TASK_STATUSES)[number];
export const CLEARANCE_TASK_STATUS_LABELS: Record<ClearanceTaskStatus, string> = {
  PENDING: "Pending",
  CLEARED: "Cleared",
  BLOCKED: "Blocked",
  NOT_APPLICABLE: "Not applicable",
};

export const SETTLEMENT_STATUSES = [
  "DRAFT",
  "CALCULATED",
  "HAS_EXCEPTIONS",
  "UNDER_REVIEW",
  "APPROVED",
  "FINALIZED",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];
export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  DRAFT: "Draft",
  CALCULATED: "Calculated",
  HAS_EXCEPTIONS: "Has exceptions",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  FINALIZED: "Finalized",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export const SETTLEMENT_LINE_KINDS = [
  "UNPAID_SALARY",
  "VARIABLE_EARNING",
  "BONUS",
  "ARREAR",
  "REIMBURSEMENT",
  "LEAVE_ENCASHMENT",
  "NOTICE_PAY",
  "NOTICE_RECOVERY",
  "LOAN_RECOVERY",
  "STATUTORY",
  "EMPLOYER_STATUTORY",
  "ADJUSTMENT",
] as const;
export type SettlementLineKind = (typeof SETTLEMENT_LINE_KINDS)[number];
export const SETTLEMENT_LINE_KIND_LABELS: Record<SettlementLineKind, string> = {
  UNPAID_SALARY: "Unpaid salary",
  VARIABLE_EARNING: "Variable earning",
  BONUS: "Bonus",
  ARREAR: "Arrear",
  REIMBURSEMENT: "Reimbursement",
  LEAVE_ENCASHMENT: "Leave encashment",
  NOTICE_PAY: "Notice pay",
  NOTICE_RECOVERY: "Notice recovery",
  LOAN_RECOVERY: "Loan / advance recovery",
  STATUTORY: "Statutory deduction",
  EMPLOYER_STATUTORY: "Employer statutory",
  ADJUSTMENT: "Adjustment",
};

export const SETTLEMENT_LINE_DIRECTIONS = ["EARNING", "DEDUCTION", "EMPLOYER"] as const;
export type SettlementLineDirection = (typeof SETTLEMENT_LINE_DIRECTIONS)[number];

export const SETTLEMENT_APPROVAL_STEPS = ["REVIEW", "APPROVAL", "FINALIZE", "REJECT", "ADJUST"] as const;
export type SettlementApprovalStep = (typeof SETTLEMENT_APPROVAL_STEPS)[number];
export const SETTLEMENT_APPROVAL_DECISIONS = ["APPROVED", "REJECTED", "RETURNED"] as const;
export type SettlementApprovalDecision = (typeof SETTLEMENT_APPROVAL_DECISIONS)[number];

export const SETTLEMENT_PAYMENT_METHODS = ["BANK_TRANSFER", "CHEQUE", "CASH", "UPI", "OTHER"] as const;
export type SettlementPaymentMethod = (typeof SETTLEMENT_PAYMENT_METHODS)[number];
export const SETTLEMENT_PAYMENT_METHOD_LABELS: Record<SettlementPaymentMethod, string> = {
  BANK_TRANSFER: "Bank transfer",
  CHEQUE: "Cheque",
  CASH: "Cash",
  UPI: "UPI",
  OTHER: "Other",
};

export const CONTRACTOR_BUSINESS_TYPES = ["INDIVIDUAL", "PROPRIETORSHIP", "PARTNERSHIP", "COMPANY", "LLP", "OTHER"] as const;
export type ContractorBusinessType = (typeof CONTRACTOR_BUSINESS_TYPES)[number];
export const CONTRACTOR_BUSINESS_TYPE_LABELS: Record<ContractorBusinessType, string> = {
  INDIVIDUAL: "Individual",
  PROPRIETORSHIP: "Proprietorship",
  PARTNERSHIP: "Partnership",
  COMPANY: "Company",
  LLP: "LLP",
  OTHER: "Other",
};

export const CONTRACTOR_STATUSES = ["ACTIVE", "INACTIVE", "BLACKLISTED"] as const;
export type ContractorStatus = (typeof CONTRACTOR_STATUSES)[number];
export const CONTRACTOR_STATUS_LABELS: Record<ContractorStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  BLACKLISTED: "Blacklisted",
};

export const ENGAGEMENT_RATE_UNITS = ["MONTHLY", "DAILY", "HOURLY", "MILESTONE", "ONE_TIME"] as const;
export type EngagementRateUnit = (typeof ENGAGEMENT_RATE_UNITS)[number];
export const ENGAGEMENT_RATE_UNIT_LABELS: Record<EngagementRateUnit, string> = {
  MONTHLY: "Monthly",
  DAILY: "Daily",
  HOURLY: "Hourly",
  MILESTONE: "Milestone",
  ONE_TIME: "One-time",
};

export const ENGAGEMENT_FREQUENCIES = ["MONTHLY", "MILESTONE", "ONE_TIME"] as const;
export type EngagementFrequency = (typeof ENGAGEMENT_FREQUENCIES)[number];
export const ENGAGEMENT_FREQUENCY_LABELS: Record<EngagementFrequency, string> = {
  MONTHLY: "Monthly",
  MILESTONE: "Milestone",
  ONE_TIME: "One-time",
};

export const ENGAGEMENT_STATUSES = ["DRAFT", "ACTIVE", "EXPIRED", "CLOSED", "CANCELLED"] as const;
export type EngagementStatus = (typeof ENGAGEMENT_STATUSES)[number];
export const ENGAGEMENT_STATUS_LABELS: Record<EngagementStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const CONTRACTOR_INVOICE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SCHEDULED",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
] as const;
export type ContractorInvoiceStatus = (typeof CONTRACTOR_INVOICE_STATUSES)[number];
export const CONTRACTOR_INVOICE_STATUS_LABELS: Record<ContractorInvoiceStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SCHEDULED: "Scheduled",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export const CONTRACTOR_PAYMENT_ITEM_KINDS = ["GROSS", "ADJUSTMENT", "WITHHOLDING", "NET"] as const;
export type ContractorPaymentItemKind = (typeof CONTRACTOR_PAYMENT_ITEM_KINDS)[number];

export const EXITS_NAV = [
  { href: "/employees/exits", label: "Register" },
  { href: "/employees/exits/new", label: "New exit" },
  { href: "/employees/exits/clearance", label: "Clearance" },
  { href: "/employees/exits/reports", label: "Reports" },
] as const;

export const SETTLEMENTS_NAV = [
  { href: "/settlements", label: "Register" },
  { href: "/settlements/new", label: "New settlement" },
  { href: "/settlements/reports", label: "Reports" },
] as const;

export const CONTRACTORS_NAV = [
  { href: "/contractors", label: "Register" },
  { href: "/contractors/new", label: "New contractor" },
  { href: "/contractors/engagements", label: "Engagements" },
  { href: "/contractor-payments", label: "Invoices" },
  { href: "/contractor-payments/approvals", label: "Approvals" },
  { href: "/contractors/reports", label: "Reports" },
] as const;

export const ESS_CHANGE_REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type EssChangeRequestStatus = (typeof ESS_CHANGE_REQUEST_STATUSES)[number];

export const ESS_CHANGE_REQUEST_STATUS_LABELS: Record<EssChangeRequestStatus, string> = {
  PENDING: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const ESS_CHANGE_CATEGORIES = [
  "CONTACT",
  "ADDRESS",
  "EMERGENCY",
  "BANK",
  "STATUTORY",
  "EDUCATION",
  "OTHER",
] as const;
export type EssChangeCategory = (typeof ESS_CHANGE_CATEGORIES)[number];

export const ESS_CHANGE_CATEGORY_LABELS: Record<EssChangeCategory, string> = {
  CONTACT: "Contact details",
  ADDRESS: "Address",
  EMERGENCY: "Emergency contact",
  BANK: "Bank account",
  STATUTORY: "Statutory identifiers",
  EDUCATION: "Education / qualification",
  OTHER: "Other",
};

export const ESS_SENSITIVE_CATEGORIES: EssChangeCategory[] = ["BANK", "STATUTORY"];

export const ESS_NOTIFICATION_TYPES = ["INFO", "ACTION", "APPROVAL", "ALERT"] as const;
export type EssNotificationType = (typeof ESS_NOTIFICATION_TYPES)[number];

export const ESS_NOTIFICATION_TYPE_LABELS: Record<EssNotificationType, string> = {
  INFO: "Information",
  ACTION: "Action needed",
  APPROVAL: "Approval",
  ALERT: "Alert",
};

export const ESS_NAV = [
  { href: "/my", label: "Home", icon: "LayoutDashboard" },
  { href: "/my/profile", label: "Profile", icon: "UserCircle" },
  { href: "/my/attendance", label: "Attendance", icon: "CalendarCheck" },
  { href: "/my/leave", label: "Leave", icon: "Palmtree" },
  { href: "/my/payslips", label: "Payslips", icon: "Receipt" },
  { href: "/my/salary", label: "Salary", icon: "Banknote" },
  { href: "/my/claims", label: "Claims", icon: "Wallet" },
  { href: "/my/loans", label: "Loans", icon: "HandCoins" },
  { href: "/my/documents", label: "Documents", icon: "FileText" },
  { href: "/my/tax-documents", label: "Tax", icon: "ShieldCheck" },
  { href: "/my/requests", label: "Requests", icon: "Inbox" },
  { href: "/my/notifications", label: "Alerts", icon: "Bell" },
] as const;

export const ACCOUNTING_ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const;
export type AccountingAccountType = (typeof ACCOUNTING_ACCOUNT_TYPES)[number];

export const ACCOUNTING_ACCOUNT_TYPE_LABELS: Record<AccountingAccountType, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expense",
};

export const PAYROLL_MAPPING_CATEGORIES = [
  "EARNING",
  "EMPLOYER_CONTRIBUTION",
  "DEDUCTION",
  "REIMBURSEMENT",
  "LOAN_RECOVERY",
  "NET_PAY",
] as const;
export type PayrollMappingCategory = (typeof PAYROLL_MAPPING_CATEGORIES)[number];

export const PAYROLL_MAPPING_CATEGORY_LABELS: Record<PayrollMappingCategory, string> = {
  EARNING: "Salary expense (earnings)",
  EMPLOYER_CONTRIBUTION: "Employer contribution expense",
  DEDUCTION: "Employee deduction payable",
  REIMBURSEMENT: "Reimbursement expense",
  LOAN_RECOVERY: "Loan / advance recovery",
  NET_PAY: "Salary payable (net)",
};

export const PAYROLL_JOURNAL_STATUSES = ["DRAFT", "VALIDATED", "EXPORTED", "VOID"] as const;
export type PayrollJournalStatus = (typeof PAYROLL_JOURNAL_STATUSES)[number];

export const PAYROLL_JOURNAL_STATUS_LABELS: Record<PayrollJournalStatus, string> = {
  DRAFT: "Draft",
  VALIDATED: "Validated",
  EXPORTED: "Exported",
  VOID: "Void",
};

export const PAYMENT_METHODS = ["BANK_TRANSFER", "NEFT", "RTGS", "IMPS", "CHEQUE", "CASH", "UPI"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Bank transfer",
  NEFT: "NEFT",
  RTGS: "RTGS",
  IMPS: "IMPS",
  CHEQUE: "Cheque",
  CASH: "Cash",
  UPI: "UPI",
};

export const PAYMENT_BATCH_STATUSES = [
  "DRAFT",
  "VALIDATING",
  "READY",
  "APPROVED",
  "EXPORTED",
  "PARTIALLY_PAID",
  "PAID",
  "FAILED",
  "CANCELLED",
] as const;
export type PaymentBatchStatus = (typeof PAYMENT_BATCH_STATUSES)[number];

export const PAYMENT_BATCH_STATUS_LABELS: Record<PaymentBatchStatus, string> = {
  DRAFT: "Draft",
  VALIDATING: "Validating",
  READY: "Ready",
  APPROVED: "Approved",
  EXPORTED: "Exported (not paid)",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const PAYMENT_ITEM_STATUSES = [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REVERSED",
  "RECONCILED",
  "EXCLUDED",
] as const;
export type PaymentItemStatus = (typeof PAYMENT_ITEM_STATUSES)[number];

export const PAYMENT_ITEM_STATUS_LABELS: Record<PaymentItemStatus, string> = {
  PENDING: "Pending",
  SUCCESS: "Success",
  FAILED: "Failed",
  REVERSED: "Reversed",
  RECONCILED: "Reconciled",
  EXCLUDED: "Excluded",
};

export const PAYMENT_TRANSACTION_STATUSES = ["SUCCESS", "FAILED", "REVERSED", "RECONCILED"] as const;
export type PaymentTransactionStatus = (typeof PAYMENT_TRANSACTION_STATUSES)[number];

export const PAYMENT_TRANSACTION_SOURCES = ["MANUAL", "IMPORT"] as const;
export type PaymentTransactionSource = (typeof PAYMENT_TRANSACTION_SOURCES)[number];

export const RECONCILIATION_STATUSES = ["PREVIEW", "CONFIRMED", "DISCARDED"] as const;
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];

export const ACCOUNTING_EXPORT_KINDS = ["JOURNAL", "PAYMENT_BANK_FILE"] as const;
export type AccountingExportKind = (typeof ACCOUNTING_EXPORT_KINDS)[number];

export const REPORTS_NAV = [
  { href: "/reports", label: "Overview" },
  { href: "/reports?group=hr", label: "HR" },
  { href: "/reports?group=attendance", label: "Attendance" },
  { href: "/reports?group=leave", label: "Leave" },
  { href: "/reports?group=payroll", label: "Payroll" },
  { href: "/reports?group=compliance", label: "Compliance" },
  { href: "/reports?group=claims", label: "Claims & Loans" },
  { href: "/reports?group=exits", label: "Exit & Contractors" },
  { href: "/reports?group=biometric", label: "Biometric" },
] as const;

export const ACCOUNTING_NAV = [
  { href: "/accounting", label: "Overview" },
  { href: "/accounting/mappings", label: "Mappings" },
  { href: "/accounting/journals", label: "Journals" },
  { href: "/accounting/exports", label: "Exports" },
] as const;

export const PAYMENTS_NAV = [
  { href: "/payments", label: "Overview" },
  { href: "/payments/new", label: "New batch" },
  { href: "/payments/history", label: "History" },
  { href: "/payments/settings", label: "Settings" },
] as const;

export const AUTOMATION_EVENT_TYPES = [
  "leave.request.updated",
  "payroll.run.calculated",
  "payroll.run.approved",
  "payroll.run.finalized",
  "payslip.generated",
  "claim.status_changed",
  "loan.application.updated",
  "loan.installment.due",
  "loan.installment.overdue",
  "employee.created",
  "employee.updated",
  "employee.exit.updated",
  "contractor.engagement.expiring",
  "contractor.payment.status_changed",
  "biometric.device.error",
  "attendance.punch.received",
  "attendance.day.calculated",
  "payment.failed",
  "approval.overdue",
  "compliance.deadline",
] as const;
export type AutomationEventType = (typeof AUTOMATION_EVENT_TYPES)[number];

export const AUTOMATION_EVENT_TYPE_LABELS: Record<AutomationEventType, string> = {
  "leave.request.updated": "Leave request updated",
  "payroll.run.calculated": "Payroll calculated",
  "payroll.run.approved": "Payroll approved",
  "payroll.run.finalized": "Payroll finalized",
  "payslip.generated": "Payslip generated",
  "claim.status_changed": "Claim status changed",
  "loan.application.updated": "Loan application updated",
  "loan.installment.due": "Loan installment due",
  "loan.installment.overdue": "Loan installment overdue",
  "employee.created": "Employee created",
  "employee.updated": "Employee updated",
  "employee.exit.updated": "Employee exit updated",
  "contractor.engagement.expiring": "Contractor engagement expiring",
  "contractor.payment.status_changed": "Contractor payment status changed",
  "biometric.device.error": "Biometric device error",
  "attendance.punch.received": "Attendance punch received",
  "attendance.day.calculated": "Attendance day calculated",
  "payment.failed": "Payment failed",
  "approval.overdue": "Approval overdue",
  "compliance.deadline": "Compliance deadline",
};

export const WEBHOOK_EVENT_TYPES = [
  "employee.created",
  "employee.updated",
  "attendance.punch.received",
  "attendance.day.calculated",
  "leave.request.updated",
  "payroll.run.calculated",
  "payroll.run.finalized",
  "payslip.generated",
  "claim.status_changed",
  "contractor.payment.status_changed",
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export const AUTOMATION_TRIGGER_TYPES = [
  "leave.request.updated",
  "payroll.run.status_changed",
  "payslip.generated",
  "claim.status_changed",
  "loan.installment.due",
  "loan.installment.overdue",
  "employee.created",
  "employee.exit.updated",
  "contractor.engagement.expiring",
  "biometric.device.error",
  "payment.failed",
  "approval.overdue",
] as const;
export type AutomationTriggerType = (typeof AUTOMATION_TRIGGER_TYPES)[number];

export const AUTOMATION_TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  "leave.request.updated": "Leave or regularization status changed",
  "payroll.run.status_changed": "Payroll status changed",
  "payslip.generated": "Payslip generated",
  "claim.status_changed": "Claim status changed",
  "loan.installment.due": "Loan installment due",
  "loan.installment.overdue": "Loan installment overdue",
  "employee.created": "Employee joining",
  "employee.exit.updated": "Employee exit",
  "contractor.engagement.expiring": "Contractor engagement nearing expiry",
  "biometric.device.error": "Biometric device offline or error",
  "payment.failed": "Payment failed",
  "approval.overdue": "Approval overdue",
};

export const AUTOMATION_ACTION_TYPES = ["NOTIFY_IN_APP", "SEND_EMAIL", "CREATE_TASK", "INVOKE_WEBHOOK"] as const;
export type AutomationActionType = (typeof AUTOMATION_ACTION_TYPES)[number];

export const AUTOMATION_ACTION_LABELS: Record<AutomationActionType, string> = {
  NOTIFY_IN_APP: "Create in-app notification",
  SEND_EMAIL: "Send configured email",
  CREATE_TASK: "Create reminder / task",
  INVOKE_WEBHOOK: "Invoke configured webhook",
};

export const DOMAIN_EVENT_STATUSES = ["PENDING", "PROCESSING", "PROCESSED", "FAILED", "DEAD"] as const;
export type DomainEventStatus = (typeof DOMAIN_EVENT_STATUSES)[number];

export const JOB_TYPES = [
  "PENDING_APPROVAL_REMINDER",
  "UPCOMING_LEAVE_REMINDER",
  "LOAN_REPAYMENT_REMINDER",
  "CONTRACT_EXPIRY_ALERT",
  "BIOMETRIC_DEVICE_HEALTH",
  "PAYROLL_PERIOD_REMINDER",
  "FAILED_JOB_RETRY",
  "OUTBOX_PROCESS",
  "SUBSCRIPTION_LIFECYCLE",
  "SUPPORT_SLA",
  "DATA_EXPORT_EXPIRE",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  PENDING_APPROVAL_REMINDER: "Pending approval reminders",
  UPCOMING_LEAVE_REMINDER: "Upcoming leave reminders",
  LOAN_REPAYMENT_REMINDER: "Loan repayment reminders",
  CONTRACT_EXPIRY_ALERT: "Employee and contract expiry alerts",
  BIOMETRIC_DEVICE_HEALTH: "Biometric device health checks",
  PAYROLL_PERIOD_REMINDER: "Payroll period reminders",
  FAILED_JOB_RETRY: "Eligible failed-job retries",
  OUTBOX_PROCESS: "Process event outbox",
  SUBSCRIPTION_LIFECYCLE: "Subscription trial, renewal and grace processing",
  SUPPORT_SLA: "Support ticket SLA reminders",
  DATA_EXPORT_EXPIRE: "Expire completed data exports",
};

export const JOB_EXECUTION_STATUSES = ["QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"] as const;
export type JobExecutionStatus = (typeof JOB_EXECUTION_STATUSES)[number];

export const JOB_EXECUTION_STATUS_LABELS: Record<JobExecutionStatus, string> = {
  QUEUED: "Queued",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const DELIVERY_STATUSES = ["QUEUED", "SENT", "FAILED", "SKIPPED", "UNCONFIGURED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const WEBHOOK_DELIVERY_STATUSES = ["QUEUED", "DELIVERED", "FAILED", "DEAD", "BLOCKED"] as const;
export type WebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUSES)[number];

export const API_KEY_STATUSES = ["ACTIVE", "REVOKED", "EXPIRED"] as const;
export type ApiKeyStatus = (typeof API_KEY_STATUSES)[number];

export const API_SCOPES = [
  "employees.read",
  "organization.read",
  "attendance.read",
  "leave.read",
  "payroll.read",
  "payslips.read",
] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export const API_SCOPE_LABELS: Record<ApiScope, string> = {
  "employees.read": "Read employees",
  "organization.read": "Read organization structure",
  "attendance.read": "Read attendance summaries",
  "leave.read": "Read leave balances and requests",
  "payroll.read": "Read payroll run summaries",
  "payslips.read": "Read authorized payslip metadata",
};

export const TEMPLATE_VARIABLES = [
  "employee_name",
  "employee_code",
  "organization_name",
  "status",
  "period",
  "amount",
  "due_date",
  "title",
  "body",
  "href",
] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

export const NOTIFICATION_NAV = [
  { href: "/notifications", label: "Inbox" },
] as const;

export const AUTOMATION_NAV = [
  { href: "/automation", label: "Overview" },
  { href: "/automation/rules", label: "Rules" },
  { href: "/automation/jobs", label: "Jobs" },
] as const;

export const DEVELOPER_NAV = [
  { href: "/settings/developers", label: "Overview" },
  { href: "/settings/developers/webhooks", label: "Webhooks" },
  { href: "/settings/developers/webhook-logs", label: "Webhook logs" },
  { href: "/settings/developers/api-keys", label: "API keys" },
  { href: "/settings/developers/api-logs", label: "API logs" },
  { href: "/settings/developers/docs", label: "API docs" },
] as const;

export const NOTIFICATION_SETTINGS_NAV = [
  { href: "/settings/notifications", label: "Preferences" },
  { href: "/settings/notifications/templates", label: "Templates" },
] as const;

export const ANALYTICS_NAV = [
  { href: "/analytics", label: "Overview" },
  { href: "/analytics/variance", label: "Variance" },
  { href: "/analytics/anomalies", label: "Anomalies" },
  { href: "/analytics/assistant", label: "Assistant" },
] as const;

export const ANALYTICS_ALERT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type AnalyticsAlertSeverity = (typeof ANALYTICS_ALERT_SEVERITIES)[number];

export const ANALYTICS_ALERT_SEVERITY_LABELS: Record<AnalyticsAlertSeverity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const ANALYTICS_ALERT_STATUSES = ["OPEN", "ACKNOWLEDGED", "INVESTIGATING", "RESOLVED", "DISMISSED"] as const;
export type AnalyticsAlertStatus = (typeof ANALYTICS_ALERT_STATUSES)[number];

export const ANALYTICS_ALERT_STATUS_LABELS: Record<AnalyticsAlertStatus, string> = {
  OPEN: "Open",
  ACKNOWLEDGED: "Acknowledged",
  INVESTIGATING: "Investigating",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

export const ANALYTICS_RULE_CODES = [
  "PAYROLL_COST_SPIKE",
  "NET_PAY_VARIANCE",
  "LOP_SPIKE",
  "HOLD_RATE_HIGH",
  "LEAVE_PENDING_BACKLOG",
  "CLAIM_PENDING_BACKLOG",
  "LOAN_OVERDUE",
  "BIOMETRIC_UNMAPPED",
  "BIOMETRIC_FAILED_INGEST",
  "HEADCOUNT_CHANGE",
] as const;
export type AnalyticsRuleCode = (typeof ANALYTICS_RULE_CODES)[number];

export const ANALYTICS_RULE_LABELS: Record<AnalyticsRuleCode, string> = {
  PAYROLL_COST_SPIKE: "Payroll cost spike",
  NET_PAY_VARIANCE: "Net pay variance",
  LOP_SPIKE: "LOP days spike",
  HOLD_RATE_HIGH: "Hold rate high",
  LEAVE_PENDING_BACKLOG: "Leave pending backlog",
  CLAIM_PENDING_BACKLOG: "Claim pending backlog",
  LOAN_OVERDUE: "Overdue loan installments",
  BIOMETRIC_UNMAPPED: "Unmapped biometric punches",
  BIOMETRIC_FAILED_INGEST: "Failed biometric ingest",
  HEADCOUNT_CHANGE: "Headcount change",
};

export const DEFAULT_ANALYTICS_THRESHOLDS: Record<AnalyticsRuleCode, number> = {
  PAYROLL_COST_SPIKE: 10,
  NET_PAY_VARIANCE: 15,
  LOP_SPIKE: 20,
  HOLD_RATE_HIGH: 10,
  LEAVE_PENDING_BACKLOG: 5,
  CLAIM_PENDING_BACKLOG: 5,
  LOAN_OVERDUE: 1,
  BIOMETRIC_UNMAPPED: 3,
  BIOMETRIC_FAILED_INGEST: 3,
  HEADCOUNT_CHANGE: 10,
};

export const BIOMETRIC_VERIFICATION_STATUSES = [
  "VERIFIED_IN_DEMO",
  "PROTOCOL_FOUNDATION",
  "UNVERIFIED_HARDWARE",
  "UNSUPPORTED",
] as const;
export type BiometricVerificationStatus = (typeof BIOMETRIC_VERIFICATION_STATUSES)[number];

export const BIOMETRIC_VERIFICATION_STATUS_LABELS: Record<BiometricVerificationStatus, string> = {
  VERIFIED_IN_DEMO: "Verified in demo",
  PROTOCOL_FOUNDATION: "Protocol foundation",
  UNVERIFIED_HARDWARE: "Unverified hardware",
  UNSUPPORTED: "Unsupported",
};

export const AI_USAGE_STATUSES = ["UNCONFIGURED", "ANSWERED", "UNAVAILABLE", "FAILED"] as const;
export type AiUsageStatus = (typeof AI_USAGE_STATUSES)[number];

export const BILLING_CYCLES = ["MONTHLY", "ANNUAL"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  MONTHLY: "Monthly",
  ANNUAL: "Annual",
};

export const PLAN_STATUSES = ["DRAFT", "ACTIVE", "RETIRED"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  RETIRED: "Retired",
};

export const SUBSCRIPTION_STATUSES = [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "GRACE_PERIOD",
  "SUSPENDED",
  "CANCELLED",
  "EXPIRED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: "Trial",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  GRACE_PERIOD: "Grace period",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export const BILLING_INVOICE_STATUSES = [
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "VOID",
] as const;
export type BillingInvoiceStatus = (typeof BILLING_INVOICE_STATUSES)[number];

export const BILLING_INVOICE_STATUS_LABELS: Record<BillingInvoiceStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
};

export const BILLING_PAYMENT_STATUSES = ["PENDING", "FAILED", "SUCCESS", "REFUNDED"] as const;
export type BillingPaymentStatus = (typeof BILLING_PAYMENT_STATUSES)[number];

export const BILLING_PAYMENT_STATUS_LABELS: Record<BillingPaymentStatus, string> = {
  PENDING: "Pending",
  FAILED: "Failed",
  SUCCESS: "Success",
  REFUNDED: "Refunded",
};

export const BILLING_LINE_TYPES = ["SUBSCRIPTION", "DISCOUNT", "TAX", "ADJUSTMENT"] as const;
export type BillingLineType = (typeof BILLING_LINE_TYPES)[number];

export const BILLING_ADJUSTMENT_KINDS = ["CREDIT", "DEBIT", "ENTITLEMENT_OVERRIDE"] as const;
export type BillingAdjustmentKind = (typeof BILLING_ADJUSTMENT_KINDS)[number];

export const SUBSCRIPTION_EVENT_TYPES = [
  "CREATED",
  "ACTIVATED",
  "TRIAL_STARTED",
  "TRIAL_EXPIRED",
  "RENEWED",
  "UPGRADED",
  "DOWNGRADED",
  "CANCELLED",
  "PAST_DUE",
  "GRACE_STARTED",
  "SUSPENDED",
  "EXPIRED",
  "OVERRIDE",
] as const;
export type SubscriptionEventType = (typeof SUBSCRIPTION_EVENT_TYPES)[number];

export const ENTITLEMENT_KEYS = [
  "employees",
  "branches",
  "biometric_devices",
  "api_access",
  "advanced_analytics",
  "reports_export",
] as const;
export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];

export const ENTITLEMENT_KEY_LABELS: Record<EntitlementKey, string> = {
  employees: "Active employees",
  branches: "Active branches",
  biometric_devices: "Registered biometric devices",
  api_access: "API access",
  advanced_analytics: "Advanced analytics",
  reports_export: "Report export",
};

export const USAGE_METRIC_KEYS = [
  "active_employees",
  "active_branches",
  "registered_biometric_devices",
  "api_requests_30d",
] as const;
export type UsageMetricKey = (typeof USAGE_METRIC_KEYS)[number];

export const USAGE_METRIC_LABELS: Record<UsageMetricKey, string> = {
  active_employees: "Active employees",
  active_branches: "Active branches",
  registered_biometric_devices: "Registered biometric devices",
  api_requests_30d: "API requests (30 days)",
};

export const BILLING_NAV = [
  { href: "/billing/invoices", label: "Invoices" },
  { href: "/billing/payments", label: "Payments" },
] as const;

export const ADMIN_SUBSCRIPTION_NAV = [
  { href: "/admin/subscriptions", label: "Overview" },
  { href: "/admin/subscriptions/plans", label: "Plans" },
] as const;

export const SETTINGS_SUBSCRIPTION_NAV = [
  { href: "/settings/subscription", label: "Subscription" },
  { href: "/settings/subscription/usage", label: "Usage" },
] as const;

export const OPEN_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "GRACE_PERIOD",
  "SUSPENDED",
];

export const RESTRICTED_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ["SUSPENDED", "CANCELLED", "EXPIRED"];

export const SUBSCRIPTION_BILLING_ALLOWED_WHEN_RESTRICTED = [
  "/settings/subscription",
  "/settings/subscription/usage",
  "/billing/invoices",
  "/billing/payments",
  "/admin/subscriptions",
  "/profile",
  "/support",
] as const;

export const ONBOARDING_STEP_KEYS = [
  "COMPANY",
  "BRANCHES",
  "EMPLOYEES",
  "STATUTORY",
  "SALARY",
  "LEAVE",
  "ATTENDANCE",
  "BIOMETRIC",
  "PAYROLL",
  "USERS",
  "REVIEW",
] as const;
export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number];

export const ONBOARDING_STEP_LABELS: Record<OnboardingStepKey, string> = {
  COMPANY: "Company profile",
  BRANCHES: "Branches and departments",
  EMPLOYEES: "Employees",
  STATUTORY: "Statutory settings",
  SALARY: "Salary structures",
  LEAVE: "Leave types",
  ATTENDANCE: "Attendance and shifts",
  BIOMETRIC: "Biometric devices",
  PAYROLL: "Payroll readiness",
  USERS: "Users and roles",
  REVIEW: "Review and go live",
};

export const ONBOARDING_STEP_HREFS: Record<OnboardingStepKey, string> = {
  COMPANY: "/settings/company",
  BRANCHES: "/settings/branches",
  EMPLOYEES: "/employees",
  STATUTORY: "/compliance/settings",
  SALARY: "/salary",
  LEAVE: "/leave",
  ATTENDANCE: "/attendance",
  BIOMETRIC: "/biometric",
  PAYROLL: "/payroll",
  USERS: "/settings/users",
  REVIEW: "/onboarding",
};

export const ONBOARDING_STEP_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETE", "BLOCKED", "SKIPPED"] as const;
export type OnboardingStepStatus = (typeof ONBOARDING_STEP_STATUSES)[number];

export const ONBOARDING_STEP_STATUS_LABELS: Record<OnboardingStepStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETE: "Complete",
  BLOCKED: "Blocked",
  SKIPPED: "Skipped",
};

export const ONBOARDING_PROGRESS_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETE"] as const;
export type OnboardingProgressStatus = (typeof ONBOARDING_PROGRESS_STATUSES)[number];

export const IMPORT_ENTITY_TYPES = [
  "EMPLOYEES",
  "SALARY",
  "LEAVE_BALANCES",
  "LOAN_BALANCES",
  "HISTORICAL_PAYROLL",
  "OPENING_BALANCES",
] as const;
export type ImportEntityType = (typeof IMPORT_ENTITY_TYPES)[number];

export const IMPORT_ENTITY_TYPE_LABELS: Record<ImportEntityType, string> = {
  EMPLOYEES: "Employees",
  SALARY: "Salary assignments",
  LEAVE_BALANCES: "Leave opening balances",
  LOAN_BALANCES: "Loan opening balances",
  HISTORICAL_PAYROLL: "Historical payroll",
  OPENING_BALANCES: "Opening balances",
};

export const IMPORT_JOB_STATUSES = [
  "UPLOADED",
  "PREVIEWED",
  "CONFIRMED",
  "IMPORTING",
  "IMPORTED",
  "PARTIAL",
  "FAILED",
  "CANCELLED",
] as const;
export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

export const IMPORT_JOB_STATUS_LABELS: Record<ImportJobStatus, string> = {
  UPLOADED: "Uploaded",
  PREVIEWED: "Previewed",
  CONFIRMED: "Confirmed",
  IMPORTING: "Importing",
  IMPORTED: "Imported",
  PARTIAL: "Partial",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const IMPORT_ROW_STATUSES = ["READY", "ERROR", "WARNING", "IMPORTED", "SKIPPED"] as const;
export type ImportRowStatus = (typeof IMPORT_ROW_STATUSES)[number];

export const SUPPORT_CATEGORIES = [
  "PAYROLL",
  "ATTENDANCE",
  "BILLING",
  "MIGRATION",
  "ACCESS",
  "OTHER",
] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  PAYROLL: "Payroll",
  ATTENDANCE: "Attendance",
  BILLING: "Billing",
  MIGRATION: "Migration",
  ACCESS: "Access",
  OTHER: "Other",
};

export const SUPPORT_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

export const SUPPORT_PRIORITY_LABELS: Record<SupportPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const SUPPORT_TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "RESOLVED",
  "CLOSED",
] as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export const SUPPORT_TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_CUSTOMER: "Waiting on customer",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const SUPPORT_MESSAGE_VISIBILITIES = ["CUSTOMER", "INTERNAL"] as const;
export type SupportMessageVisibility = (typeof SUPPORT_MESSAGE_VISIBILITIES)[number];

export const DATA_EXPORT_KINDS = ["FULL", "EMPLOYEES", "PAYROLL", "LEAVE", "BILLING"] as const;
export type DataExportKind = (typeof DATA_EXPORT_KINDS)[number];

export const DATA_EXPORT_KIND_LABELS: Record<DataExportKind, string> = {
  FULL: "Full organization export",
  EMPLOYEES: "Employees",
  PAYROLL: "Payroll history",
  LEAVE: "Leave balances and requests",
  BILLING: "Subscription invoices",
};

export const DATA_EXPORT_STATUSES = [
  "REQUESTED",
  "PROCESSING",
  "READY",
  "EXPIRED",
  "FAILED",
  "CANCELLED",
] as const;
export type DataExportStatus = (typeof DATA_EXPORT_STATUSES)[number];

export const DATA_EXPORT_STATUS_LABELS: Record<DataExportStatus, string> = {
  REQUESTED: "Requested",
  PROCESSING: "Processing",
  READY: "Ready",
  EXPIRED: "Expired",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const OFFBOARDING_STATUSES = [
  "REQUESTED",
  "EXPORT_READY",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OffboardingStatus = (typeof OFFBOARDING_STATUSES)[number];

export const OFFBOARDING_STATUS_LABELS: Record<OffboardingStatus, string> = {
  REQUESTED: "Requested",
  EXPORT_READY: "Export ready",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const SUPPORT_NAV = [
  { href: "/support", label: "Tickets" },
  { href: "/support/new", label: "New ticket" },
] as const;

export const ADMIN_SUPPORT_NAV = [
  { href: "/admin/support", label: "Tickets" },
  { href: "/admin/ops", label: "Operations" },
] as const;

export const MIGRATION_NAV = [
  { href: "/settings/data-migration", label: "Import" },
  { href: "/settings/data-migration/history", label: "History" },
] as const;

export const DATA_EXPORT_NAV = [
  { href: "/settings/data-export", label: "Exports" },
  { href: "/settings/data-export/offboarding", label: "Offboarding" },
] as const;

export const DATA_EXPORT_TTL_HOURS = 72;
export const SUPPORT_SLA_HOURS: Record<SupportPriority, number> = {
  LOW: 72,
  NORMAL: 24,
  HIGH: 8,
  URGENT: 4,
};
