import type {
  BiometricEventStatus,
  BiometricSource,
  BiometricVendor,
  DeviceConnectionMode,
  DeviceStatus,
  DocumentType,
  EmployeeStatus,
  Gender,
  PermissionCode,
  PunchDirection,
  RoleCode,
  VerificationMode,
} from "@/lib/constants";

export type AccountStatus = "ACTIVE" | "DISABLED" | "PENDING";
export type OrgStatus = "PENDING_SETUP" | "ACTIVE" | "SUSPENDED";
export type MembershipStatus = "ACTIVE" | "DISABLED" | "INVITED";

export interface Organization {
  id: string;
  name: string;
  legal_name: string | null;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  pan: string | null;
  tan: string | null;
  gstin: string | null;
  industry: string | null;
  payroll_frequency: string;
  weekly_off: string;
  timezone: string;
  currency: string;
  setup_completed: boolean;
  setup_step: number;
  status: OrgStatus;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  phone: string | null;
  email: string | null;
  is_default: boolean;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  manager_employee_id: string | null;
  is_default: boolean;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface Designation {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  department_id: string | null;
  is_default: boolean;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  branch_id: string | null;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface EmploymentType {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  is_system: boolean;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  organization_id: string;
  employee_code: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  display_name: string;
  gender: Gender | null;
  date_of_birth: string | null;
  mobile: string | null;
  alternate_mobile: string | null;
  personal_email: string | null;
  photo_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  emergency_relationship: string | null;
  status: EmployeeStatus;
  user_id: string | null;
  is_demo: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAddress {
  id: string;
  organization_id: string;
  employee_id: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeEmployment {
  id: string;
  organization_id: string;
  employee_id: string;
  joining_date: string | null;
  employment_type_id: string | null;
  branch_id: string | null;
  department_id: string | null;
  designation_id: string | null;
  reporting_manager_id: string | null;
  location_id: string | null;
  official_email: string | null;
  work_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeStatutory {
  id: string;
  organization_id: string;
  employee_id: string;
  pan: string | null;
  aadhaar_last4: string | null;
  uan: string | null;
  esic_number: string | null;
  pf_applicable: boolean;
  esi_applicable: boolean;
  pt_applicable: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeBankAccount {
  id: string;
  organization_id: string;
  employee_id: string;
  account_holder_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc: string | null;
  branch_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDocument {
  id: string;
  organization_id: string;
  employee_id: string;
  document_type: DocumentType | string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  status: "ACTIVE" | "ARCHIVED";
  uploaded_by: string | null;
  uploaded_at: string;
  created_at: string;
}

export interface EmployeeHistory {
  id: string;
  organization_id: string;
  employee_id: string;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  effective_date: string | null;
  reason: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface EmployeeListItem {
  id: string;
  employeeCode: string;
  displayName: string;
  mobile: string | null;
  officialEmail: string | null;
  departmentName: string | null;
  designationName: string | null;
  branchName: string | null;
  joiningDate: string | null;
  employmentTypeName: string | null;
  managerName: string | null;
  status: EmployeeStatus;
}

export interface EmployeeRecord {
  employee: Employee;
  address: EmployeeAddress | null;
  employment: EmployeeEmployment | null;
  statutory: EmployeeStatutory | null;
  bank: EmployeeBankAccount | null;
  documents: EmployeeDocument[];
  history: EmployeeHistory[];
}

export interface Role {
  id: string;
  organization_id: string | null;
  code: RoleCode;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface Permission {
  id: string;
  code: PermissionCode;
  name: string;
  group_name: string;
}

export interface UserProfile {
  id: string;
  auth_user_id: string | null;
  username: string;
  display_name: string;
  mobile: string | null;
  photo_url: string | null;
  status: AccountStatus;
  is_demo: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUser {
  id: string;
  organization_id: string;
  user_id: string;
  role_id: string;
  branch_id: string | null;
  status: MembershipStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string | null;
  actor_user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SessionUser {
  id: string;
  authUserId: string | null;
  username: string;
  displayName: string;
  mobile: string | null;
  photoUrl: string | null;
  status: AccountStatus;
  roleCode: RoleCode;
  roleName: string;
  permissions: PermissionCode[];
  organization: Organization;
  branch: Branch | null;
  membershipStatus: MembershipStatus;
}

export interface ActionResult<T = undefined> {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: T;
}

export interface BiometricDevice {
  id: string;
  organization_id: string;
  name: string;
  vendor: BiometricVendor;
  serial_number: string;
  model: string | null;
  firmware: string | null;
  connection_mode: DeviceConnectionMode;
  branch_id: string | null;
  location_id: string | null;
  timezone: string;
  token_hash: string;
  token_hint: string;
  status: DeviceStatus;
  last_seen_at: string | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BiometricIdentityMap {
  id: string;
  organization_id: string;
  device_id: string;
  device_user_id: string;
  employee_id: string;
  status: "ACTIVE" | "DISABLED";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BiometricRawEvent {
  id: string;
  organization_id: string | null;
  device_id: string | null;
  vendor: BiometricVendor | string | null;
  source: BiometricSource;
  payload: Record<string, unknown>;
  payload_hash: string;
  received_at: string;
  ip_address: string | null;
  user_agent: string | null;
  status: BiometricEventStatus;
  error_message: string | null;
}

export interface BiometricNormalizedEvent {
  id: string;
  organization_id: string;
  device_id: string;
  raw_event_id: string;
  vendor: BiometricVendor | string;
  device_user_id: string;
  punched_at: string;
  punched_at_local: string | null;
  timezone: string;
  direction: PunchDirection;
  verification_mode: VerificationMode;
  work_code: string | null;
  payload_hash: string;
  status: BiometricEventStatus;
  created_at: string;
}

export interface AttendancePunch {
  id: string;
  organization_id: string;
  employee_id: string;
  device_id: string;
  normalized_event_id: string;
  punched_at: string;
  punched_at_local: string | null;
  timezone: string;
  direction: PunchDirection;
  verification_mode: VerificationMode;
  source: BiometricSource;
  created_at: string;
}

export interface BiometricDeviceListItem {
  id: string;
  name: string;
  vendor: BiometricVendor;
  serialNumber: string;
  model: string | null;
  connectionMode: DeviceConnectionMode;
  branchName: string | null;
  locationName: string | null;
  timezone: string;
  status: DeviceStatus;
  lastSeenAt: string | null;
  lastError: string | null;
  tokenHint: string;
}

export interface IdentityMapListItem {
  id: string;
  deviceId: string;
  deviceName: string;
  vendor: BiometricVendor;
  deviceUserId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  status: "ACTIVE" | "DISABLED";
  updatedAt: string;
}

export interface PunchListItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  deviceId: string;
  deviceName: string;
  punchedAt: string;
  punchedAtLocal: string | null;
  timezone: string;
  direction: PunchDirection;
  verificationMode: VerificationMode;
  source: BiometricSource;
}

export interface UnmappedEventListItem {
  id: string;
  deviceId: string;
  deviceName: string;
  vendor: BiometricVendor | string;
  deviceUserId: string;
  punchedAt: string;
  direction: PunchDirection;
  status: BiometricEventStatus;
}

export interface BiometricLogListItem {
  id: string;
  receivedAt: string;
  vendor: BiometricVendor | string | null;
  source: BiometricSource;
  status: BiometricEventStatus;
  deviceName: string | null;
  errorMessage: string | null;
}

export interface NormalizedPunchInput {
  vendor: BiometricVendor | string;
  deviceSerial: string | null;
  deviceUserId: string;
  punchedAt: Date;
  punchedAtLocal: string | null;
  timezone: string;
  direction: PunchDirection;
  verificationMode: VerificationMode;
  workCode: string | null;
}

export interface AdapterParseResult {
  ok: true;
  events: NormalizedPunchInput[];
}

export interface AdapterParseError {
  ok: false;
  error: string;
}

export type AdapterResult = AdapterParseResult | AdapterParseError;
