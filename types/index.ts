import type {
  AccrualFrequency,
  AccrualMethod,
  AttendanceDayStatus,
  BiometricEventStatus,
  BiometricSource,
  BiometricVendor,
  CompOffStatus,
  CompensationEntryStatus,
  DeviceConnectionMode,
  DeviceStatus,
  DocumentType,
  EmployeeStatus,
  Gender,
  HolidayType,
  LeaveDaySession,
  LeaveLedgerSource,
  LeaveRequestStatus,
  LeaveTypeStatus,
  PermissionCode,
  PolicyScope,
  PunchDirection,
  RoleCode,
  SalaryAssignmentStatus,
  SalaryCalculationMethod,
  SalaryChangeType,
  SalaryComponentCategory,
  SalaryComponentType,
  SalaryFrequency,
  SalaryRevisionStatus,
  VerificationMode,
  BenefitAssignmentStatus,
  BenefitCalculationMethod,
  BenefitCategory,
  BenefitFrequency,
  BenefitTaxTreatment,
  ClaimApprovalDecision,
  ClaimApprovalStep,
  ClaimCategory,
  ClaimPolicyCheckResult,
  ClaimStatus,
  ClaimWorkflowMode,
  CityCategory,
  TravelMode,
  TravelType,
  LoanAccountStatus,
  LoanAdjustmentKind,
  LoanApplicationStatus,
  LoanApprovalDecision,
  LoanApprovalStep,
  LoanCategory,
  LoanInstallmentStatus,
  LoanInterestMethod,
  LoanLedgerType,
  LoanPaymentMethod,
  LoanWorkflowMode,
  PayrollRunStatus,
  PayrollRunType,
  PayrollItemStatus,
  PayslipStatus,
  PayrollLineKind,
  StatutoryHead,
  ComplianceFilingStatus,
  PayrollExceptionCode,
  PayrollExceptionSeverity,
  PayrollExceptionStatus,
  PayrollApprovalAction,
  PayslipSection,
  StatutoryRuleVersionStatus,
  TaxRegime,
  TaxDeclarationStatus,
  TaxProofStatus,
  ExitType,
  ExitStatus,
  ClearanceDepartment,
  ClearanceTaskStatus,
  SettlementStatus,
  SettlementLineKind,
  SettlementLineDirection,
  SettlementApprovalStep,
  SettlementApprovalDecision,
  SettlementPaymentMethod,
  ContractorBusinessType,
  ContractorStatus,
  EngagementRateUnit,
  EngagementFrequency,
  EngagementStatus,
  ContractorInvoiceStatus,
  ContractorPaymentItemKind,
  EssChangeCategory,
  EssChangeRequestStatus,
  EssNotificationType,
  AccountingAccountType,
  PayrollMappingCategory,
  PayrollJournalStatus,
  PaymentMethod,
  PaymentBatchStatus,
  PaymentItemStatus,
  PaymentTransactionStatus,
  PaymentTransactionSource,
  ReconciliationStatus,
  AccountingExportKind,
  AutomationEventType,
  AutomationTriggerType,
  AutomationActionType,
  DomainEventStatus,
  JobType,
  JobExecutionStatus,
  DeliveryStatus,
  WebhookDeliveryStatus,
  ApiKeyStatus,
  ApiScope,
  WebhookEventType,
  AnalyticsAlertSeverity,
  AnalyticsAlertStatus,
  AnalyticsRuleCode,
  BiometricVerificationStatus,
  AiUsageStatus,
  BillingCycle,
  PlanStatus,
  SubscriptionStatus,
  BillingInvoiceStatus,
  BillingPaymentStatus,
  BillingLineType,
  BillingAdjustmentKind,
  SubscriptionEventType,
  EntitlementKey,
  UsageMetricKey,
  OnboardingStepKey,
  OnboardingStepStatus,
  OnboardingProgressStatus,
  ImportEntityType,
  ImportJobStatus,
  ImportRowStatus,
  SupportCategory,
  SupportPriority,
  SupportTicketStatus,
  SupportMessageVisibility,
  DataExportKind,
  DataExportStatus,
  OffboardingStatus,
  LaunchDecision,
  ModuleReadinessStatus,
  ReleaseBlockerSeverity,
  ReleaseBlockerStatus,
  PilotOrgKind,
  PilotOrgStatus,
  BiometricTestMethod,
  ParallelRunStatus,
  UatRole,
  UatResultStatus,
  IncidentSeverity,
  IncidentStatus,
  FeedbackKind,
  FeedbackStatus,
  ReleaseGateKey,
} from "@/lib/constants";

