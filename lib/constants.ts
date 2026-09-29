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
  ],
  ACCOUNTANT: ["organization.view", "employee.view", "payroll.view", "leave.view"],
  MANAGER: [
    "organization.view",
    "user.view",
    "employee.view",
    "attendance.view",
    "biometric.view",
    "leave.view",
    "leave.request",
    "leave.approve",
  ],
  EMPLOYEE: ["organization.view", "employee.view", "attendance.view", "leave.view", "leave.request"],
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", enabled: true },
  { href: "/employees", label: "Employees", icon: "Users", enabled: true, phase: 2 },
  { href: "/attendance", label: "Attendance", icon: "CalendarCheck", enabled: false, phase: 4 },
  { href: "/leave", label: "Leave", icon: "Palmtree", enabled: true, phase: 5 },
  { href: "/biometric", label: "Biometric", icon: "Fingerprint", enabled: true, phase: 3 },
  { href: "/payroll", label: "Payroll", icon: "Wallet", enabled: false, phase: 7 },
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
