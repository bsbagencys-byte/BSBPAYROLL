import { cookies } from "next/headers";
import type {
  AttendanceDay,
  AttendancePunch,
  AuditLog,
  BiometricDevice,
  BiometricIdentityMap,
  BiometricNormalizedEvent,
  BiometricRawEvent,
  Branch,
  CompOffEarning,
  Department,
  Designation,
  Employee,
  EmployeeAddress,
  EmployeeBankAccount,
  EmployeeDocument,
  EmployeeEmployment,
  EmployeeHistory,
  EmployeeStatutory,
  EmploymentType,
  Holiday,
  LeaveApproval,
  LeaveBalance,
  LeaveBalanceTransaction,
  LeavePolicy,
  LeavePolicyAssignment,
  LeaveRequest,
  LeaveRequestDay,
  LeaveType,
  Location,
  Organization,
  OrganizationUser,
  Role,
  SessionUser,
  UserProfile,
} from "@/types";
import {
  DEFAULT_EMPLOYMENT_TYPES,
  DEFAULT_ROLE_PERMISSIONS,
  DEMO_ESSL_DEVICE_ID,
  DEMO_ESSL_DEVICE_TOKEN,
  PERMISSIONS,
  ROLE_LABELS,
  type PermissionCode,
  type RoleCode,
} from "@/lib/constants";
import { sha256, tokenHint } from "@/lib/biometric/hash";

const SESSION_COOKIE = "bsb_demo_session";

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const BRANCH_ID = "22222222-2222-2222-2222-222222222222";
const DEPT_ID = "33333333-3333-3333-3333-333333333333";
const DESIG_ID = "44444444-4444-4444-4444-444444444444";
const LOCATION_ID = "55555555-5555-5555-5555-555555555555";
const EMP_TYPE_FT = "66666666-6666-6666-6666-666666666661";
const EMPLOYEE_ADMIN_ID = "e1111111-1111-1111-1111-111111111111";
const EMPLOYEE_HR_ID = "e2222222-2222-2222-2222-222222222222";
const EMPLOYEE_STAFF_ID = "e3333333-3333-3333-3333-333333333333";

const ROLE_IDS: Record<RoleCode, string> = {
  SUPER_ADMIN: "r-super",
  ADMIN: "r-admin",
  HR: "r-hr",
  PAYROLL: "r-payroll",
  ACCOUNTANT: "r-accountant",
  MANAGER: "r-manager",
  EMPLOYEE: "r-employee",
};

export const DEMO_PASSWORDS: Record<string, string> = {
  bsbadmin: "Admin@123",
  bsbhr: "Hruser@123",
  bsbpayroll: "Payroll@123",
  bsbemployee: "Employee@123",
};

function nowIso() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

const initialOrg: Organization = {
  id: ORG_ID,
  name: "BSB Demo Pvt Ltd",
  legal_name: "BSB Demo Private Limited",
  display_name: "BSB Demo",
  phone: "9876543210",
  email: "ops@demo.bsbpayroll.example",
  address_line1: "12 MG Road",
  address_line2: null,
  city: "Bengaluru",
  state: "Karnataka",
  pin: "560001",
  pan: "ABCDE1234F",
  tan: "BLRA12345B",
  gstin: "29ABCDE1234F1Z5",
  industry: "Information Technology",
  payroll_frequency: "MONTHLY",
  weekly_off: "SUNDAY",
  timezone: "Asia/Kolkata",
  currency: "INR",
  setup_completed: true,
  setup_step: 4,
  status: "ACTIVE",
  is_demo: true,
  created_at: nowIso(),
  updated_at: nowIso(),
};

const initialUsers: UserProfile[] = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    auth_user_id: "auth-admin",
    username: "bsbadmin",
    display_name: "BSB Super Admin",
    mobile: "9000000001",
    photo_url: null,
    status: "ACTIVE",
    is_demo: true,
    last_login_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    auth_user_id: "auth-hr",
    username: "bsbhr",
    display_name: "BSB HR",
    mobile: "9000000002",
    photo_url: null,
    status: "ACTIVE",
    is_demo: true,
    last_login_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    auth_user_id: "auth-payroll",
    username: "bsbpayroll",
    display_name: "BSB Payroll",
    mobile: "9000000003",
    photo_url: null,
    status: "ACTIVE",
    is_demo: true,
    last_login_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    auth_user_id: "auth-employee",
    username: "bsbemployee",
    display_name: "BSB Employee",
    mobile: "9000000004",
    photo_url: null,
    status: "ACTIVE",
    is_demo: true,
    last_login_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  },
];

