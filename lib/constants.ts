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
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number]["code"];

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleCode, PermissionCode[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.code),
  ADMIN: PERMISSIONS.map((p) => p.code),
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
  ],
  PAYROLL: [
    "organization.view",
    "user.view",
    "employee.view",
    "attendance.view",
    "payroll.view",
    "payroll.process",
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
  ],
  ACCOUNTANT: [
    "organization.view",
    "employee.view",
    "payroll.view",
    "leave.view",
    "salary.view",
    "salary.history.view",
    "benefits.view",
    "claims.view",
    "claims.approve",
    "claims.export",
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
  ],
  EMPLOYEE: [
    "organization.view",
    "employee.view",
    "attendance.view",
    "leave.view",
    "leave.request",
    "claims.view",
    "claims.create",
  ],
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", enabled: true },
  { href: "/employees", label: "Employees", icon: "Users", enabled: true, phase: 2 },
  { href: "/attendance", label: "Attendance", icon: "CalendarCheck", enabled: false, phase: 4 },
  { href: "/leave", label: "Leave", icon: "Palmtree", enabled: true, phase: 5 },
  { href: "/salary", label: "Salary", icon: "Banknote", enabled: true, phase: 6 },
  { href: "/benefits", label: "Benefits", icon: "Gift", enabled: true, phase: 7 },
  { href: "/claims", label: "Claims", icon: "Receipt", enabled: true, phase: 7 },
  { href: "/biometric", label: "Biometric", icon: "Fingerprint", enabled: true, phase: 3 },
  { href: "/payroll", label: "Payroll", icon: "Wallet", enabled: false, phase: 9 },
  { href: "/reports", label: "Reports", icon: "BarChart3", enabled: false, phase: 10 },
  { href: "/compliance", label: "Compliance", icon: "ShieldCheck", enabled: false, phase: 9 },
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

export const BIOMETRIC_VENDORS = ["ESSL", "GENERIC"] as const;
export type BiometricVendor = (typeof BIOMETRIC_VENDORS)[number];

export const BIOMETRIC_VENDOR_LABELS: Record<BiometricVendor, string> = {
  ESSL: "eSSL / ZKTeco",
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
