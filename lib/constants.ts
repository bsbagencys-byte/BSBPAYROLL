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
  ],
  PAYROLL: [
    "organization.view",
    "user.view",
    "employee.view",
    "attendance.view",
    "payroll.view",
    "payroll.process",
  ],
  ACCOUNTANT: ["organization.view", "employee.view", "payroll.view"],
  MANAGER: ["organization.view", "user.view", "employee.view", "attendance.view"],
  EMPLOYEE: ["organization.view", "employee.view", "attendance.view"],
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", enabled: true },
  { href: "/employees", label: "Employees", icon: "Users", enabled: true, phase: 2 },
  { href: "/attendance", label: "Attendance", icon: "CalendarCheck", enabled: false, phase: 4 },
  { href: "/leave", label: "Leave", icon: "Palmtree", enabled: false, phase: 5 },
  { href: "/biometric", label: "Biometric", icon: "Fingerprint", enabled: false, phase: 3 },
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