const initialMemberships: OrganizationUser[] = [
  {
    id: "m-admin",
    organization_id: ORG_ID,
    user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    role_id: ROLE_IDS.SUPER_ADMIN,
    branch_id: BRANCH_ID,
    status: "ACTIVE",
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: "m-hr",
    organization_id: ORG_ID,
    user_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    role_id: ROLE_IDS.HR,
    branch_id: BRANCH_ID,
    status: "ACTIVE",
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: "m-payroll",
    organization_id: ORG_ID,
    user_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    role_id: ROLE_IDS.PAYROLL,
    branch_id: BRANCH_ID,
    status: "ACTIVE",
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: "m-employee",
    organization_id: ORG_ID,
    user_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    role_id: ROLE_IDS.EMPLOYEE,
    branch_id: BRANCH_ID,
    status: "ACTIVE",
    created_at: nowIso(),
    updated_at: nowIso(),
  },
];

export type DemoStore = {
  org: Organization;
  users: UserProfile[];
  memberships: OrganizationUser[];
  branches: Branch[];
  departments: Department[];
  designations: Designation[];
  locations: Location[];
  employmentTypes: EmploymentType[];
  employees: Employee[];
  employeeAddresses: EmployeeAddress[];
  employeeEmployment: EmployeeEmployment[];
  employeeStatutory: EmployeeStatutory[];
  employeeBank: EmployeeBankAccount[];
  employeeDocuments: EmployeeDocument[];
  employeeHistory: EmployeeHistory[];
  documentBlobs: Record<string, { dataUrl: string; mimeType: string; fileName: string }>;
  audit: AuditLog[];
  passwords: Record<string, string>;
  pendingReset: Record<string, { token: string; expiresAt: number }>;
  biometricDevices: BiometricDevice[];
  biometricIdentityMaps: BiometricIdentityMap[];
  biometricRawEvents: BiometricRawEvent[];
  biometricNormalizedEvents: BiometricNormalizedEvent[];
  attendancePunches: AttendancePunch[];
  leaveTypes: LeaveType[];
  leavePolicies: LeavePolicy[];
  leavePolicyAssignments: LeavePolicyAssignment[];
  leaveBalances: LeaveBalance[];
  leaveBalanceTransactions: LeaveBalanceTransaction[];
  leaveRequests: LeaveRequest[];
  leaveRequestDays: LeaveRequestDay[];
  leaveApprovals: LeaveApproval[];
  holidays: Holiday[];
  compOffEarnings: CompOffEarning[];
  attendanceDays: AttendanceDay[];
};

const globalStore = globalThis as unknown as {
  __bsbDemo?: DemoStore;
};

