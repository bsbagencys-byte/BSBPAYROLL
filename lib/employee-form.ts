import type { EmployeeFormValues } from "@/lib/validations/employee";
import type { EmployeeRecord } from "@/types";

export function recordToFormValues(record?: EmployeeRecord | null): Partial<EmployeeFormValues> {
  if (!record) return { status: "ACTIVE" };
  const { employee, address, employment, statutory, bank } = record;
  return {
    firstName: employee.first_name,
    middleName: employee.middle_name ?? "",
    lastName: employee.last_name,
    displayName: employee.display_name,
    gender: employee.gender ?? "",
    dateOfBirth: employee.date_of_birth ?? "",
    mobile: employee.mobile ?? "",
    alternateMobile: employee.alternate_mobile ?? "",
    personalEmail: employee.personal_email ?? "",
    addressLine1: address?.address_line1 ?? "",
    addressLine2: address?.address_line2 ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    pin: address?.pin ?? "",
    emergencyContactName: employee.emergency_contact_name ?? "",
    emergencyContactNumber: employee.emergency_contact_number ?? "",
    emergencyRelationship: employee.emergency_relationship ?? "",
    employeeCode: employee.employee_code,
    joiningDate: employment?.joining_date ?? "",
    employmentTypeId: employment?.employment_type_id ?? "",
    branchId: employment?.branch_id ?? "",
    departmentId: employment?.department_id ?? "",
    designationId: employment?.designation_id ?? "",
    reportingManagerId: employment?.reporting_manager_id ?? "",
    locationId: employment?.location_id ?? "",
    status: employee.status,
    officialEmail: employment?.official_email ?? "",
    workPhone: employment?.work_phone ?? "",
    pan: statutory?.pan ?? "",
    aadhaarLast4: statutory?.aadhaar_last4 ?? "",
    uan: statutory?.uan ?? "",
    esicNumber: statutory?.esic_number ?? "",
    pfApplicable: statutory?.pf_applicable,
    esiApplicable: statutory?.esi_applicable,
    ptApplicable: statutory?.pt_applicable,
    accountHolderName: bank?.account_holder_name ?? "",
    bankName: bank?.bank_name ?? "",
    accountNumber: bank?.account_number ?? "",
    ifsc: bank?.ifsc ?? "",
    bankBranchName: bank?.branch_name ?? "",
  };
}