export type {
  AccrualFrequency,
  AccrualMethod,
  AttendanceDayStatus,
  CompOffStatus,
  CompensationEntryStatus,
  HolidayType,
  LeaveDaySession,
  LeaveLedgerSource,
  LeaveRequestStatus,
  LeaveTypeStatus,
  PolicyScope,
  SalaryAssignmentStatus,
  SalaryCalculationMethod,
  SalaryChangeType,
  SalaryComponentCategory,
  SalaryComponentType,
  SalaryFrequency,
  SalaryRevisionStatus,
  BenefitAssignmentStatus,
  BenefitCalculationMethod,
  BenefitCategory,
  BenefitFrequency,
  BenefitTaxTreatment,
  ClaimApprovalDecision,
  ClaimApprovalStep,
  ClaimCategory,
  ClaimPolicyCheckResult,
  ClaimStatus,
  ClaimWorkflowMode,
  CityCategory,
  TravelMode,
  TravelType,
  LoanAccountStatus,
  LoanAdjustmentKind,
  LoanApplicationStatus,
  LoanApprovalDecision,
  LoanApprovalStep,
  LoanCategory,
  LoanInstallmentStatus,
  LoanInterestMethod,
  LoanLedgerType,
  LoanPaymentMethod,
  LoanWorkflowMode,
  PayrollRunStatus,
  PayrollRunType,
  PayrollItemStatus,
  PayslipStatus,
  PayrollLineKind,
  StatutoryHead,
  ComplianceFilingStatus,
  PayrollExceptionCode,
  PayrollExceptionSeverity,
  PayrollExceptionStatus,
  PayrollApprovalAction,
  PayslipSection,
  StatutoryRuleVersionStatus,
  TaxRegime,
  TaxDeclarationStatus,
  TaxProofStatus,
  ExitType,
  ExitStatus,
  ClearanceDepartment,
  ClearanceTaskStatus,
  SettlementStatus,
  SettlementLineKind,
  SettlementLineDirection,
  SettlementApprovalStep,
  SettlementApprovalDecision,
  SettlementPaymentMethod,
  ContractorBusinessType,
  ContractorStatus,
  EngagementRateUnit,
  EngagementFrequency,
  EngagementStatus,
  ContractorInvoiceStatus,
  ContractorPaymentItemKind,
  EssChangeCategory,
  EssChangeRequestStatus,
  EssNotificationType,
  AccountingAccountType,
  PayrollMappingCategory,
  PayrollJournalStatus,
  PaymentMethod,
  PaymentBatchStatus,
  PaymentItemStatus,
  PaymentTransactionStatus,
  PaymentTransactionSource,
  ReconciliationStatus,
  AccountingExportKind,
  AutomationEventType,
  AutomationTriggerType,
  AutomationActionType,
  DomainEventStatus,
  JobType,
  JobExecutionStatus,
  DeliveryStatus,
  WebhookDeliveryStatus,
  ApiKeyStatus,
  ApiScope,
  WebhookEventType,
  AnalyticsAlertSeverity,
  AnalyticsAlertStatus,
  AnalyticsRuleCode,
  BiometricVerificationStatus,
  AiUsageStatus,
  BillingCycle,
  PlanStatus,
  SubscriptionStatus,
  BillingInvoiceStatus,
  BillingPaymentStatus,
  BillingLineType,
  BillingAdjustmentKind,
  SubscriptionEventType,
  EntitlementKey,
  UsageMetricKey,
  OnboardingStepKey,
  OnboardingStepStatus,
  OnboardingProgressStatus,
  ImportEntityType,
  ImportJobStatus,
  ImportRowStatus,
  SupportCategory,
  SupportPriority,
  SupportTicketStatus,
  SupportMessageVisibility,
  DataExportKind,
  DataExportStatus,
  OffboardingStatus,
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
  lwf_applicable: boolean;
  tds_applicable: boolean;
  tax_regime: TaxRegime;
  pf_number: string | null;
  pt_state_code: string | null;
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

export interface LeaveType {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  paid: boolean;
  requires_approval: boolean;
  requires_document: boolean;
  allow_half_day: boolean;
  allow_backdated: boolean;
  allow_future: boolean;
  carry_forward_allowed: boolean;
  max_carry_forward: number | null;
  encashment_allowed: boolean;
  negative_balance_allowed: boolean;
  is_comp_off: boolean;
  status: LeaveTypeStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeavePolicy {
  id: string;
  organization_id: string;
  name: string;
  leave_type_id: string;
  annual_allocation: number;
  accrual_method: AccrualMethod;
  accrual_frequency: AccrualFrequency;
  start_balance: number;
  carry_forward: boolean;
  carry_forward_limit: number | null;
  encashment: boolean;
  approval_required: boolean;
  count_weekly_off: boolean;
  count_holiday: boolean;
  version: number;
  effective_from: string;
  effective_to: string | null;
  status: "ACTIVE" | "DISABLED";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeavePolicyAssignment {
  id: string;
  organization_id: string;
  policy_id: string;
  scope: PolicyScope;
  branch_id: string | null;
  department_id: string | null;
  designation_id: string | null;
  employment_type_id: string | null;
  employee_id: string | null;
  created_at: string;
}

export interface LeaveBalance {
  id: string;
  organization_id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  opening: number;
  allocated: number;
  accrued: number;
  used: number;
  pending: number;
  carry_forward: number;
  adjusted: number;
  available: number;
  updated_at: string;
}

export interface LeaveBalanceTransaction {
  id: string;
  organization_id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  source: LeaveLedgerSource;
  quantity: number;
  balance_before: number;
  balance_after: number;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  organization_id: string;
  employee_id: string;
  leave_type_id: string;
  from_date: string;
  to_date: string;
  session: LeaveDaySession;
  days: number;
  reason: string | null;
  contact_during_leave: string | null;
  attachment_name: string | null;
  attachment_data: string | null;
  status: LeaveRequestStatus;
  submitted_at: string | null;
  decided_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequestDay {
  id: string;
  organization_id: string;
  request_id: string;
  employee_id: string;
  work_date: string;
  session: LeaveDaySession;
  units: number;
  counted: boolean;
  skip_reason: string | null;
}

export interface LeaveApproval {
  id: string;
  organization_id: string;
  request_id: string;
  actor_user_id: string | null;
  action: "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED" | "WITHDRAWN" | "CORRECTION";
  reason: string | null;
  created_at: string;
}

export interface Holiday {
  id: string;
  organization_id: string;
  name: string;
  holiday_date: string;
  holiday_type: HolidayType;
  branch_id: string | null;
  location_id: string | null;
  optional: boolean;
  status: "ACTIVE" | "DISABLED";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompOffEarning {
  id: string;
  organization_id: string;
  employee_id: string;
  work_date: string;
  source: "HOLIDAY" | "WEEKLY_OFF";
  units: number;
  status: CompOffStatus;
  notes: string | null;
  request_id: string | null;
  decided_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceDay {
  id: string;
  organization_id: string;
  employee_id: string;
  work_date: string;
  status: AttendanceDayStatus;
  session: LeaveDaySession;
  leave_request_id: string | null;
  source: string;
  previous_status: AttendanceDayStatus | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveDayPreview {
  date: string;
  session: LeaveDaySession;
  units: number;
  counted: boolean;
  skipReason: string | null;
  weekday: string;
}

export interface LeaveBalanceView {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  year: number;
  opening: number;
  allocated: number;
  accrued: number;
  used: number;
  pending: number;
  carryForward: number;
  adjusted: number;
  available: number;
}

export interface LeaveRequestListItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  paid: boolean;
  fromDate: string;
  toDate: string;
  session: LeaveDaySession;
  days: number;
  reason: string | null;
  status: LeaveRequestStatus;
  availableAfter: number | null;
  submittedAt: string | null;
}

export interface SalaryComponent {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  component_type: SalaryComponentType;
  category: SalaryComponentCategory;
  calculation_method: SalaryCalculationMethod;
  formula: string | null;
  base_component_id: string | null;
  fixed_amount: number | null;
  percentage: number | null;
  frequency: SalaryFrequency;
  taxable: boolean;
  include_in_ctc: boolean;
  include_in_gross: boolean;
  variable: boolean;
  sort_order: number;
  status: "ACTIVE" | "DISABLED";
  effective_from: string | null;
  effective_to: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryStructure {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
  ctc_amount: number | null;
  status: "ACTIVE" | "DISABLED";
  effective_from: string;
  effective_to: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryStructureItem {
  id: string;
  organization_id: string;
  structure_id: string;
  component_id: string;
  calculation_method: SalaryCalculationMethod;
  formula: string | null;
  base_component_id: string | null;
  fixed_amount: number | null;
  percentage: number | null;
  include_in_ctc: boolean;
  include_in_gross: boolean;
  sort_order: number;
  created_at: string;
}

export interface EmployeeSalaryAssignment {
  id: string;
  organization_id: string;
  employee_id: string;
  structure_id: string;
  ctc_amount: number;
  gross_amount: number;
  effective_from: string;
  effective_to: string | null;
  status: SalaryAssignmentStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryRevision {
  id: string;
  organization_id: string;
  employee_id: string;
  previous_assignment_id: string | null;
  previous_structure_id: string | null;
  new_structure_id: string;
  previous_ctc: number | null;
  new_ctc: number;
  effective_from: string;
  reason: SalaryChangeType;
  notes: string | null;
  status: SalaryRevisionStatus;
  decided_at: string | null;
  applied_at: string | null;
  created_by: string | null;
  decided_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryHistory {
  id: string;
  organization_id: string;
  employee_id: string;
  assignment_id: string | null;
  revision_id: string | null;
  change_type: SalaryChangeType;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  approved_by: string | null;
  effective_from: string;
  applied_at: string;
  created_by: string | null;
  created_at: string;
}

export interface VariableEarning {
  id: string;
  organization_id: string;
  employee_id: string;
  component_id: string;
  amount: number;
  quantity: number | null;
  rate: number | null;
  period_from: string;
  period_to: string;
  source: string;
  reference: string | null;
  notes: string | null;
  status: CompensationEntryStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReimbursementEntry {
  id: string;
  organization_id: string;
  employee_id: string;
  component_id: string;
  entry_date: string;
  amount: number;
  description: string | null;
  reference: string | null;
  include_in_payroll: boolean;
  status: CompensationEntryStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryLine {
  componentId: string;
  code: string;
  name: string;
  componentType: SalaryComponentType;
  category: SalaryComponentCategory;
  calculationMethod: SalaryCalculationMethod;
  formula: string | null;
  amount: number;
  includeInCtc: boolean;
  includeInGross: boolean;
  variable: boolean;
}

export interface EmployeeSalarySnapshot {
  employeeId: string;
  assignmentId: string;
  structureId: string;
  structureName: string;
  structureCode: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  ctc: number;
  gross: number;
  fixedEarnings: number;
  variableEarnings: number;
  deductions: number;
  reimbursements: number;
  employerBenefits: number;
  lines: SalaryLine[];
}

export interface AttendanceSalaryInputs {
  workingDays: number;
  presentDays: number;
  unpaidLeaveDays: number;
  paidLeaveDays: number;
  lateCount: number;
  otMinutes: number;
}

export interface BenefitType {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  category: BenefitCategory;
  calculation_method: BenefitCalculationMethod;
  fixed_amount: number | null;
  percentage: number | null;
  frequency: BenefitFrequency;
  eligibility: string | null;
  tax_treatment: BenefitTaxTreatment;
  include_in_ctc: boolean;
  include_in_gross: boolean;
  effective_from: string | null;
  effective_to: string | null;
  status: "ACTIVE" | "DISABLED";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BenefitPolicy {
  id: string;
  organization_id: string;
  name: string;
  benefit_type_id: string;
  max_amount: number | null;
  scope: PolicyScope;
  branch_id: string | null;
  department_id: string | null;
  designation_id: string | null;
  employment_type_id: string | null;
  employee_id: string | null;
  require_assignment: boolean;
  effective_from: string;
  effective_to: string | null;
  status: "ACTIVE" | "DISABLED";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeBenefit {
  id: string;
  organization_id: string;
  employee_id: string;
  benefit_type_id: string;
  amount: number;
  calculation_method: BenefitCalculationMethod;
  percentage: number | null;
  effective_from: string;
  effective_to: string | null;
  status: BenefitAssignmentStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimType {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  category: ClaimCategory;
  requires_receipt: boolean;
  requires_travel_fields: boolean;
  max_amount: number | null;
  workflow_mode: ClaimWorkflowMode;
  include_in_payroll_default: boolean;
  status: "ACTIVE" | "DISABLED";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimPolicy {
  id: string;
  organization_id: string;
  name: string;
  claim_type_id: string | null;
  employee_category: string | null;
  designation_id: string | null;
  city_category: CityCategory | null;
  travel_type: TravelType | null;
  da_per_day: number | null;
  mileage_rate: number | null;
  local_conveyance_limit: number | null;
  hotel_limit: number | null;
  meal_limit: number | null;
  max_amount: number | null;
  max_days: number | null;
  require_receipt: boolean;
  workflow_mode: ClaimWorkflowMode;
  effective_from: string;
  effective_to: string | null;
  status: "ACTIVE" | "DISABLED";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Claim {
  id: string;
  organization_id: string;
  employee_id: string;
  claim_type_id: string;
  claim_date: string;
  period_from: string | null;
  period_to: string | null;
  purpose: string | null;
  submitted_amount: number;
  calculated_amount: number | null;
  approved_amount: number | null;
  override_reason: string | null;
  notes: string | null;
  reference_number: string | null;
  status: ClaimStatus;
  policy_id: string | null;
  distance: number | null;
  rate_per_km: number | null;
  travel_mode: TravelMode | null;
  travel_days: number | null;
  city_category: CityCategory | null;
  travel_type: TravelType | null;
  include_in_payroll: boolean;
  payroll_period: string | null;
  paid_at: string | null;
  current_step: ClaimApprovalStep | null;
  submitted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimItem {
  id: string;
  organization_id: string;
  claim_id: string;
  description: string;
  quantity: number | null;
  rate: number | null;
  amount: number;
  item_date: string | null;
  created_at: string;
}

export interface ClaimApproval {
  id: string;
  organization_id: string;
  claim_id: string;
  step: ClaimApprovalStep;
  decision: ClaimApprovalDecision;
  amount: number | null;
  reason: string | null;
  actor_id: string | null;
  decided_at: string;
  created_at: string;
}

export interface ClaimPolicyCheck {
  id: string;
  organization_id: string;
  claim_id: string;
  check_code: string;
  result: ClaimPolicyCheckResult;
  message: string;
  created_at: string;
}

export interface ClaimAttachment {
  id: string;
  organization_id: string;
  claim_id: string;
  employee_id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ClaimListItem {
  claim: Claim;
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
  branchName: string | null;
  claimTypeName: string;
  claimTypeCode: string;
  category: ClaimCategory;
  policyName: string | null;
  policyLimit: number | null;
  receiptCount: number;
}

export interface PayrollClaimLine {
  claimId: string;
  employeeId: string;
  claimTypeId: string;
  category: ClaimCategory;
  source: "REIMBURSEMENT" | "TA" | "DA" | "BENEFIT";
  amount: number;
  includeInPayroll: boolean;
  payrollPeriod: string | null;
  status: ClaimStatus;
}

export interface LoanType {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  category: LoanCategory;
  description: string | null;
  max_amount: number | null;
  max_tenure_months: number | null;
  interest_method: LoanInterestMethod;
  interest_rate: number | null;
  processing_fee: number | null;
  eligibility: string | null;
  allow_multiple_active: boolean;
  auto_deduct_payroll: boolean;
  workflow_mode: LoanWorkflowMode;
  status: "ACTIVE" | "DISABLED";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanPolicy {
  id: string;
  organization_id: string;
  name: string;
  loan_type_id: string;
  max_amount: number | null;
  max_tenure_months: number | null;
  max_active_loans: number | null;
  min_service_months: number | null;
  scope: PolicyScope;
  branch_id: string | null;
  department_id: string | null;
  designation_id: string | null;
  employment_type_id: string | null;
  employee_id: string | null;
  effective_from: string;
  effective_to: string | null;
  status: "ACTIVE" | "DISABLED";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanApplication {
  id: string;
  organization_id: string;
  employee_id: string;
  loan_type_id: string;
  policy_id: string | null;
  requested_amount: number;
  tenure_months: number;
  interest_method: LoanInterestMethod;
  interest_rate: number | null;
  processing_fee: number | null;
  purpose: string | null;
  requested_date: string;
  notes: string | null;
  principal: number;
  interest_amount: number;
  total_repayment: number;
  emi_amount: number;
  first_due_date: string | null;
  last_due_date: string | null;
  approved_amount: number | null;
  approved_tenure_months: number | null;
  status: LoanApplicationStatus;
  current_step: LoanApprovalStep | null;
  auto_deduct_payroll: boolean;
  reference_number: string | null;
  submitted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanAccount {
  id: string;
  organization_id: string;
  application_id: string;
  employee_id: string;
  loan_type_id: string;
  approved_amount: number;
  disbursed_amount: number;
  interest_amount: number;
  outstanding_principal: number;
  outstanding_interest: number;
  emi_amount: number;
  tenure_months: number;
  paid_installments: number;
  remaining_installments: number;
  start_date: string;
  end_date: string | null;
  next_due_date: string | null;
  auto_deduct_payroll: boolean;
  status: LoanAccountStatus;
  disbursed_at: string | null;
  disbursed_by: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanScheduleItem {
  id: string;
  organization_id: string;
  account_id: string;
  installment_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  emi_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: LoanInstallmentStatus;
  paid_at: string | null;
  payroll_period: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanRepayment {
  id: string;
  organization_id: string;
  account_id: string;
  schedule_id: string | null;
  payment_date: string;
  amount: number;
  principal_amount: number;
  interest_amount: number;
  payment_method: LoanPaymentMethod;
  reference: string | null;
  notes: string | null;
  source: "MANUAL" | "PAYROLL";
  created_by: string | null;
  created_at: string;
}

export interface LoanAdjustment {
  id: string;
  organization_id: string;
  account_id: string;
  schedule_id: string | null;
  kind: LoanAdjustmentKind;
  amount: number | null;
  reason: string;
  actor_id: string | null;
  created_at: string;
}

export interface LoanApproval {
  id: string;
  organization_id: string;
  application_id: string;
  step: LoanApprovalStep;
  decision: LoanApprovalDecision;
  amount: number | null;
  tenure_months: number | null;
  reason: string | null;
  actor_id: string | null;
  decided_at: string;
  created_at: string;
}

export interface LoanLedgerEntry {
  id: string;
  organization_id: string;
  account_id: string;
  entry_type: LoanLedgerType;
  before_principal: number;
  before_interest: number;
  amount: number;
  after_principal: number;
  after_interest: number;
  source: string;
  reference_id: string | null;
  notes: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface LoanListItem {
  application: LoanApplication;
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
  branchName: string | null;
  loanTypeName: string;
  loanTypeCode: string;
  category: LoanCategory;
}

export interface LoanAccountListItem {
  account: LoanAccount;
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
  branchName: string | null;
  loanTypeName: string;
  loanTypeCode: string;
  category: LoanCategory;
  overdueCount: number;
}

export interface PayrollLoanDeduction {
  loanId: string;
  employeeId: string;
  loanTypeId: string;
  installmentId: string;
  installmentNumber: number;
  emiDue: number;
  advanceRecovery: number;
  outstandingBalance: number;
  autoDeduct: boolean;
  payrollPeriod: string;
}

export interface StatutoryRule {
  id: string;
  organization_id: string;
  head: StatutoryHead;
  name: string;
  employee_rate: number;
  employer_rate: number;
  wage_ceiling: number | null;
  min_wage: number | null;
  max_wage: number | null;
  fixed_amount: number | null;
  slab_json: string | null;
  state_code: string | null;
  effective_from: string;
  effective_to: string | null;
  status: "ACTIVE" | "DISABLED";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollRun {
  id: string;
  organization_id: string;
  period: string;
  period_from: string;
  period_to: string;
  pay_date: string | null;
  status: PayrollRunStatus;
  run_type: PayrollRunType;
  employee_count: number;
  included_count: number;
  hold_count: number;
  error_count: number;
  warning_count: number;
  total_gross: number;
  total_earnings: number;
  total_deductions: number;
  total_statutory: number;
  total_reimbursements: number;
  total_claims: number;
  total_loans: number;
  total_net: number;
  employer_contributions: number;
  notes: string | null;
  snapshot_id: string | null;
  calculated_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  finalized_at: string | null;
  locked_at: string | null;
  processed_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollItem {
  id: string;
  organization_id: string;
  run_id: string;
  employee_id: string;
  assignment_id: string | null;
  structure_id: string | null;
  status: PayrollItemStatus;
  hold_reason: string | null;
  error_message: string | null;
  working_days: number;
  present_days: number;
  paid_days: number;
  lop_days: number;
  paid_leave_days: number;
  ctc: number;
  monthly_gross: number;
  earnings: number;
  variable_earnings: number;
  reimbursements: number;
  claims: number;
  deductions: number;
  loan_deductions: number;
  pf_employee: number;
  pf_employer: number;
  esi_employee: number;
  esi_employer: number;
  pt_amount: number;
  tds_amount: number;
  lwf_employee: number;
  lwf_employer: number;
  statutory_total: number;
  net_pay: number;
  employer_cost: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollLine {
  id: string;
  organization_id: string;
  run_id: string;
  item_id: string;
  employee_id: string;
  kind: PayrollLineKind;
  code: string;
  name: string;
  amount: number;
  taxable: boolean;
  reference_id: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export interface Payslip {
  id: string;
  organization_id: string;
  run_id: string;
  item_id: string;
  employee_id: string;
  period: string;
  status: PayslipStatus;
  payslip_number: string | null;
  document_path: string | null;
  snapshot_id: string | null;
  generated_at: string | null;
  generated_by: string | null;
  regenerated_at: string | null;
  issued_at: string | null;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollException {
  id: string;
  organization_id: string;
  run_id: string;
  item_id: string | null;
  employee_id: string | null;
  code: PayrollExceptionCode;
  severity: PayrollExceptionSeverity;
  status: PayrollExceptionStatus;
  message: string;
  source_type: string | null;
  source_id: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  acknowledge_note: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollApprovalHistory {
  id: string;
  organization_id: string;
  run_id: string;
  action: PayrollApprovalAction;
  previous_status: PayrollRunStatus;
  new_status: PayrollRunStatus;
  actor_id: string | null;
  actor_role: string | null;
  reason: string | null;
  created_at: string;
}

export interface PayrollSnapshot {
  id: string;
  organization_id: string;
  run_id: string;
  period: string;
  payload_json: string;
  created_by: string | null;
  created_at: string;
}

export interface PayrollFinalizationLog {
  id: string;
  organization_id: string;
  run_id: string;
  snapshot_id: string | null;
  validation_json: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface PayrollAdjustment {
  id: string;
  organization_id: string;
  run_id: string;
  item_id: string | null;
  employee_id: string;
  kind: "EARNING" | "DEDUCTION";
  code: string;
  name: string;
  amount: number;
  reason: string;
  status: "DRAFT" | "POSTED" | "REVERSED";
  posted_line_id: string | null;
  created_by: string | null;
  posted_at: string | null;
  reversed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayslipLineItem {
  id: string;
  organization_id: string;
  payslip_id: string;
  kind: string;
  code: string;
  name: string;
  amount: number;
  section: PayslipSection | string;
  sort_order: number;
  created_at: string;
}

export interface PayslipSequence {
  organization_id: string;
  fiscal_year: string;
  month_code: string;
  last_value: number;
  updated_at: string;
}

export interface ComplianceFiling {
  id: string;
  organization_id: string;
  run_id: string;
  head: StatutoryHead;
  period: string;
  employee_count: number;
  employee_amount: number;
  employer_amount: number;
  total_amount: number;
  status: ComplianceFilingStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollItemListItem {
  item: PayrollItem;
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
  branchName: string | null;
}

export interface PayslipView {
  payslip: Payslip;
  run: PayrollRun;
  item: PayrollItem;
  lines: PayrollLine[];
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
  designationName: string | null;
  branchName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  pan: string | null;
  uan: string | null;
  organizationName: string;
}

export interface PayrollAttendanceSummary {
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  holidayDays: number;
  weeklyOffDays: number;
  paidDays: number;
  lopDays: number;
}

export interface StatutoryBreakdown {
  pfWage: number;
  pfEmployee: number;
  pfEmployer: number;
  pfEps: number;
  pfEpf: number;
  esiWage: number;
  esiEmployee: number;
  esiEmployer: number;
  ptAmount: number;
  ptStateCode: string | null;
  lwfEmployee: number;
  lwfEmployer: number;
  tdsAmount: number;
  tdsRegime: TaxRegime | null;
  taxableIncome: number;
  employeeTotal: number;
  employerTotal: number;
  ruleVersions: Array<{ head: StatutoryHead; versionId: string; versionCode: string; verified: boolean }>;
  warnings: string[];
}

export interface StatutoryRuleVersion {
  id: string;
  organization_id: string;
  head: StatutoryHead;
  version_code: string;
  name: string;
  jurisdiction: string;
  state_code: string | null;
  tax_year: string | null;
  regime: TaxRegime | string | null;
  effective_from: string;
  effective_to: string | null;
  status: StatutoryRuleVersionStatus;
  verified: boolean;
  source_name: string | null;
  source_url: string | null;
  source_citation: string | null;
  config_json: string;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgStatutorySettings {
  organization_id: string;
  pf_enabled: boolean;
  esi_enabled: boolean;
  pt_enabled: boolean;
  lwf_enabled: boolean;
  tds_enabled: boolean;
  pf_restrict_to_ceiling: boolean;
  default_state_code: string | null;
  tds_default_regime: TaxRegime;
  show_employer_on_payslip: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeTaxDeclaration {
  id: string;
  organization_id: string;
  employee_id: string;
  tax_year: string;
  regime: TaxRegime;
  status: TaxDeclarationStatus;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeTaxDeclarationItem {
  id: string;
  organization_id: string;
  declaration_id: string;
  section_code: string;
  name: string;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeTaxProof {
  id: string;
  organization_id: string;
  declaration_id: string;
  item_id: string | null;
  employee_id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  status: TaxProofStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollStatutoryResult {
  id: string;
  organization_id: string;
  run_id: string;
  item_id: string;
  employee_id: string;
  period: string;
  rule_versions_json: string;
  pf_wage: number;
  pf_employee: number;
  pf_employer: number;
  pf_eps: number;
  pf_epf: number;
  esi_wage: number;
  esi_employee: number;
  esi_employer: number;
  pt_amount: number;
  pt_state_code: string | null;
  lwf_employee: number;
  lwf_employer: number;
  tds_amount: number;
  tds_regime: string | null;
  taxable_income: number;
  employee_total: number;
  employer_total: number;
  notes_json: string | null;
  created_at: string;
}

export interface PayrollStatutoryLine {
  id: string;
  organization_id: string;
  result_id: string;
  run_id: string;
  employee_id: string;
  head: StatutoryHead;
  party: "EMPLOYEE" | "EMPLOYER";
  code: string;
  name: string;
  amount: number;
  wage_base: number;
  rate: number | null;
  rule_version_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface ExitClearanceItem {
  id: string;
  organization_id: string;
  department: ClearanceDepartment;
  code: string;
  name: string;
  description: string | null;
  required: boolean;
  default_due_days: number;
  sort_order: number;
  status: "ACTIVE" | "DISABLED";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeExit {
  id: string;
  organization_id: string;
  employee_id: string;
  reference_number: string | null;
  exit_type: ExitType;
  notice_date: string;
  last_working_date: string;
  notice_period_days: number;
  notice_served_days: number;
  reason: string | null;
  remarks: string | null;
  attachment_name: string | null;
  approver_id: string | null;
  status: ExitStatus;
  submitted_at: string | null;
  approved_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExitClearanceTask {
  id: string;
  organization_id: string;
  exit_id: string;
  item_id: string | null;
  department: ClearanceDepartment;
  name: string;
  required: boolean;
  owner_id: string | null;
  due_date: string | null;
  status: ClearanceTaskStatus;
  remarks: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinalSettlement {
  id: string;
  organization_id: string;
  exit_id: string;
  employee_id: string;
  reference_number: string | null;
  period: string;
  period_from: string;
  period_to: string;
  last_working_date: string;
  working_days: number;
  paid_days: number;
  lop_days: number;
  earnings_total: number;
  reimbursement_total: number;
  encashment_total: number;
  recovery_total: number;
  deduction_total: number;
  statutory_employee_total: number;
  statutory_employer_total: number;
  adjustment_total: number;
  gross_payable: number;
  net_payable: number;
  paid_amount: number;
  status: SettlementStatus;
  exceptions_json: string | null;
  snapshot_json: string | null;
  document_path: string | null;
  calculated_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  finalized_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementLineItem {
  id: string;
  organization_id: string;
  settlement_id: string;
  kind: SettlementLineKind;
  direction: SettlementLineDirection;
  code: string;
  name: string;
  amount: number;
  source_type: string | null;
  source_id: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export interface SettlementApproval {
  id: string;
  organization_id: string;
  settlement_id: string;
  step: SettlementApprovalStep;
  decision: SettlementApprovalDecision;
  reason: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface SettlementPayment {
  id: string;
  organization_id: string;
  settlement_id: string;
  amount: number;
  payment_date: string;
  method: SettlementPaymentMethod;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Contractor {
  id: string;
  organization_id: string;
  contractor_code: string;
  legal_name: string;
  display_name: string;
  business_type: ContractorBusinessType;
  pan: string | null;
  gstin: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc: string | null;
  reporting_manager_id: string | null;
  status: ContractorStatus;
  notes: string | null;
  document_name: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractorEngagement {
  id: string;
  organization_id: string;
  contractor_id: string;
  reference_number: string | null;
  scope: string;
  start_date: string;
  end_date: string | null;
  fee_amount: number;
  rate_unit: EngagementRateUnit;
  payment_frequency: EngagementFrequency;
  invoice_terms: string | null;
  approver_id: string | null;
  status: EngagementStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractorInvoice {
  id: string;
  organization_id: string;
  contractor_id: string;
  engagement_id: string | null;
  invoice_number: string;
  invoice_date: string;
  service_from: string;
  service_to: string;
  due_date: string | null;
  gross_amount: number;
  adjustment_amount: number;
  withholding_amount: number;
  net_payable: number;
  withholding_basis: number;
  withholding_section: string | null;
  rule_version_id: string | null;
  rule_version_code: string | null;
  duplicate_override_reason: string | null;
  attachment_name: string | null;
  status: ContractorInvoiceStatus;
  reject_reason: string | null;
  paid_amount: number;
  submitted_at: string | null;
  approved_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractorPaymentItem {
  id: string;
  organization_id: string;
  invoice_id: string;
  kind: ContractorPaymentItemKind;
  name: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

export interface ContractorPaymentRecord {
  id: string;
  organization_id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  method: SettlementPaymentMethod;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ExitListItem {
  exit: EmployeeExit;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  pendingRequired: number;
  blockedRequired: number;
}

export interface SettlementListItem {
  settlement: FinalSettlement;
  employeeName: string;
  employeeCode: string;
  exitType: ExitType;
  lastWorkingDate: string;
}

export interface ContractorListItem {
  contractor: Contractor;
  managerName: string;
  activeEngagements: number;
}

export interface EngagementListItem {
  engagement: ContractorEngagement;
  contractorName: string;
  contractorCode: string;
  daysToExpiry: number | null;
}

export interface InvoiceListItem {
  invoice: ContractorInvoice;
  contractorName: string;
  contractorCode: string;
  engagementScope: string;
}

export interface EssNotification {
  id: string;
  organization_id: string;
  user_id: string;
  type: EssNotificationType;
  title: string;
  body: string | null;
  href: string | null;
  entity_type: string | null;
  entity_id: string | null;
  event_type?: string | null;
  delivery_status?: string | null;
  read_at: string | null;
  created_at: string;
}

export interface EssChangeRequest {
  id: string;
  organization_id: string;
  employee_id: string;
  requested_by: string;
  category: EssChangeCategory;
  field_key: string;
  current_value: string | null;
  requested_value: string;
  reason: string | null;
  status: EssChangeRequestStatus;
  reviewer_id: string | null;
  review_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EssChangeRequestListItem {
  request: EssChangeRequest;
  employeeName: string;
  employeeCode: string;
  requestedByName: string;
  reviewerName: string | null;
}

export interface AccountingAccount {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  account_type: AccountingAccountType;
  description: string | null;
  status: "ACTIVE" | "DISABLED";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollAccountMapping {
  id: string;
  organization_id: string;
  category: PayrollMappingCategory;
  component_code: string | null;
  ledger_account_id: string;
  treatment: "DEBIT" | "CREDIT";
  branch_id: string | null;
  department_id: string | null;
  effective_from: string;
  effective_to: string | null;
  active: boolean;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollJournal {
  id: string;
  organization_id: string;
  run_id: string;
  period: string;
  journal_date: string;
  reference_number: string;
  status: PayrollJournalStatus;
  total_debit: number;
  total_credit: number;
  balanced: boolean;
  validation_json: string | null;
  export_count: number;
  created_by: string | null;
  validated_at: string | null;
  exported_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollJournalLine {
  id: string;
  organization_id: string;
  journal_id: string;
  employee_id: string | null;
  account_id: string | null;
  account_code: string;
  account_name: string;
  branch_id: string | null;
  department_id: string | null;
  description: string;
  debit: number;
  credit: number;
  source_kind: string;
  source_code: string | null;
  sort_order: number;
  created_at: string;
}

export interface AccountingExport {
  id: string;
  organization_id: string;
  kind: AccountingExportKind;
  journal_id: string | null;
  format: "CSV";
  reference: string | null;
  row_count: number;
  duplicate_of: string | null;
  storage_path: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PaymentSettings {
  organization_id: string;
  default_method: PaymentMethod;
  bank_account_reference: string | null;
  file_prefix: string;
  delimiter: string;
  include_header: boolean;
  columns_json: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentBatch {
  id: string;
  organization_id: string;
  run_id: string;
  period: string;
  payment_date: string;
  payment_method: PaymentMethod;
  bank_account_reference: string | null;
  total_employees: number;
  total_amount: number;
  status: PaymentBatchStatus;
  validation_json: string | null;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  exported_at: string | null;
  export_count: number;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentBatchItem {
  id: string;
  organization_id: string;
  batch_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  bank_account_id: string | null;
  account_number_last4: string | null;
  ifsc: string | null;
  amount: number;
  status: PaymentItemStatus;
  exclusion_reason: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  organization_id: string;
  batch_id: string;
  item_id: string;
  employee_id: string;
  amount: number;
  payment_date: string;
  reference: string | null;
  bank_reference: string | null;
  status: PaymentTransactionStatus;
  failure_reason: string | null;
  notes: string | null;
  source: PaymentTransactionSource;
  created_by: string | null;
  created_at: string;
}

export interface PaymentReconciliation {
  id: string;
  organization_id: string;
  batch_id: string;
  file_name: string | null;
  status: ReconciliationStatus;
  matched_count: number;
  unmatched_count: number;
  duplicate_count: number;
  mismatch_count: number;
  summary_json: string | null;
  created_by: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface ReportExportJob {
  id: string;
  organization_id: string;
  report_key: string;
  format: "CSV";
  filters_json: string | null;
  row_count: number;
  status: "COMPLETED" | "FAILED";
  created_by: string | null;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  organization_id: string;
  user_id: string;
  event_type: string;
  in_app: boolean;
  email: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  organization_id: string;
  key: string;
  name: string;
  event_type: string;
  channel: "EMAIL" | "IN_APP";
  language: string;
  subject: string;
  body_text: string;
  body_html: string | null;
  variables_json: string;
  status: "ACTIVE" | "DISABLED";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationDelivery {
  id: string;
  organization_id: string;
  notification_id: string | null;
  template_id: string | null;
  user_id: string;
  channel: "IN_APP" | "EMAIL";
  event_type: string;
  to_address: string | null;
  subject: string | null;
  status: DeliveryStatus;
  attempt_count: number;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  provider: string | null;
  error_message: string | null;
  event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DomainEvent {
  id: string;
  organization_id: string;
  event_type: AutomationEventType | string;
  version: number;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  idempotency_key: string | null;
  payload_json: string;
  status: DomainEventStatus;
  attempt_count: number;
  available_at: string;
  processed_at: string | null;
  locked_at: string | null;
  locked_by: string | null;
  error_message: string | null;
  created_at: string;
}

export interface AutomationRule {
  id: string;
  organization_id: string;
  name: string;
  trigger_type: AutomationTriggerType | string;
  conditions_json: string;
  actions_json: string;
  enabled: boolean;
  stop_on_match: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRuleRun {
  id: string;
  organization_id: string;
  rule_id: string;
  event_id: string;
  status: "APPLIED" | "SKIPPED" | "FAILED";
  result_json: string | null;
  created_at: string;
}

export interface AutomationTask {
  id: string;
  organization_id: string;
  title: string;
  body: string | null;
  href: string | null;
  assignee_user_id: string | null;
  event_type: string | null;
  entity_type: string | null;
  entity_id: string | null;
  status: "OPEN" | "DONE" | "CANCELLED";
  due_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledJob {
  id: string;
  organization_id: string;
  job_type: JobType | string;
  name: string;
  cron_expr: string | null;
  timezone: string;
  payload_json: string;
  enabled: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobExecution {
  id: string;
  organization_id: string;
  job_id: string;
  status: JobExecutionStatus;
  attempt_count: number;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  locked_at: string | null;
  locked_by: string | null;
  result_json: string | null;
  error_message: string | null;
  created_at: string;
}

export interface WebhookEndpoint {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  secret_hash: string;
  secret_hint: string;
  secret_encrypted?: string | null;
  status: "ACTIVE" | "DISABLED";
  event_types_json: string;
  created_by: string | null;
  rotated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDeliveryAttempt {
  id: string;
  organization_id: string;
  endpoint_id: string;
  event_id: string;
  status: WebhookDeliveryStatus;
  attempt_count: number;
  http_status: number | null;
  response_excerpt: string | null;
  error_message: string | null;
  signature_timestamp: string | null;
  next_attempt_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  scopes_json: string;
  status: ApiKeyStatus;
  expires_at: string | null;
  last_used_at: string | null;
  rate_limit_per_minute: number;
  created_by: string | null;
  revoked_by: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiRequestLog {
  id: string;
  organization_id: string | null;
  api_key_id: string | null;
  request_id: string;
  method: string;
  path: string;
  status_code: number;
  ip_address: string | null;
  user_agent: string | null;
  error_code: string | null;
  created_at: string;
}

export interface AnalyticsSavedView {
  id: string;
  organization_id: string;
  name: string;
  page: string;
  filters_json: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsThreshold {
  id: string;
  organization_id: string;
  rule_code: AnalyticsRuleCode | string;
  threshold_value: number;
  enabled: boolean;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsAlert {
  id: string;
  organization_id: string;
  rule_code: AnalyticsRuleCode | string;
  period: string | null;
  employee_id: string | null;
  run_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  title: string;
  condition_text: string;
  actual_value: string;
  baseline_value: string | null;
  threshold_value: string | null;
  severity: AnalyticsAlertSeverity;
  explanation: string;
  recommended_action: string;
  status: AnalyticsAlertStatus;
  assigned_to: string | null;
  notes: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsAlertHistory {
  id: string;
  organization_id: string;
  alert_id: string;
  previous_status: string | null;
  new_status: string;
  note: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface AnalyticsRefreshJob {
  id: string;
  organization_id: string;
  job_type: string;
  period: string | null;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  result_json: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface BiometricCompatibilityEntry {
  id: string;
  organization_id: string | null;
  vendor: string;
  model: string | null;
  integration_method: string;
  capabilities_json: string;
  documentation_url: string | null;
  verification_status: BiometricVerificationStatus;
  known_limitations: string | null;
  adapter_key: string;
  created_at: string;
  updated_at: string;
}

export interface AiUsageLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  question_excerpt: string;
  tools_used_json: string;
  status: AiUsageStatus;
  error_message: string | null;
  created_at: string;
}

export interface AnalyticsKpi {
  key: string;
  label: string;
  value: number;
  display: string;
  unit: "currency" | "count" | "percent" | "days";
  source: string;
  draft: boolean;
  note?: string;
}

export interface AnalyticsSeriesPoint {
  period: string;
  label: string;
  value: number;
  draft: boolean;
}

export interface PayrollVarianceRow {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
  currentNet: number;
  previousNet: number | null;
  delta: number | null;
  deltaPercent: number | null;
  currentGross: number;
  previousGross: number | null;
  currentLop: number;
  previousLop: number | null;
  currentStatus: string;
  previousStatus: string | null;
  draft: boolean;
}

export interface AnalyticsAssistantAnswer {
  status: AiUsageStatus;
  answer: string;
  sources: string[];
  toolsUsed: string[];
}

export interface PlanEntitlements {
  employeeLimit: number | null;
  branchLimit: number | null;
  biometricDeviceLimit: number | null;
  modules: string[];
  apiAccess: boolean;
  advancedAnalytics: boolean;
  reportsExport: boolean;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  billing_cycle_default: BillingCycle;
  monthly_price: number;
  annual_price: number;
  currency: string;
  trial_days: number;
  employee_limit: number | null;
  branch_limit: number | null;
  biometric_device_limit: number | null;
  modules_json: string;
  entitlements_json: string;
  status: PlanStatus;
  effective_from: string | null;
  effective_to: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanEntitlementRow {
  id: string;
  plan_id: string;
  entitlement_key: EntitlementKey | string;
  limit_value: number | null;
  enabled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanPriceHistory {
  id: string;
  plan_id: string;
  monthly_price: number;
  annual_price: number;
  currency: string;
  employee_limit: number | null;
  branch_limit: number | null;
  biometric_device_limit: number | null;
  entitlements_json: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface OrganizationSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  plan_code: string;
  plan_name: string;
  billing_cycle: BillingCycle;
  status: SubscriptionStatus;
  unit_price: number;
  currency: string;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string;
  renews_at: string | null;
  cancelled_at: string | null;
  cancel_at_period_end: boolean;
  grace_ends_at: string | null;
  plan_snapshot_json: string;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionHistory {
  id: string;
  organization_id: string;
  subscription_id: string;
  event_type: SubscriptionEventType | string;
  from_status: string | null;
  to_status: string | null;
  from_plan_code: string | null;
  to_plan_code: string | null;
  actor_user_id: string | null;
  reason: string | null;
  metadata_json: string;
  created_at: string;
}

export interface SubscriptionUsage {
  id: string;
  organization_id: string;
  subscription_id: string | null;
  metric_key: UsageMetricKey | string;
  quantity: number;
  limit_value: number | null;
  remaining: number | null;
  measured_at: string;
  source: string;
}

export interface BillingProfile {
  organization_id: string;
  legal_name: string | null;
  billing_email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  country: string;
  gstin: string | null;
  pan: string | null;
  tax_id: string | null;
  tax_label: string | null;
  tax_rate: number | null;
  currency: string;
  invoice_notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformBillingSettings {
  id: boolean;
  legal_name: string | null;
  billing_email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  country: string;
  gstin: string | null;
  pan: string | null;
  tax_label: string | null;
  tax_rate: number | null;
  currency: string;
  invoice_prefix: string;
  tax_configured: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingInvoice {
  id: string;
  organization_id: string;
  subscription_id: string | null;
  invoice_number: string;
  status: BillingInvoiceStatus;
  billing_cycle: BillingCycle;
  period_start: string;
  period_end: string;
  plan_id: string | null;
  plan_code: string;
  plan_name: string;
  currency: string;
  subtotal: number;
  discount_amount: number;
  tax_label: string | null;
  tax_rate: number | null;
  tax_amount: number;
  total: number;
  amount_paid: number;
  outstanding: number;
  due_date: string | null;
  issued_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  seller_snapshot_json: string;
  customer_snapshot_json: string;
  tax_configured: boolean;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingInvoiceLine {
  id: string;
  invoice_id: string;
  organization_id: string;
  line_type: BillingLineType;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  sort_order: number;
  created_at: string;
}

export interface BillingPayment {
  id: string;
  organization_id: string;
  invoice_id: string | null;
  subscription_id: string | null;
  provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  amount: number;
  currency: string;
  status: BillingPaymentStatus;
  failure_reason: string | null;
  verified: boolean;
  verified_at: string | null;
  refunded_at: string | null;
  idempotency_key: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentWebhookEvent {
  id: string;
  provider: string;
  provider_event_id: string;
  event_type: string | null;
  organization_id: string | null;
  payment_id: string | null;
  signature_valid: boolean;
  processed: boolean;
  processed_at: string | null;
  error_message: string | null;
  payload_json: string;
  created_at: string;
}

export interface BillingAdjustment {
  id: string;
  organization_id: string;
  subscription_id: string | null;
  invoice_id: string | null;
  kind: BillingAdjustmentKind;
  amount: number;
  reason: string;
  created_by: string | null;
  created_at: string;
}

export interface OnboardingProgress {
  organization_id: string;
  current_step: OnboardingStepKey;
  status: OnboardingProgressStatus;
  completed_at: string | null;
  skipped_attendance: boolean;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStepRecord {
  id: string;
  organization_id: string;
  step_key: OnboardingStepKey;
  status: OnboardingStepStatus;
  evidence_json: string;
  last_checked_at: string | null;
  completed_at: string | null;
  skipped_reason: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStepView {
  step_key: OnboardingStepKey;
  label: string;
  href: string;
  status: OnboardingStepStatus;
  required: boolean;
  blocked: boolean;
  evidence: string[];
  skipped_reason: string | null;
}

export interface ImportJob {
  id: string;
  organization_id: string;
  entity_type: ImportEntityType;
  file_name: string;
  status: ImportJobStatus;
  total_rows: number;
  ready_rows: number;
  error_rows: number;
  imported_rows: number;
  skipped_rows: number;
  previewed_at: string | null;
  confirmed_at: string | null;
  imported_at: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportJobRow {
  id: string;
  job_id: string;
  organization_id: string;
  row_number: number;
  payload_json: string;
  status: ImportRowStatus;
  errors_json: string;
  warnings_json: string;
  imported_entity_id: string | null;
  created_at: string;
}

export interface OpeningBalance {
  id: string;
  organization_id: string;
  employee_id: string;
  kind: "LEAVE" | "LOAN" | "SALARY";
  reference_code: string | null;
  amount: number;
  as_of_date: string;
  notes: string | null;
  import_job_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  organization_id: string;
  ticket_number: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportTicketStatus;
  sla_due_at: string | null;
  sla_breached: boolean;
  created_by: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  organization_id: string;
  author_user_id: string | null;
  visibility: SupportMessageVisibility;
  body: string;
  created_at: string;
}

export interface DataExportJob {
  id: string;
  organization_id: string;
  kind: DataExportKind;
  status: DataExportStatus;
  file_name: string | null;
  content: string | null;
  requested_by: string | null;
  ready_at: string | null;
  expires_at: string | null;
  downloaded_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface OffboardingRequest {
  id: string;
  organization_id: string;
  status: OffboardingStatus;
  reason: string;
  export_job_id: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  requested_by: string | null;
  confirmed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LaunchDecisionRecord {
  id: string;
  decision: LaunchDecision;
  summary: string;
  evidence_json: string;
  decided_by: string | null;
  decided_at: string;
  created_at: string;
  updated_at: string;
}

export interface ModuleReadiness {
  id: string;
  module_key: string;
  label: string;
  status: ModuleReadinessStatus;
  evidence: string;
  notes: string | null;
  sort_order: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReleaseBlocker {
  id: string;
  title: string;
  severity: ReleaseBlockerSeverity;
  status: ReleaseBlockerStatus;
  module_key: string;
  evidence: string;
  required_fix: string;
  organization_id: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PilotOrganization {
  id: string;
  code: string;
  name: string;
  kind: PilotOrgKind;
  status: PilotOrgStatus;
  organization_id: string | null;
  contact_name: string | null;
  notes: string | null;
  signed_off_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PilotChecklistItem {
  id: string;
  pilot_id: string;
  step_key: string;
  label: string;
  required: boolean;
  complete: boolean;
  evidence: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BiometricVerificationRecord {
  id: string;
  vendor: string;
  model: string;
  method: BiometricTestMethod;
  advertised: boolean;
  result: ModuleReadinessStatus;
  notes: string;
  tested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParallelPayrollRun {
  id: string;
  pilot_id: string;
  period_label: string;
  status: ParallelRunStatus;
  expected_net: number | null;
  calculated_net: number | null;
  mismatch_count: number;
  notes: string | null;
  finalized: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UatChecklistItem {
  id: string;
  pilot_id: string;
  role_code: UatRole;
  journey: string;
  status: UatResultStatus;
  tester: string | null;
  evidence: string | null;
  tested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentRecord {
  id: string;
  incident_number: string;
  organization_id: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  impact: string;
  started_at: string;
  ended_at: string | null;
  resolution: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PilotFeedback {
  id: string;
  pilot_id: string;
  organization_id: string | null;
  module_key: string;
  kind: FeedbackKind;
  severity: ReleaseBlockerSeverity;
  status: FeedbackStatus;
  summary: string;
  reproduction: string | null;
  release_version: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReleaseGateRecord {
  id: string;
  gate_key: ReleaseGateKey;
  passing: boolean;
  evidence: string;
  blocker: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}