function createStore(): DemoStore {
  return {
    org: clone(initialOrg),
    users: clone(initialUsers),
    memberships: clone(initialMemberships),
    branches: [
      {
        id: BRANCH_ID,
        organization_id: ORG_ID,
        name: "Head Office",
        code: "HO",
        address: "12 MG Road",
        city: "Bengaluru",
        state: "Karnataka",
        pin: "560001",
        phone: "9876543210",
        email: "ho@demo.bsbpayroll.example",
        is_default: true,
        status: "ACTIVE" as const,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ],
    departments: [
      {
        id: DEPT_ID,
        organization_id: ORG_ID,
        name: "Operations",
        code: "OPS",
        manager_employee_id: EMPLOYEE_ADMIN_ID,
        is_default: true,
        status: "ACTIVE" as const,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ],
    designations: [
      {
        id: DESIG_ID,
        organization_id: ORG_ID,
        name: "Staff",
        code: "STF",
        department_id: DEPT_ID,
        is_default: true,
        status: "ACTIVE" as const,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ],
    locations: [
      {
        id: LOCATION_ID,
        organization_id: ORG_ID,
        name: "MG Road Campus",
        address: "12 MG Road, Bengaluru",
        branch_id: BRANCH_ID,
        status: "ACTIVE" as const,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ],
    employmentTypes: DEFAULT_EMPLOYMENT_TYPES.map((type, index) => ({
      id: index === 0 ? EMP_TYPE_FT : `etype-${index}`,
      organization_id: ORG_ID,
      name: type.name,
      code: type.code,
      is_system: type.isSystem,
      status: "ACTIVE" as const,
      created_at: nowIso(),
      updated_at: nowIso(),
    })),
    employees: [
      {
        id: EMPLOYEE_ADMIN_ID,
        organization_id: ORG_ID,
        employee_code: "BSB-1001",
        first_name: "Asha",
        middle_name: null,
        last_name: "Rao",
        display_name: "Asha Rao",
        gender: "FEMALE" as const,
        date_of_birth: "1988-04-12",
        mobile: "9000000001",
        alternate_mobile: null,
        personal_email: "asha.rao@example.com",
        photo_url: null,
        emergency_contact_name: "Ravi Rao",
        emergency_contact_number: "9000000091",
        emergency_relationship: "Spouse",
        status: "ACTIVE",
        user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        is_demo: true,
        created_by: null,
        updated_by: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: EMPLOYEE_HR_ID,
        organization_id: ORG_ID,
        employee_code: "BSB-1002",
        first_name: "Meera",
        middle_name: null,
        last_name: "Iyer",
        display_name: "Meera Iyer",
        gender: "FEMALE" as const,
        date_of_birth: "1991-09-03",
        mobile: "9000000002",
        alternate_mobile: null,
        personal_email: "meera.iyer@example.com",
        photo_url: null,
        emergency_contact_name: "Anand Iyer",
        emergency_contact_number: "9000000092",
        emergency_relationship: "Father",
        status: "ACTIVE",
        user_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        is_demo: true,
        created_by: null,
        updated_by: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: EMPLOYEE_STAFF_ID,
        organization_id: ORG_ID,
        employee_code: "BSB-1003",
        first_name: "Rahul",
        middle_name: null,
        last_name: "Sharma",
        display_name: "Rahul Sharma",
        gender: "MALE" as const,
        date_of_birth: "1996-01-21",
        mobile: "9000000004",
        alternate_mobile: null,
        personal_email: "rahul.sharma@example.com",
        photo_url: null,
        emergency_contact_name: "Neha Sharma",
        emergency_contact_number: "9000000094",
        emergency_relationship: "Spouse",
        status: "ACTIVE",
        user_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        is_demo: true,
        created_by: null,
        updated_by: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ],
    employeeAddresses: [
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_ADMIN_ID,
        address_line1: "14 Residency Road",
        address_line2: null,
        city: "Bengaluru",
        state: "Karnataka",
        pin: "560025",
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_HR_ID,
        address_line1: "8 Church Street",
        address_line2: null,
        city: "Bengaluru",
        state: "Karnataka",
        pin: "560001",
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_STAFF_ID,
        address_line1: "22 Indiranagar",
        address_line2: null,
        city: "Bengaluru",
        state: "Karnataka",
        pin: "560038",
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ],
    employeeEmployment: [
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_ADMIN_ID,
        joining_date: "2018-06-01",
        employment_type_id: EMP_TYPE_FT,
        branch_id: BRANCH_ID,
        department_id: DEPT_ID,
        designation_id: DESIG_ID,
        reporting_manager_id: null,
        location_id: LOCATION_ID,
        official_email: "asha.rao@demo.bsbpayroll.example",
        work_phone: "9000000001",
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_HR_ID,
        joining_date: "2020-02-10",
        employment_type_id: EMP_TYPE_FT,
        branch_id: BRANCH_ID,
        department_id: DEPT_ID,
        designation_id: DESIG_ID,
        reporting_manager_id: EMPLOYEE_ADMIN_ID,
        location_id: LOCATION_ID,
        official_email: "meera.iyer@demo.bsbpayroll.example",
        work_phone: "9000000002",
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_STAFF_ID,
        joining_date: "2023-08-15",
        employment_type_id: EMP_TYPE_FT,
        branch_id: BRANCH_ID,
        department_id: DEPT_ID,
        designation_id: DESIG_ID,
        reporting_manager_id: EMPLOYEE_HR_ID,
        location_id: LOCATION_ID,
        official_email: "rahul.sharma@demo.bsbpayroll.example",
        work_phone: "9000000004",
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ],
    employeeStatutory: [
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_ADMIN_ID,
        pan: "ABCDE1234F",
        aadhaar_last4: "4321",
        uan: "100123456789",
        esic_number: null,
        pf_applicable: true,
        esi_applicable: false,
        pt_applicable: true,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_HR_ID,
        pan: "BBBBB1234C",
        aadhaar_last4: "8877",
        uan: "100987654321",
        esic_number: null,
        pf_applicable: true,
        esi_applicable: false,
        pt_applicable: true,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_STAFF_ID,
        pan: "CCCCC1234D",
        aadhaar_last4: "2211",
        uan: null,
        esic_number: null,
        pf_applicable: true,
        esi_applicable: false,
        pt_applicable: true,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ],
    employeeBank: [
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_ADMIN_ID,
        account_holder_name: "Asha Rao",
        bank_name: "HDFC Bank",
        account_number: "50100012345678",
        ifsc: "HDFC0001234",
        branch_name: "MG Road",
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_HR_ID,
        account_holder_name: "Meera Iyer",
        bank_name: "ICICI Bank",
        account_number: "004401234567",
        ifsc: "ICIC0000044",
        branch_name: "Church Street",
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_STAFF_ID,
        account_holder_name: "Rahul Sharma",
        bank_name: "SBI",
        account_number: "31234567890",
        ifsc: "SBIN0000456",
        branch_name: "Indiranagar",
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ],
    employeeDocuments: [] as EmployeeDocument[],
    employeeHistory: [
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_ADMIN_ID,
        event_type: "JOINING",
        old_value: null,
        new_value: "Joined as Staff",
        effective_date: "2018-06-01",
        reason: "Founding team",
        changed_by: null,
        created_at: nowIso(),
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_HR_ID,
        event_type: "JOINING",
        old_value: null,
        new_value: "Joined as Staff",
        effective_date: "2020-02-10",
        reason: null,
        changed_by: null,
        created_at: nowIso(),
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_STAFF_ID,
        event_type: "JOINING",
        old_value: null,
        new_value: "Joined as Staff",
        effective_date: "2023-08-15",
        reason: null,
        changed_by: null,
        created_at: nowIso(),
      },
    ],
    documentBlobs: {},
    audit: [] as AuditLog[],
    passwords: { ...DEMO_PASSWORDS },
    pendingReset: {} as Record<string, { token: string; expiresAt: number }>,
    biometricDevices: [
      {
        id: DEMO_ESSL_DEVICE_ID,
        organization_id: ORG_ID,
        name: "HO eSSL Gate",
        vendor: "ESSL",
        serial_number: "ESSL-HO-001",
        model: "X990",
        firmware: "6.60",
        connection_mode: "PUSH",
        branch_id: BRANCH_ID,
        location_id: LOCATION_ID,
        timezone: "Asia/Kolkata",
        token_hash: sha256(DEMO_ESSL_DEVICE_TOKEN),
        token_hint: tokenHint(DEMO_ESSL_DEVICE_TOKEN),
        status: "ACTIVE",
        last_seen_at: null,
        last_error: null,
        created_by: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ],
    biometricIdentityMaps: [
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        device_id: DEMO_ESSL_DEVICE_ID,
        device_user_id: "1001",
        employee_id: EMPLOYEE_ADMIN_ID,
        status: "ACTIVE",
        created_by: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        device_id: DEMO_ESSL_DEVICE_ID,
        device_user_id: "1002",
        employee_id: EMPLOYEE_HR_ID,
        status: "ACTIVE",
        created_by: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        device_id: DEMO_ESSL_DEVICE_ID,
        device_user_id: "1003",
        employee_id: EMPLOYEE_STAFF_ID,
        status: "ACTIVE",
        created_by: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ],
    biometricRawEvents: [] as BiometricRawEvent[],
    biometricNormalizedEvents: [] as BiometricNormalizedEvent[],
    attendancePunches: [] as AttendancePunch[],
    ...createLeaveSeed(),
  };
}

function createLeaveSeed(): Pick<
  DemoStore,
  | "leaveTypes"
  | "leavePolicies"
  | "leavePolicyAssignments"
  | "leaveBalances"
  | "leaveBalanceTransactions"
  | "leaveRequests"
  | "leaveRequestDays"
  | "leaveApprovals"
  | "holidays"
  | "compOffEarnings"
  | "attendanceDays"
> {
  const created = nowIso();
  const year = new Date().getFullYear();
  const clId = "l1111111-1111-1111-1111-111111111111";
  const slId = "l2222222-2222-2222-2222-222222222222";
  const elId = "l3333333-3333-3333-3333-333333333333";
  const lopId = "l4444444-4444-4444-4444-444444444444";
  const compId = "l5555555-5555-5555-5555-555555555555";
  const policyCl = "p1111111-1111-1111-1111-111111111111";
  const policySl = "p2222222-2222-2222-2222-222222222222";
  const policyEl = "p3333333-3333-3333-3333-333333333333";
  const policyLop = "p4444444-4444-4444-4444-444444444444";
  const policyComp = "p5555555-5555-5555-5555-555555555555";
  const requestApproved = "q1111111-1111-1111-1111-111111111111";
  const requestPending = "q2222222-2222-2222-2222-222222222222";

  const type = (
    id: string,
    name: string,
    code: string,
    extras: Partial<LeaveType> = {}
  ): LeaveType => ({
    id,
    organization_id: ORG_ID,
    name,
    code,
    paid: true,
    requires_approval: true,
    requires_document: false,
    allow_half_day: true,
    allow_backdated: false,
    allow_future: true,
    carry_forward_allowed: false,
    max_carry_forward: null,
    encashment_allowed: false,
    negative_balance_allowed: false,
    is_comp_off: false,
    status: "ACTIVE",
    created_by: null,
    updated_by: null,
    created_at: created,
    updated_at: created,
    ...extras,
  });

  const policy = (
    id: string,
    name: string,
    leaveTypeId: string,
    allocation: number,
    extras: Partial<LeavePolicy> = {}
  ): LeavePolicy => ({
    id,
    organization_id: ORG_ID,
    name,
    leave_type_id: leaveTypeId,
    annual_allocation: allocation,
    accrual_method: "ANNUAL",
    accrual_frequency: "ANNUAL",
    start_balance: 0,
    carry_forward: false,
    carry_forward_limit: null,
    encashment: false,
    approval_required: true,
    count_weekly_off: false,
    count_holiday: false,
    version: 1,
    effective_from: `${year}-01-01`,
    effective_to: null,
    status: "ACTIVE",
    created_by: null,
    updated_by: null,
    created_at: created,
    updated_at: created,
    ...extras,
  });

  const assignment = (policyId: string): LeavePolicyAssignment => ({
    id: crypto.randomUUID(),
    organization_id: ORG_ID,
    policy_id: policyId,
    scope: "ORGANIZATION",
    branch_id: null,
    department_id: null,
    designation_id: null,
    employment_type_id: null,
    employee_id: null,
    created_at: created,
  });

  const balance = (employeeId: string, leaveTypeId: string, allocated: number, used = 0, pending = 0): LeaveBalance => ({
    id: crypto.randomUUID(),
    organization_id: ORG_ID,
    employee_id: employeeId,
    leave_type_id: leaveTypeId,
    year,
    opening: 0,
    allocated,
    accrued: 0,
    used,
    pending,
    carry_forward: 0,
    adjusted: 0,
    available: allocated - used - pending,
    updated_at: created,
  });

  const holiday = (name: string, date: string, holidayType: Holiday["holiday_type"]): Holiday => ({
    id: crypto.randomUUID(),
    organization_id: ORG_ID,
    name,
    holiday_date: `${year}-${date}`,
    holiday_type: holidayType,
    branch_id: null,
    location_id: null,
    optional: holidayType === "OPTIONAL",
    status: "ACTIVE",
    created_by: null,
    updated_by: null,
    created_at: created,
    updated_at: created,
  });

  return {
    leaveTypes: [
      type(clId, "Casual Leave", "CL"),
      type(slId, "Sick Leave", "SL", { allow_backdated: true, requires_document: true }),
      type(elId, "Earned Leave", "EL", { carry_forward_allowed: true, max_carry_forward: 15, encashment_allowed: true }),
      type(lopId, "Loss of Pay", "LOP", { paid: false, negative_balance_allowed: true }),
      type(compId, "Compensatory Off", "COMP", { is_comp_off: true, allow_backdated: true }),
    ],
    leavePolicies: [
      policy(policyCl, "Casual Leave — org", clId, 12),
      policy(policySl, "Sick Leave — org", slId, 8),
      policy(policyEl, "Earned Leave — org", elId, 18, { carry_forward: true, carry_forward_limit: 15, encashment: true }),
      policy(policyLop, "Loss of Pay — org", lopId, 0, { accrual_method: "NONE", accrual_frequency: "NONE", approval_required: true }),
      policy(policyComp, "Comp-off — org", compId, 0, { accrual_method: "MANUAL", accrual_frequency: "NONE" }),
    ],
    leavePolicyAssignments: [policyCl, policySl, policyEl, policyLop, policyComp].map(assignment),
    leaveBalances: [
      balance(EMPLOYEE_ADMIN_ID, clId, 12, 0, 0),
      balance(EMPLOYEE_ADMIN_ID, slId, 8, 0, 0),
      balance(EMPLOYEE_ADMIN_ID, elId, 18, 0, 0),
      balance(EMPLOYEE_ADMIN_ID, lopId, 0, 0, 0),
      balance(EMPLOYEE_ADMIN_ID, compId, 0, 0, 0),
      balance(EMPLOYEE_HR_ID, clId, 12, 1, 0),
      balance(EMPLOYEE_HR_ID, slId, 8, 0, 0),
      balance(EMPLOYEE_HR_ID, elId, 18, 0, 0),
      balance(EMPLOYEE_HR_ID, lopId, 0, 0, 0),
      balance(EMPLOYEE_HR_ID, compId, 0, 0, 0),
      balance(EMPLOYEE_STAFF_ID, clId, 12, 0, 1),
      balance(EMPLOYEE_STAFF_ID, slId, 8, 0, 0),
      balance(EMPLOYEE_STAFF_ID, elId, 18, 0, 0),
      balance(EMPLOYEE_STAFF_ID, lopId, 0, 0, 0),
      balance(EMPLOYEE_STAFF_ID, compId, 0, 0, 0),
    ],
    leaveBalanceTransactions: [
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_HR_ID,
        leave_type_id: clId,
        year,
        source: "USED" as const,
        quantity: 1,
        balance_before: 12,
        balance_after: 11,
        reference_id: requestApproved,
        notes: "Approved casual leave",
        created_by: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        created_at: created,
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_STAFF_ID,
        leave_type_id: clId,
        year,
        source: "PENDING" as const,
        quantity: 1,
        balance_before: 12,
        balance_after: 11,
        reference_id: requestPending,
        notes: "Pending casual leave",
        created_by: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        created_at: created,
      },
    ],
    leaveRequests: [
      {
        id: requestApproved,
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_HR_ID,
        leave_type_id: clId,
        from_date: `${year}-01-16`,
        to_date: `${year}-01-16`,
        session: "FULL",
        days: 1,
        reason: "Personal work",
        contact_during_leave: "9000000002",
        attachment_name: null,
        attachment_data: null,
        status: "APPROVED",
        submitted_at: created,
        decided_at: created,
        created_by: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        updated_by: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        created_at: created,
        updated_at: created,
      },
      {
        id: requestPending,
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_STAFF_ID,
        leave_type_id: clId,
        from_date: `${year}-02-10`,
        to_date: `${year}-02-10`,
        session: "FULL",
        days: 1,
        reason: "Family function",
        contact_during_leave: "9000000004",
        attachment_name: null,
        attachment_data: null,
        status: "PENDING",
        submitted_at: created,
        decided_at: null,
        created_by: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        updated_by: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        created_at: created,
        updated_at: created,
      },
    ],
    leaveRequestDays: [
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        request_id: requestApproved,
        employee_id: EMPLOYEE_HR_ID,
        work_date: `${year}-01-16`,
        session: "FULL",
        units: 1,
        counted: true,
        skip_reason: null,
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        request_id: requestPending,
        employee_id: EMPLOYEE_STAFF_ID,
        work_date: `${year}-02-10`,
        session: "FULL",
        units: 1,
        counted: true,
        skip_reason: null,
      },
    ],
    leaveApprovals: [
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        request_id: requestApproved,
        actor_user_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        action: "SUBMITTED",
        reason: null,
        created_at: created,
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        request_id: requestApproved,
        actor_user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        action: "APPROVED",
        reason: null,
        created_at: created,
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        request_id: requestPending,
        actor_user_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        action: "SUBMITTED",
        reason: null,
        created_at: created,
      },
    ],
    holidays: [
      holiday("Republic Day", "01-26", "NATIONAL"),
      holiday("Independence Day", "08-15", "NATIONAL"),
      holiday("Gandhi Jayanti", "10-02", "NATIONAL"),
      holiday("Diwali", "10-20", "OPTIONAL"),
      holiday("Christmas", "12-25", "COMPANY"),
    ],
    compOffEarnings: [
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_ADMIN_ID,
        work_date: `${year}-01-26`,
        source: "HOLIDAY",
        units: 1,
        status: "PENDING",
        notes: "Worked on Republic Day",
        request_id: null,
        decided_by: null,
        created_by: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        created_at: created,
        updated_at: created,
      },
    ],
    attendanceDays: [
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_HR_ID,
        work_date: `${year}-01-16`,
        status: "PAID_LEAVE",
        session: "FULL",
        leave_request_id: requestApproved,
        source: "LEAVE",
        previous_status: null,
        created_at: created,
        updated_at: created,
      },
      {
        id: crypto.randomUUID(),
        organization_id: ORG_ID,
        employee_id: EMPLOYEE_ADMIN_ID,
        work_date: `${year}-01-26`,
        status: "HOLIDAY",
        session: "FULL",
        leave_request_id: null,
        source: "CALENDAR",
        previous_status: null,
        created_at: created,
        updated_at: created,
      },
    ],
  };
}

export function getDemoStore(): DemoStore {
  if (
    !globalStore.__bsbDemo ||
    !("employees" in globalStore.__bsbDemo) ||
    !("biometricDevices" in globalStore.__bsbDemo) ||
    !("leaveTypes" in globalStore.__bsbDemo)
  ) {
    globalStore.__bsbDemo = createStore();
  }
  return globalStore.__bsbDemo;
}

export function getSystemRoles(): Role[] {
  return (Object.keys(ROLE_LABELS) as RoleCode[]).map((code) => ({
    id: ROLE_IDS[code],
    organization_id: null,
    code,
    name: ROLE_LABELS[code],
    description: null,
    is_system: true,
    created_at: nowIso(),
  }));
}

export function roleCodeFromId(roleId: string): RoleCode {
  const found = (Object.entries(ROLE_IDS) as [RoleCode, string][]).find(([, id]) => id === roleId);
  return found?.[0] ?? "EMPLOYEE";
}

export function buildSessionUser(userId: string): SessionUser | null {
  const store = getDemoStore();
  const profile = store.users.find((u) => u.id === userId);
  const membership = store.memberships.find((m) => m.user_id === userId);
  if (!profile || !membership) return null;
  const roleCode = roleCodeFromId(membership.role_id);
  const branch = store.branches.find((b) => b.id === membership.branch_id) ?? null;
  return {
    id: profile.id,
    authUserId: profile.auth_user_id,
    username: profile.username,
    displayName: profile.display_name,
    mobile: profile.mobile,
    photoUrl: profile.photo_url,
    status: profile.status,
    roleCode,
    roleName: ROLE_LABELS[roleCode],
    permissions: DEFAULT_ROLE_PERMISSIONS[roleCode],
    organization: clone(store.org),
    branch,
    membershipStatus: membership.status,
  };
}

export async function setDemoSession(userId: string, remember: boolean) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8,
  });
}

export async function clearDemoSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getDemoSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  const user = buildSessionUser(userId);
  if (!user || user.status === "DISABLED" || user.membershipStatus === "DISABLED") return null;
  return user;
}

export function appendAudit(entry: Omit<AuditLog, "id" | "created_at">) {
  const store = getDemoStore();
  store.audit.unshift({
    ...entry,
    id: crypto.randomUUID(),
    created_at: nowIso(),
  });
  store.audit = store.audit.slice(0, 200);
}

export function listOrgUsers() {
  const store = getDemoStore();
  return store.memberships.map((m) => {
    const profile = store.users.find((u) => u.id === m.user_id)!;
    const roleCode = roleCodeFromId(m.role_id);
    const branch = store.branches.find((b) => b.id === m.branch_id) ?? null;
    return {
      membership: m,
      profile,
      roleCode,
      roleName: ROLE_LABELS[roleCode],
      branch,
    };
  });
}

export function getPermissionsForRole(code: RoleCode): PermissionCode[] {
  return DEFAULT_ROLE_PERMISSIONS[code];
}

export function permissionCatalog() {
  return PERMISSIONS;
}

export { ROLE_IDS, ORG_ID, BRANCH_ID, DEPT_ID, DESIG_ID, LOCATION_ID, EMP_TYPE_FT };
